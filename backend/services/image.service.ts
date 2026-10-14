import { randomBytes } from "node:crypto";
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import AppError from "../utils/appError.ts";

/** Uploaded images live here and are served at /uploads (a named volume in prod). */
export const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || "uploads");
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 5 * 1024 ** 3;
const LONG_EDGE = 1600;
// A 2 MB file can still decode to a huge bitmap; 50 MP covers any real photo.
const MAX_INPUT_PIXELS = 50_000_000;
const OUR_URL = /^\/uploads\/([0-9a-f]{32}\.webp)$/;

// ponytail: stats every file on each upload; keep a running total if the folder grows past ~10k files
async function usedBytes() {
    const names = await readdir(UPLOADS_DIR).catch((err) => (err.code === "ENOENT" ? [] : Promise.reject(err)));
    const sizes = await Promise.all(names.map(async (name) => (await stat(path.join(UPLOADS_DIR, name))).size));
    return sizes.reduce((sum, size) => sum + size, 0);
}

/**
 * Re-encodes an uploaded image to WebP (long edge at most 1600 px, metadata
 * stripped) under a random name and returns the URL the DB stores.
 */
export async function saveImage(input: Buffer, maxTotalBytes = MAX_TOTAL_BYTES): Promise<string> {
    if (await usedBytes() >= maxTotalBytes) {
        throw new AppError("Image storage is full, please try again later", 507);
    }

    let webp: Buffer;
    try {
        // rotate() bakes the EXIF orientation in before the metadata is dropped.
        webp = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
            .rotate()
            .resize(LONG_EDGE, LONG_EDGE, { fit: "inside", withoutEnlargement: true })
            .webp()
            .toBuffer();
    } catch (err) {
        console.warn(`[image] Rejected upload: ${(err as Error).message}`);
        throw new AppError("The file is not a supported image", 400);
    }

    const name = `${randomBytes(16).toString("hex")}.webp`;
    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(UPLOADS_DIR, name), webp);
    return `/uploads/${name}`;
}

/**
 * Deletes the files behind these URLs. Anything that is not one of our upload
 * URLs (empty, external, a path trick) is skipped; failures are logged, never
 * thrown, since the row they belonged to is already gone.
 *
 * Safe only while saveImage is the one writer of /uploads/<hex>.webp paths into
 * the DB: the validators reject a relative profilePicture and strip `image` from
 * event bodies, so a client cannot point its row at someone else's file. The demo
 * seed writes shared /uploads/demo-*.webp covers, which never match and so stay.
 */
export async function deleteImages(...urls: (string | null | undefined)[]) {
    await Promise.all(urls.map(async (url) => {
        const name = url?.match(OUR_URL)?.[1];
        if (!name) return;
        try {
            await unlink(path.join(UPLOADS_DIR, name));
        } catch (err) {
            const { code, message, stack } = err as NodeJS.ErrnoException;
            if (code !== "ENOENT") console.error(`[image] Failed to delete ${url}: ${message}`, stack);
        }
    }));
}
