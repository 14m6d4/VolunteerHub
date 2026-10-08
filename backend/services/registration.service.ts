import { and, asc, eq, ne, sql } from "drizzle-orm";
import createHttpError from "http-errors";
import { db } from "../db/client.ts";
import { events, registrationStatus, registrations, users } from "../db/schema.ts";
import { EventStatus } from "../types/event.ts";
import { RegistrationStatus } from "../types/registration.ts";
import { NotificationService } from "./notification.service.ts";
import { NotificationType } from "../types/notification.ts";
import { assertMayManageEvent, getEventRow, toEvent, toRegistration } from "../utils/event.util.ts";
import { isUniqueViolation, isUuid, toLean } from "../utils/user.util.ts";

const getRegistrationRow = async (regId: string) => {
    if (!isUuid(regId)) return undefined;
    const [row] = await db.select().from(registrations).where(eq(registrations.id, regId));
    return row;
};

/** A registration and the event it belongs to, or the 404 for whichever is missing. */
async function getRegistrationWithEvent(regId: string) {
    const reg = await getRegistrationRow(regId);
    if (!reg) throw createHttpError(404, "Registration not found");
    const event = await getEventRow(reg.eventId);
    if (!event) throw createHttpError(404, "Event not found");
    return { reg, event };
}

// Atomic, so two requests can neither double count nor go below zero.
const decrementSeats = sql`greatest(${events.currentMembers} - 1, 0)`;
const incrementSeats = sql`${events.currentMembers} + 1`;

// A registration in these states already holds a seat in current_members.
const HOLDS_SEAT: string[] = [RegistrationStatus.APPROVED, RegistrationStatus.COMPLETED];

