import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { ReportService } from "../services/report.service.ts";

const actorOf = (req: Request) => {
    const { _id, role } = (req as AuthenticatedRequest).user;
    return { id: String(_id), role };
};

// Report endpoints have always answered with bare reports and arrays, no envelope.
export const ReportController = {
    async reportEvent(req: Request, res: Response, next: NextFunction) {
        try {
            const { eventId, reason, description } = req.body;
            res.status(201).json(await ReportService.reportEvent(actorOf(req).id, eventId, reason, description));
        } catch (err) {
            next(err);
        }
    },

    async reportUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { targetId, reason, description } = req.body;
            res.status(201).json(await ReportService.reportUser(actorOf(req).id, targetId, reason, description));
        } catch (err) {
            next(err);
        }
    },

    async reportPost(req: Request, res: Response, next: NextFunction) {
        try {
            const { postId, reason, description } = req.body;
            res.status(201).json(await ReportService.reportPost(actorOf(req).id, postId, reason, description));
        } catch (err) {
            next(err);
        }
    },

    async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { status, type } = req.query;
            res.json(await ReportService.listForActor(actorOf(req), {
                ...(typeof status === "string" ? { status } : {}),
                ...(typeof type === "string" ? { type } : {}),
            }));
        } catch (err) {
            next(err);
        }
    },

    async listForEvent(req: Request, res: Response, next: NextFunction) {
        try {
            res.json(await ReportService.listForEvent(actorOf(req), req.params.eventId as string));
        } catch (err) {
            next(err);
        }
    },

    async listForTarget(req: Request, res: Response, next: NextFunction) {
        try {
            res.json(await ReportService.listForTarget(req.params.targetType as string, req.params.targetId as string));
        } catch (err) {
            next(err);
        }
    },

    async setStatus(req: Request, res: Response, next: NextFunction) {
        try {
            res.json(await ReportService.setStatus(actorOf(req), req.params.reportId as string, req.body?.status));
        } catch (err) {
            next(err);
        }
    },
};
