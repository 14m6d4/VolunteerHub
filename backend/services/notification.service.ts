import { NotificationModel } from "../models/Notification.model.ts";
import { WebPushService } from "./webpush.service.ts";
export const NotificationService = {
    async notify(userId, { title, body, data, type }) {
        await NotificationModel.create({
            userId,
            title,
            body,
            data,
            type
        });

        await WebPushService.sendToUser(userId, {
            title,
            body,
            data
        });
    }
};
