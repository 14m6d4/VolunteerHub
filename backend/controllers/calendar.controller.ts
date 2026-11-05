import type { Request, Response, NextFunction } from "express";
import { CalendarService } from "../services/calendar.service.ts";

/** Answers an .ics download: a calendar file, not the JSON envelope, and never cached by a proxy. */
const sendCalendar = (res: Response, { filename, body }: { filename: string; body: string }) => {
    res.set({
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
    });
    return res.send(body);
};

export const CalendarController = {
    async event(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req.user as any)._id;
            return sendCalendar(res, await CalendarService.eventCalendar(req.params.id as string, userId));
        } catch (err) {
            next(err);
        }
    },

    async mine(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = (req.user as any)._id;
            return sendCalendar(res, await CalendarService.myCalendar(userId));
        } catch (err) {
            next(err);
        }
    },
};
