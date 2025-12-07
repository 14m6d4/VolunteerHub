import type { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { UserRole } from "../types/user.ts";

export function roleMiddleware(allowedRoles: UserRole[] | string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = (req as any).user;
        console.log("Role Middleware - User Role:", user?.role);
        if (!user) {
            return next(createHttpError(401, "Not authenticated"));
        }

        if (!allowedRoles.includes(user.role)) {
            return next(createHttpError(403, "Forbidden: insufficient permissions"));
        }
        next();
    };
}
