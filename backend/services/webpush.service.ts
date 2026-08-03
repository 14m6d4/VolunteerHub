
import type { Types } from "mongoose";
import { PushSubscriptionModel } from "../models/PushSubscription.model.ts";
import webpush from "../config/webpush.ts";

export const WebPushService = {
    async sendToUser(userId: string | Types.ObjectId, payload: unknown) {
        const subs = await PushSubscriptionModel.find({ userId });

        await Promise.allSettled(
            subs.map(sub =>
                webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: sub.keys as { p256dh: string; auth: string }
                    },
                    JSON.stringify(payload)
                )
            )
        );
    }
};
