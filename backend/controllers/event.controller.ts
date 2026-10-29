import type { Request, Response, NextFunction } from "express";
import { EventService } from "../services/event.service.ts";
import { RegistrationService } from "../services/registration.service.ts";
import createHttpError from "http-errors";

export const EventController = {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const managerId = (req.user as any)._id;
            const event = await EventService.createEvent(req.body, managerId, req.file?.buffer);
            return res.status(201).json({ success: true, data: event });
        } catch (err) {
            next(err);
        }
    },

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user as any;
            const updated = await EventService.updateEvent(req.params.id as string, req.body, user._id, user.role, req.file?.buffer);
            return res.json({ success: true, data: updated });
        } catch (err) {
            next(err);
        }
    },

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req.user as any)?._id;

            const data = await EventService.getEventById(
                req.params.id as string,
                userId
            );

            return res.json({
                success: true,
                data
            });
        } catch (err) {
            next(err);
        }
    },


    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const user = req.user as any;
            const status = req.query.status as string | undefined;
            const managerId = req.query.managerId as string | undefined;
            console.log("List Events - User:", user ? { id: user._id, role: user.role } : null);

            const filters = {
                q: req.query.q as string | undefined,
                tag: req.query.tag as string | undefined,
                status: status === 'all' ? undefined : status, // Don't filter if status is 'all'
                startFrom: req.query.startFrom as string | undefined,
                includeDrafts: req.query.includeDrafts === "true",
                managerId,
                viewer: user ? { id: user._id, role: user.role } : undefined,
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
            const event = await EventService.approveEvent(req.params.id as string, (req.user as any)._id);
            return res.json({ success: true, data: event });
        } catch (err) {
            next(err);
        }
    },

    async pinPost(req: Request, res: Response, next: NextFunction) {
        try {
            const eventId = req.params.eventId as string;
            const { postId } = req.body;
            const userId = (req.user as any)._id;
            const post = await EventService.pinPostOnEvent(eventId, postId, userId, (req.user as any).role);
            return res.json({ success: true, data: post });
        } catch (err) {
            next(err);
        }
    },

    async stats(req: Request, res: Response, next: NextFunction) {
        try {
            const stats = await EventService.getEventStats(req.params.id as string, (req.user as any)._id, (req.user as any).role);
            return res.json({ success: true, data: stats });
        } catch (err) {
            next(err);
        }
    },
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await EventService.deleteEvent(req.params.id as string, (req.user as any)._id, (req.user as any).role, (req.user as any).email);
            return res.json({ success: true, message: "Event deleted" });
        } catch (err) {
            next(err);
        }
    },

    async getPosts(req: Request, res: Response, next: NextFunction) {
        try {
            const posts = await import("../services/post.service.ts").then(m => m.PostService.getPostsByEvent(req.params.id as string));
            return res.json({ success: true, data: posts });
        } catch (err) {
            next(err);
        }
    },
    async complete(req: Request, res: Response, next: NextFunction) {
        try {
            const event = await EventService.completeEvent(req.params.id as string, (req.user as any)._id, (req.user as any).role);
            return res.json({ success: true, data: event });
        } catch (err) {
            next(err);
        }
    }
};
