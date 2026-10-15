import { eq } from "drizzle-orm";
import createHttpError from "http-errors";
import { db } from "../db/client.ts";
import { discussions, users } from "../db/schema.ts";
import { UserRole } from "../types/user.ts";
import { getEventRow } from "../utils/event.util.ts";
import { getPostRow } from "../utils/post.util.ts";

export type Actor = { id: string; role: string };

/** What a moderator acts on: an event (as a row or an id), a post, or a comment. */
export type ModerationTarget =
    | { event: { managerId: string } }
    | { eventId: string }
    | { post: { eventId: string | null; discussionId: string | null } }
    | { comment: { postId: string } };

/**
 * The event behind the target: its manager, null when the target belongs to
 * no event, undefined when a lookup finds nothing.
 */
async function eventOf(target: ModerationTarget): Promise<{ managerId: string } | null | undefined> {
    if ("event" in target) return target.event;
    if ("eventId" in target) return getEventRow(target.eventId);
    if ("comment" in target) {
        const post = await getPostRow(target.comment.postId);
        return post && eventOf({ post });
    }
    const { eventId, discussionId } = target.post;
    if (eventId) return getEventRow(eventId);
    if (!discussionId) return null;
    const [discussion] = await db.select({ eventId: discussions.eventId }).from(discussions)
        .where(eq(discussions.id, discussionId));
    return discussion && getEventRow(discussion.eventId);
}

// Role alone is not enough: it proves the caller is *a* manager, never that
// they are *this event's* manager.
const managesEvent = (actor: Actor, event: { managerId: string } | null | undefined) =>
    !!event && actor.role === UserRole.Manager && event.managerId === actor.id;

/**
 * The moderators of an event are its event manager and every admin; a post or
 * comment is moderated by the moderators of its event, and content outside any
 * event by admins only (GLOSSARY.md: Moderator).
 */
export const ModerationService = {
    /** Admins moderate everything; anyone else needs an event they run, so no event or a failed lookup means no. */
    async isModerator(actor: Actor, target: ModerationTarget) {
        if (actor.role === UserRole.Admin) return true;
        return managesEvent(actor, await eventOf(target));
    },

    /** Who moderates the target: its event's manager, if any, and every admin. */
    async moderatorIds(target: ModerationTarget) {
        const [event, admins] = await Promise.all([
            eventOf(target),
            db.select({ id: users.id }).from(users).where(eq(users.role, UserRole.Admin)),
        ]);
        return [...(event ? [event.managerId] : []), ...admins.map((a) => a.id)];
    },

    /** 404 when the target's event does not exist, 403 when the actor is not a moderator. Admins always pass. */
    async assertModerator(actor: Actor, target: ModerationTarget) {
        if (actor.role === UserRole.Admin) return;
        const event = await eventOf(target);
        if (event === undefined) throw createHttpError(404, "Event not found");
        if (!managesEvent(actor, event)) throw createHttpError(403, "You do not manage this event");
    },
};
