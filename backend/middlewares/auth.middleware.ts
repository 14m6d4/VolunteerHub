import type { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import User from "../models/User.model.ts";

interface JwtPayload {
    id: string;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(createHttpError(401, "Authentication token missing"));
        }

        const token = authHeader.split(" ")[1];

        let decoded: JwtPayload;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        } catch {
            return next(createHttpError(401, "Invalid or expired token"));
        }

        const user = await User.findById(decoded.id).select("+passwordHash");

        if (!user) {
            return next(createHttpError(401, "User no longer exists"));
        }

        // Attach user to request object
        (req as any).user = user;

        return next();
    } catch (err) {
        return next(createHttpError(500, "Authentication failed"));
    }
}
