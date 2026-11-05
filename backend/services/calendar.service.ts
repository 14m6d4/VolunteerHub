import { and, asc, eq, gt, isNull, or } from "drizzle-orm";
import createHttpError from "http-errors";
import { db } from "../db/client.ts";
import { events, registrations } from "../db/schema.ts";
import { EventStatus } from "../types/event.ts";
import { RegistrationStatus } from "../types/registration.ts";
import { buildCalendar, icsFilename, type IcsEvent } from "../utils/ics.util.ts";
import { isUuid } from "../utils/user.util.ts";

const frontendUrl = () => (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

/** The event's page in the web app, as calendar entries, emails and notifications link to it. */
export const eventPageUrl = (eventId: string) => `${frontendUrl()}/events/${eventId}`;

/** UID host: the app's host name, so an entry keeps its UID across exports and a re-import updates it. */
const uidDomain = () => {
    try {
        return new URL(frontendUrl()).hostname || "volunteerhub";
    } catch {
        return "volunteerhub";
    }
};

type EventRow = typeof events.$inferSelect;

export const toIcsEvent = (e: EventRow): IcsEvent => ({
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    startAt: e.startAt,
    endAt: e.endAt,
    updatedAt: e.updatedAt,
    url: eventPageUrl(e.id),
    cancelled: e.status === EventStatus.CANCELLED,
});

export const calendarFor = (rows: EventRow[], name?: string) =>
    buildCalendar(rows.map(toIcsEvent), { uidDomain: uidDomain(), ...(name ? { name } : {}) });

export const CalendarService = {
    /**
     * One event, for a volunteer whose registration for it is approved. Anyone
     * else, and an unknown or malformed id, gets the same 404, so the route
     * does not reveal which events exist.
     */
    async eventCalendar(eventId: string, userId: string) {
        const [row] = isUuid(eventId)
            ? await db.select({ event: events }).from(registrations)
                .innerJoin(events, eq(events.id, registrations.eventId))
                .where(and(
                    eq(registrations.eventId, eventId),
                    eq(registrations.volunteerId, userId),
                    eq(registrations.status, RegistrationStatus.APPROVED),
                ))
            : [];
        if (!row) throw createHttpError(404, "Event not found");
        return { filename: icsFilename(row.event.title), body: calendarFor([row.event]) };
    },

    /** Every approved event the volunteer is approved for that has not ended yet, soonest first. */
    async myCalendar(userId: string, now = new Date()) {
        const rows = await db.select({ event: events }).from(registrations)
            .innerJoin(events, eq(events.id, registrations.eventId))
            .where(and(
                eq(registrations.volunteerId, userId),
                eq(registrations.status, RegistrationStatus.APPROVED),
                eq(events.status, EventStatus.APPROVED),
                // An event without an end counts as over once it starts.
                or(gt(events.endAt, now), and(isNull(events.endAt), gt(events.startAt, now))),
            ))
            .orderBy(asc(events.startAt), asc(events.id));
        return { filename: "volunteerhub-events.ics", body: calendarFor(rows.map((r) => r.event), "VolunteerHub") };
    },
};
