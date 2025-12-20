import type { Request, Response, NextFunction } from "express";
import { RegistrationService } from "../services/registration.service.ts";

export const RegistrationController = {
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const eventId = req.params.eventId as string;
            const volunteerId = (req.user as any)._id;
            const reg = await RegistrationService.register(eventId, volunteerId);
            return res.status(201).json({ success: true, data: reg });
        } catch (err) {
            next(err);
        }
    },

    async cancel(req: Request, res: Response, next: NextFunction) {
        try {
            const event = await RegistrationService.cancelRegistration(
                req.params.eventId as string,          // eventId
                (req.user as any)._id   // volunteerId
            );
            return res.json({ success: true, ...event }); // trước đây là dữ liệu reg, bây giờ là { message: ... }
        } catch (err) {
            next(err);
        }
    },


    async approve(req: Request, res: Response, next: NextFunction) {
        try {
            const regId = req.params.regId as string;
            const managerId = (req.user as any)._id;
            const reg = await RegistrationService.approveRegistration(regId, managerId);
            return res.json({ success: true, data: reg });
        } catch (err) {
            next(err);
        }
    },

    async reject(req: Request, res: Response, next: NextFunction) {
        try {
            const regId = req.params.regId as string;
            const managerId = (req.user as any)._id;
            const result = await RegistrationService.rejectRegistration(regId, managerId);
            return res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    },

    async markCompleted(req: Request, res: Response, next: NextFunction) {
        try {
            const regId = req.params.regId as string;
            const reg = await RegistrationService.markCompleted(regId);
            return res.json({ success: true, data: reg });
        } catch (err) {
            next(err);
        }
    },

    async listForEvent(req: Request, res: Response, next: NextFunction) {
        try {
            const eventId = req.params.eventId as string;
            const user = req.user as any;

            // If user is not manager/admin, they can only see approved members
            if (user.role !== 'manager' && user.role !== 'admin') {
                req.query.status = 'approved';
            }

            const items = await RegistrationService.getRegistrationsForEvent(eventId, req.query);
            return res.json({ success: true, data: items });
        } catch (err) {
            next(err);
        }
    },

    async myRegistrations(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req.user as any)._id;
            const items = await RegistrationService.getUserRegistrations(userId);
            // console.log(items);
            return res.json({ success: true, data: items });
        } catch (err) {
            next(err);
        }
    },

    async kickFromEvent(req: Request, res: Response, next: NextFunction) {
        try {
            const regId = req.params.regId as string;
            const result = await RegistrationService.kickMember(regId);
            return res.json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    },
};