export const RegistrationService = {
    async register(eventId: string, volunteerId: string) {
        const event = await getEventRow(eventId);
        if (!event) throw createHttpError(404, "Event not found");
        if (event.status !== EventStatus.APPROVED) throw createHttpError(400, "Event is not open for registration");
        const now = new Date();
        if (event.startAt <= now) throw createHttpError(400, "Event already started or past registration deadline");
        if (event.maxMembers && event.currentMembers >= event.maxMembers) throw createHttpError(400, "Event is full");

        let reg;
        try {
            [reg] = await db.insert(registrations)
                .values({ eventId: event.id, volunteerId, status: RegistrationStatus.PENDING })
                .returning();
        } catch (err) {
            if (isUniqueViolation(err)) throw createHttpError(400, "You already registered for this event");
            throw err;
        }

        const [volunteer] = await db.select({ name: users.name, username: users.username })
            .from(users).where(eq(users.id, volunteerId));
        const volunteerName = volunteer ? (volunteer.name || volunteer.username) : "A volunteer";

        NotificationService.notify(event.managerId, {
            type: NotificationType.REGISTRATION_PENDING,
            title: "New Registration Request",
            body: `${volunteerName} has registered for event "${event.title}"`,
            data: { eventId: event.id, registrationId: reg!.id, url: `/manage-events?manageMembers=${event.id}` }
        });
        return toRegistration(reg!);
    },

    async cancelRegistration(eventId: string, volunteerId: string) {
        const event = await getEventRow(eventId);
        const [reg] = event
            ? await db.select().from(registrations)
                .where(and(eq(registrations.eventId, event.id), eq(registrations.volunteerId, volunteerId)))
            : [];
        if (!reg) throw createHttpError(404, "Registration not found");

        if (new Date() >= event!.startAt) throw createHttpError(400, "Cannot cancel after event start");

        await db.transaction(async (tx) => {
            if (reg.status === RegistrationStatus.APPROVED) {
                await tx.update(events).set({ currentMembers: decrementSeats }).where(eq(events.id, event!.id));
            }
            await tx.delete(registrations).where(eq(registrations.id, reg.id));
        });

        return { message: "Registration cancelled successfully" };
    },

    async approveRegistration(regId: string, managerId: string, managerRole: string) {
        const { reg, event } = await getRegistrationWithEvent(regId);
        assertMayManageEvent(event, managerId, managerRole);

        // Approving someone who already holds a seat must not take a second one.
        if (HOLDS_SEAT.includes(reg.status)) return toRegistration(reg);

        const approved = await db.transaction(async (tx) => {
            // The seat is taken and the limit checked in one statement, so two
            // approvals racing for the last seat cannot both win.
            const [seat] = await tx.update(events)
                .set({ currentMembers: incrementSeats })
                .where(and(
                    eq(events.id, event.id),
                    sql`(${events.maxMembers} is null or ${events.currentMembers} < ${events.maxMembers})`,
                ))
                .returning({ id: events.id });
            if (!seat) throw createHttpError(400, "Event is full");

            const [row] = await tx.update(registrations)
                .set({ status: RegistrationStatus.APPROVED, updatedAt: new Date() })
                .where(eq(registrations.id, reg.id))
                .returning();
            return row!;
        });

        await NotificationService.notify(reg.volunteerId, {
            type: NotificationType.EVENT_JOINED,
            title: "Registration Approved",
            body: `You have join event ${event.title}`,
            data: { eventId: event.id, url: `/events/${event.id}` }
        });
        return toRegistration(approved);
    },

    async rejectRegistration(regId: string, managerId: string, managerRole: string) {
        const { reg, event } = await getRegistrationWithEvent(regId);
        assertMayManageEvent(event, managerId, managerRole);

        await db.transaction(async (tx) => {
            await tx.update(registrations)
                .set({ status: RegistrationStatus.REJECTED, updatedAt: new Date() })
                .where(eq(registrations.id, reg.id));
            // Rejecting an approved member frees the seat they held.
            if (HOLDS_SEAT.includes(reg.status)) {
                await tx.update(events).set({ currentMembers: decrementSeats }).where(eq(events.id, event.id));
            }
        });

        NotificationService.notify(reg.volunteerId, {
            type: NotificationType.EVENT_KICKED,
            title: "Your registration was rejected",
            body: `Your registration for event ${event.title} was rejected`,
            data: { eventId: event.id }
        });
        return { message: "Registration rejected and removed" };
    },

    async markCompleted(regId: string) {
        const reg = await getRegistrationRow(regId);
        if (!reg) throw createHttpError(404, "Registration not found");
        const [row] = await db.update(registrations)
            .set({ status: RegistrationStatus.COMPLETED, completedAt: new Date(), updatedAt: new Date() })
            .where(eq(registrations.id, reg.id))
            .returning();
        return toRegistration(row!);
    },

    async getRegistrationsForEvent(eventId: string, filters: any = {}, includeContactDetails = false) {
        if (!isUuid(eventId)) return [];

        const conditions = [eq(registrations.eventId, eventId)];
        if (filters.status) {
            // Unknown names match nothing, as they did; Postgres would reject them outright.
            const known = (registrationStatus.enumValues as readonly string[]).includes(filters.status);
            conditions.push(known ? eq(registrations.status, filters.status) : sql`false`);
        }

        // Email is only for whoever runs the event. Everyone else sees the
        // public profile fields, so the member list cannot be scraped for
        // addresses by any signed-in user.
        const rows = await db.select({
            registration: registrations,
            volunteer: {
                id: users.id, name: users.name, username: users.username, profilePicture: users.profilePicture,
                ...(includeContactDetails ? { email: users.email } : {}),
            },
        }).from(registrations)
            .innerJoin(users, eq(users.id, registrations.volunteerId))
            .where(and(...conditions))
            .orderBy(asc(registrations.createdAt), asc(registrations.id));

        return rows.map(({ registration, volunteer }) => ({ ...toRegistration(registration), volunteerId: toLean(volunteer) }));
    },

    async getUserRegistrations(userId: string) {
        const rows = await db.select({ registration: registrations, event: events })
            .from(registrations)
            .innerJoin(events, eq(events.id, registrations.eventId))
            .where(and(eq(registrations.volunteerId, userId), ne(registrations.status, RegistrationStatus.REJECTED)))
            .orderBy(asc(registrations.createdAt), asc(registrations.id));

        return rows.map(({ registration, event }) => ({ ...toRegistration(registration), eventId: toEvent(event) }));
    },

    async kickMember(regId: string, actorId: string, actorRole: string) {
        const { reg, event } = await getRegistrationWithEvent(regId);
        assertMayManageEvent(event, actorId, actorRole);

        // Ensure we only kick approved members (or check logic if you want to kick others too)
        if (reg.status !== RegistrationStatus.APPROVED) {
            throw createHttpError(400, "Member is not approved in this event");
        }

        await db.transaction(async (tx) => {
            await tx.update(registrations)
                .set({ status: RegistrationStatus.REJECTED, updatedAt: new Date() })
                .where(eq(registrations.id, reg.id));
            await tx.update(events).set({ currentMembers: decrementSeats }).where(eq(events.id, event.id));
        });

        await NotificationService.notify(reg.volunteerId, {
            type: NotificationType.EVENT_KICKED,
            title: "You have been removed from the event",
            body: `You have been removed from event ${event.title}`,
            data: { eventId: event.id }
        });
        return { message: "Member kicked from event successfully" };
    }
};
