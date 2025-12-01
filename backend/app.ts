import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import type { Application } from "express";
import authRoutes from './routes/auth.routes.ts'
const FRONTEND_URL = process.env.FRONTEND_URL || "*";

const app: Application = express();

// Middleware
app.use(express.json());

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (origin === FRONTEND_URL) return callback(null, true);
            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);

app.use((req, res, next) => {
    console.log(`>> ${req.method} ${req.originalUrl}`);
    next();
});

app.use('/api/auth', authRoutes);

export default app;
