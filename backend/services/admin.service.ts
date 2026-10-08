import { and, count, desc, eq, gte, isNull, lt, or, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { db } from '../db/client.ts';
import { events, posts, registrations, reports, users } from '../db/schema.ts';
import { EventStatus } from '../types/event.ts';
import { RegistrationStatus } from '../types/registration.ts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The last 12 calendar months, oldest first, each as [label, first instant, first instant of the next month]. */
function lastTwelveMonths(now: Date) {
    return Array.from({ length: 12 }, (_, k) => {
        const start = new Date(now.getFullYear(), now.getMonth() - (11 - k), 1);
        const next = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        return { month: MONTH_NAMES[start.getMonth()]!, start, next };
    });
}

export async function getAnalytics() {
    const now = new Date();
    const months = lastTwelveMonths(now);

    const inMonth = (column: AnyPgColumn, m: { start: Date; next: Date }) =>
        and(gte(column, m.start), lt(column, m.next));
    const eventsWith = (status: EventStatus) => db.$count(events, eq(events.status, status));

    const [activeVolunteers] = await db.select({ n: sql<number>`count(distinct ${registrations.volunteerId})`.mapWith(Number) })
        .from(registrations)
        .innerJoin(events, eq(events.id, registrations.eventId))
        .where(and(
            eq(events.status, EventStatus.APPROVED),
            or(gte(events.endAt, now), isNull(events.endAt)),
            eq(registrations.status, RegistrationStatus.APPROVED),
        ));

    const [totalUsers, totalEvents, completedEvents, pendingReports, totalPosts, activeEvents, pendingEvents] = await Promise.all([
        db.$count(users),
        db.$count(events),
        eventsWith(EventStatus.FINISHED),
        db.$count(reports, eq(reports.status, 'pending')),
        db.$count(posts),
        eventsWith(EventStatus.APPROVED),
        eventsWith(EventStatus.PENDING),
    ]);

    const userGrowth = await Promise.all(months.map(async (m) => ({
        month: m.month, users: await db.$count(users, inMonth(users.createdAt, m)),
    })));
    const eventsPerMonth = await Promise.all(months.map(async (m) => ({
        month: m.month, events: await db.$count(events, inMonth(events.createdAt, m)),
    })));
    const volunteerParticipation = await Promise.all(months.map(async (m) => ({
        month: m.month,
        volunteers: await db.$count(registrations, and(eq(registrations.status, RegistrationStatus.APPROVED), inMonth(registrations.createdAt, m))),
    })));

    const tag = sql<string>`unnest(${events.tags})`;
    const topTags = db.select({ category: tag.as('category') }).from(events).as('tags');
    const topEventCategories = await db.select({ category: topTags.category, count: count().as('count') })
        .from(topTags)
        .groupBy(topTags.category)
        .orderBy(desc(count()), topTags.category)
        .limit(5);

    const reportsDistribution = await db.select({ type: reports.reason, count: count() })
        .from(reports)
        .groupBy(reports.reason)
        .orderBy(desc(count()), reports.reason);

    return {
        statistics: {
            totalUsers,
            totalEvents,
            activeVolunteers: activeVolunteers?.n ?? 0,
            completedEvents,
            pendingReports,
            totalPosts,
        },
        userGrowth,
        eventsPerMonth,
        eventsByStatus: [
            { name: 'Active', value: activeEvents },
            { name: 'Completed', value: completedEvents },
            { name: 'Pending', value: pendingEvents },
        ],
        volunteerParticipation,
        topEventCategories,
        reportsDistribution,
    };
}
