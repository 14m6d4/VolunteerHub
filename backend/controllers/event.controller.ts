import type { Request, Response, NextFunction } from "express";
import { EventService } from "../services/event.service.ts";
// import { RegistrationService } from "../services/registration.service";
import createHttpError from "http-errors";
import { Types } from "mongoose";

export const EventController = {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            // managerId from auth middleware
            const managerId = (req.user as any)._id;
            const event = await EventService.createEvent(req.body, managerId);
            return res.status(201).json({ success: true, data: event });
        } catch (err) {
            next(err);
        }
    },

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const eventId = req.params.id;
            // permission check: manager or admin
            const updated = await EventService.updateEvent(eventId, req.body, (req.user as any)?._id);
            return res.json({ success: true, data: updated });
        } catch (err) {
            next(err);
        }
    },

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const event = await EventService.getEventById(req.params.id);
            return res.json({ success: true, data: event });
        } catch (err) {
            next(err);
        }
    },

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const filters = {
                q: req.query.q,
                tag: req.query.tag,
                status: req.query.status,
                startFrom: req.query.startFrom,
                includeDrafts: req.query.includeDrafts === "true"
            };
            const page = Number(req.query.page || 1);
            const limit = Number(req.query.limit || 20);
            const result = await EventService.findEvents(filters, { page, limit });
            return res.json({ success: true, ...result });
        } catch (err) {
            next(err);
        }
    },

    async approve(req: Request, res: Response, next: NextFunction) {
        try {
            const event = await EventService.approveEvent(req.params.id);
            return res.json({ success: true, data: event });
        } catch (err) {
            next(err);
        }
    },

    async cancel(req: Request, res: Response, next: NextFunction) {
        try {
            const event = await EventService.cancelEvent(req.params.id, req.body.reason);
            return res.json({ success: true, data: event });
        } catch (err) {
            next(err);
        }
    },

    async pinPost(req: Request, res: Response, next: NextFunction) {
        try {
            const { eventId } = req.params;
            const { postId } = req.body;
            const userId = (req.user as any)._id;
            const post = await EventService.pinPostOnEvent(eventId, postId, userId);
            return res.json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    },

    async stats(req: Request, res: Response, next: NextFunction) {
        try {
            const stats = await EventService.getEventStats(req.params.id);
            return res.json({ success: true, data: stats });
        } catch (err) {
            next(err);
        }
    }
};
