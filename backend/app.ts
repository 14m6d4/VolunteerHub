import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import type { Application } from "express";
import authRoutes from './routes/auth.routes.ts'
import eventRoutes from "./routes/event.routes.ts";
import discussionRoutes from "./routes/discussion.routes.ts";
import registrationRoutes from "./routes/registration.routes.ts";
import userRoutes from './routes/user.routes.ts';
import errorHandler from './middlewares/error.middleware.ts';
import passport from "./config/passport.ts";

// Strip trailing slash from FRONTEND_URL to avoid CORS issues
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, '');

const app: Application = express();

// Debug: log the CORS origin being used
console.log('[=== CORS CONFIG ===]');
console.log('[CORS] FRONTEND_URL from env:', process.env.FRONTEND_URL);
console.log('[CORS] Configured to allow origin:', FRONTEND_URL);
console.log('[===================]');

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(morgan("dev"));
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/group", discussionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/register", registrationRoutes);

// 404 handler for unknown API routes - return JSON
app.use((req, res) => {
  res.status(404).json({ status: 'fail', message: 'Not Found' });
});

// Register centralized error handler (returns JSON)
app.use(errorHandler);

export default app;
