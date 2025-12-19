import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { getGFS } from "../utils/gridfs.ts";

export const FileController = {
    async getFile(req: Request, res: Response, next: NextFunction) {
        try {
            const gfs = getGFS();
            const fileId = req.params.id;

            if (!mongoose.Types.ObjectId.isValid(fileId)) {
                return res.status(400).json({ status: "fail", message: "Invalid file ID" });
            }

            const _id = new mongoose.Types.ObjectId(fileId);

            const files = await gfs.find({ _id }).toArray();
            if (!files || files.length === 0) {
                return res.status(404).json({ status: "fail", message: "File not found" });
            }

            const file: any = files[0];
            if (file.contentType) {
                res.set('Content-Type', file.contentType);
            }

            const downloadStream = gfs.openDownloadStream(_id);
            downloadStream.pipe(res);

            downloadStream.on('error', (err) => {
                console.error("Stream error", err);
                res.status(500).end();
            });

        } catch (error) {
            next(error);
        }
    }
};
