import { eq } from "drizzle-orm";
import { db } from "../db/client.ts";
import { pushSubscriptions } from "../db/schema.ts";
import webpush from "../config/webpush.ts";
import { isUuid } from "../utils/user.util.ts";

export const WebPushService = {
    async sendToUser(userId: string, payload: unknown) {
        // A malformed id has no subscriptions.
        if (!isUuid(userId)) return;

        const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));

        await Promise.allSettled(
            subs.map(sub =>
                webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh ?? "", auth: sub.auth ?? "" }
                    },
                    JSON.stringify(payload)
                )
            )
        );
    }
};
