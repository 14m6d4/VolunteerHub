import type { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { findUserById } from "../services/user.service.ts";
import { type IUserDocument } from "../types/user.ts";
import { isBanned, banMessage } from "../utils/ban.util.ts";
import { tokenVersionMatches, verifyToken } from "../utils/jwt.util.ts";
import { type ITokenPayload } from "../types/user.ts";

type JwtPayload = ITokenPayload;

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
            decoded = verifyToken(token);
        } catch (err: any) {
            console.error("JWT verification failed:", err.name, err.message);
            return next(createHttpError(401, "Invalid or expired token"));
        }

        const user = await findUserById(decoded.id);

        if (!user) {
            return next(createHttpError(401, "User no longer exists"));
        }

        // A password change, reset or ban bumps token_version and so revokes
        // every token signed before it.
        if (!tokenVersionMatches(decoded, user)) {
            return next(createHttpError(401, "Invalid or expired token"));
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
    } catch {
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
            decoded = verifyToken(token);
        } catch (err: any) {
            console.error("JWT verification failed:", err.name, err.message);
            return next();
        }
        const user = await findUserById(decoded.id);

        // A banned user stays anonymous here rather than being rejected: these
        // routes are public, they just lose the personalised view.
        if (user && tokenVersionMatches(decoded, user) && !isBanned(user) && user.isActive) {
            (req as any).user = user;
        }
        return next();
    } catch {
        return next();
    }
}
