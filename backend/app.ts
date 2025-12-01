import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import type { Application } from "express";
import authRoutes from './routes/auth.routes.ts'
import eventRoutes from "./routes/event.routes.ts";
const FRONTEND_URL = process.env.FRONTEND_URL || "*";

const app: Application = express();

// Middleware
app.use(express.json());
app.use(cors());

app.use(morgan("dev"));

app.use('/api/auth', authRoutes);
app.use("/api/events", eventRoutes);

export default app;
