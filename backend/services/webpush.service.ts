import webpush from "web-push";
import { PushSubscriptionModel } from "../models/PushSubscription.model.ts";

webpush.setVapidDetails(
    "mailto:admin@yourdomain.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export const WebPushService = {
    async sendToUser(userId, payload) {
        const subs = await PushSubscriptionModel.find({ userId });

        await Promise.allSettled(
            subs.map(sub =>
                webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: sub.keys
                    },
                    JSON.stringify(payload)
                )
            )
        );
    }
};
