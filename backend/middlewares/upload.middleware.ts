import type { RequestHandler } from "express";
import multer from "multer";
import { MAX_IMAGE_BYTES } from "../services/image.service.ts";
import AppError from "../utils/appError.ts";

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new AppError("Only images are allowed", 400));
    },
    limits: { fileSize: MAX_IMAGE_BYTES },
});

/** One optional image in `field`, held in memory for image.service to re-encode. */
export const uploadImage = (field: string): RequestHandler => (req, res, next) =>
    upload.single(field)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return next(err.code === "LIMIT_FILE_SIZE"
                ? new AppError("Image must be 2 MB or smaller", 413)
                : new AppError(err.message, 400));
        }
        next(err);
    });
