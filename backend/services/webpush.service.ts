
import { PushSubscriptionModel } from "../models/PushSubscription.model.ts";
import webpush from "../config/webpush.ts";

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
