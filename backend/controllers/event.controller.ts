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
            const user = req.user as any; // Cast to access role
            let status = req.query.status as string | undefined;

            console.log("List Events - User:", user ? { id: user._id, role: user.role } : "Guest");

            // Default status logic
            if (!status || status === 'all') {
                if (user?.role === 'admin') {
                    // Admin requesting 'all' or default -> show all (no status filter)
                    if (status === 'all') status = undefined;
                    // If no status param provided, maybe default to all? 
                    // Let's stick to: if 'status' param is missing, we might default to 'approved' for guests, but allow 'all' (undefined) for admin.
                    // Actually, let's keep it simple: 
                    // If status is 'all':
                    //   - Admin: status = undefined (all)
                    //   - Access control check: Guest/User/Manager -> 403 if they try 'all' (or maybe just force 'approved'? forcing approved is friendlier)
                    if (status === 'all' && user?.role !== 'admin') {
                        status = 'approved'; // Force non-admins to only see approved when asking for all
                    } else if (status === 'all') {
                        status = undefined; // Remove filter for admin
                    }
                } else {
                    // Non-admin default
                    if (!status) status = 'approved';
                    // If asking for 'all', force 'approved'
                    if (status === 'all') status = 'approved';
                }
            }

            // Pending visibility check
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
