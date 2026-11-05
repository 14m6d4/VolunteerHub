import { and, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import { db } from "../db/client.ts";
import { events, registrations, users } from "../db/schema.ts";
import { EventStatus } from "../types/event.ts";
import { NotificationType } from "../types/notification.ts";
import { RegistrationStatus } from "../types/registration.ts";
import { icsFilename } from "../utils/ics.util.ts";
import { calendarFor, eventPageUrl } from "./calendar.service.ts";
import { sendEventReminderEmail, type EventReminderEmail } from "./email.service.ts";
import { notify } from "./notification.service.ts";

/** How long before the start a volunteer is reminded. */
export const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;

export type ReminderEmailSender = (mail: EventReminderEmail) => Promise<void>;

export interface ReminderRun {
    /** Registrations this run claimed, and so reminded. */
    registrationIds: string[];
    emailed: number;
    failed: number;
}

/**
 * Emails speak in one time zone, since users have none on file. Defaults to
 * Vietnam's; an unknown REMINDER_TIMEZONE falls back to UTC.
 */
export function formatStart(date: Date, timeZone = process.env.REMINDER_TIMEZONE || "Asia/Ho_Chi_Minh") {
    const format = (tz: string) => new Intl.DateTimeFormat("en-GB", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short", timeZone: tz,
    }).format(date);
    try {
        return `on ${format(timeZone)}`;
    } catch {
        return `on ${format("UTC")}`;
    }
}

/**
 * Claims every approved registration for an approved event that starts within
 * REMINDER_LEAD_MS of `now` and has not been reminded, by setting its
 * reminder_sent_at. One UPDATE does the claiming, and Postgres re-checks
 * `reminder_sent_at is null` on a row another run updated meanwhile, so two
 * runs (a restart, a second instance) can never claim the same registration.
 * Volunteers who turned notifications off are skipped and stay unclaimed.
 */
async function claimDue(now: Date) {
    const due = db.select({ id: registrations.id }).from(registrations)
        .innerJoin(events, eq(events.id, registrations.eventId))
        .innerJoin(users, eq(users.id, registrations.volunteerId))
        .where(and(
            eq(registrations.status, RegistrationStatus.APPROVED),
            isNull(registrations.reminderSentAt),
            eq(events.status, EventStatus.APPROVED),
            gt(events.startAt, now),
            lte(events.startAt, new Date(now.getTime() + REMINDER_LEAD_MS)),
            eq(users.notificationsEnabled, true),
        ));
    const claimed = await db.update(registrations)
        .set({ reminderSentAt: now })
        .where(and(
            inArray(registrations.id, due),
            eq(registrations.status, RegistrationStatus.APPROVED),
            isNull(registrations.reminderSentAt),
        ))
        .returning({ id: registrations.id });
    return claimed.map((r) => r.id);
}

/**
 * One reminder pass: claim, then send each claimed volunteer an email and an
 * in-app notification. A reminder is sent at most once: the claim is written
 * before the email goes out, so a failed email (logged and counted) or a crash
 * between the two is not retried. The `reminders` compose service runs this
 * every 15 minutes (scripts/send-reminders.ts).
 */
export async function sendDueReminders(
    { now = new Date(), sendEmail = sendEventReminderEmail }: { now?: Date; sendEmail?: ReminderEmailSender } = {},
): Promise<ReminderRun> {
    const registrationIds = await claimDue(now);
    if (!registrationIds.length) return { registrationIds, emailed: 0, failed: 0 };

    const rows = await db.select({
        registrationId: registrations.id,
        event: events,
        volunteer: { id: users.id, email: users.email, name: users.name, username: users.username },
    }).from(registrations)
        .innerJoin(events, eq(events.id, registrations.eventId))
        .innerJoin(users, eq(users.id, registrations.volunteerId))
        .where(inArray(registrations.id, registrationIds));

    const byEvent = new Map<string, { event: typeof events.$inferSelect; volunteerIds: string[] }>();
    for (const { event, volunteer } of rows) {
        const entry = byEvent.get(event.id) ?? { event, volunteerIds: [] };
        entry.volunteerIds.push(volunteer.id);
        byEvent.set(event.id, entry);
    }
    for (const { event, volunteerIds } of byEvent.values()) {
        await notify({ userIds: volunteerIds }, NotificationType.EVENT_REMINDER, {
            eventId: event.id, eventTitle: event.title, startAt: event.startAt.toISOString(), url: `/events/${event.id}`,
        });
    }

    let emailed = 0;
    let failed = 0;
    for (const { registrationId, event, volunteer } of rows) {
        try {
            await sendEmail({
                to: volunteer.email,
                greeting: volunteer.name || volunteer.username,
                eventTitle: event.title,
                when: formatStart(event.startAt),
                location: event.location,
                url: eventPageUrl(event.id),
                ics: calendarFor([event]),
                icsFilename: icsFilename(event.title),
            });
            emailed++;
        } catch (err) {
            failed++;
            console.error(`[reminders] email for registration ${registrationId} failed: ${(err as Error).message}`);
        }
    }
    return { registrationIds, emailed, failed };
}
