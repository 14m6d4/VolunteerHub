import type { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import User from "../models/User.model.ts";
import { type IUserDocument } from "../types/user.ts";
import { isBanned, banMessage } from "../utils/ban.util.ts";

interface JwtPayload {
    id: string;
}

export interface AuthenticatedRequest extends Request {
    user: IUserDocument;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(createHttpError(401, "Authentication token missing"));
        }
        const token = authHeader.split(" ")[1]!;

        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!) as unknown as JwtPayload;
        } catch (err: any) {
            console.error("JWT verification failed:", err.name, err.message);
            return next(createHttpError(401, "Invalid or expired token"));
        }

        const user = await User.findById(decoded.id);

        if (!user) {
            return next(createHttpError(401, "User no longer exists"));
        }

        // Checked on every request, not just at login: tokens live for a day, so
        // a ban issued mid-session would otherwise not take effect until the
        // token expired.
        if (isBanned(user)) {
            return next(createHttpError(403, banMessage(user)));
        }

        if (!user.isActive) {
            return next(createHttpError(403, "Account is inactive."));
        }

        (req as any).user = user;
        return next();
    } catch (err) {
        return next(createHttpError(500, "Authentication failed"));
    }
}

export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next();
        }
        const token = authHeader.split(" ")[1]!;
        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!) as unknown as JwtPayload;
        } catch (err: any) {
            console.error("JWT verification failed:", err.name, err.message);
            return next();
        }
        const user = await User.findById(decoded.id);

        // A banned user stays anonymous here rather than being rejected: these
        // routes are public, they just lose the personalised view.
        if (user && !isBanned(user) && user.isActive) {
            (req as any).user = user;
        }
        return next();
    } catch (err) {
        return next();
    }
}
