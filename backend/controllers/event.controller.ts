import type { Request, Response, NextFunction } from "express";
import { EventService } from "../services/event.service.ts";
import { RegistrationService } from "../services/registration.service";
import createHttpError from "http-errors";
import { Types } from "mongoose";

import fs from "fs";
import { uploadToImgBB } from "../services/imgbb.service.ts";

export const EventController = {
    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const events = await EventService.getAllEvents();
            return res.json({ success: true, data: events });
        } catch (err) {
            next(err);
        }
    },
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            console.log("Creating event with body:", req.body);
            if (req.file) {
                console.log(`[EventController] Processing file from memory`);
                // Upload to ImgBB directly from memory buffer
                const imageUrl = await uploadToImgBB(req.file.buffer, req.file.originalname);
                console.log(`[EventController] ImgBB URL: ${imageUrl}`);

                req.body.image = imageUrl;
            } else {
                console.log("[EventController] No file in request");
            }

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
            if (req.file) {
                // Upload to ImgBB directly from memory buffer
                const imageUrl = await uploadToImgBB(req.file.buffer, req.file.originalname);
                req.body.image = imageUrl;
            }

            // permission check: manager or admin
            const updated = await EventService.updateEvent(eventId, req.body, (req.user as any)?._id);
            return res.json({ success: true, data: updated });
        } catch (err) {
            next(err);
        }
    },

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req.user as any)?._id;

            const data = await EventService.getEventById(
                req.params.id,
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
            const user = req.user; // undefined nếu không login
            const status = req.query.status as string | undefined;
            console.log("List Events - User:", user ? { id: (user as any)._id, role: (user as any).role } : null);
            // Phân quyền status
            if (status === "pending") {
                if (!user) {
                    return res.status(403).json({ success: false, message: "Forbidden" });
                }
                if (user.role === "manager") {
                    // manager chỉ được xem event pending do họ tạo
                    req.query.managerId = user._id;
                } else if (user.role !== "admin") {
                    return res.status(403).json({ success: false, message: "Forbidden" });
                }
            }

            const filters = {
                q: req.query.q as string | undefined,
                tag: req.query.tag as string | undefined,
                status,
                startFrom: req.query.startFrom as string | undefined,
                includeDrafts: req.query.includeDrafts === "true",
                managerId: req.query.managerId as string | undefined,
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
    },
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await EventService.deleteEvent(req.params.id);
            return res.json({ success: true, message: "Event deleted" });
        } catch (err) {
            next(err);
        }
    },

    async getPosts(req: Request, res: Response, next: NextFunction) {
        try {
            const posts = await import("../services/post.service").then(m => m.PostService.getPostsByEvent(req.params.id));
            return res.json({ success: true, data: posts });
        } catch (err) {
            next(err);
        }
    }
};
