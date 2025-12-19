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
import postRoutes from "./routes/post.routes.ts";
import notificationRoutes from "./routes/notification.routes.ts";
import reportRoutes from "./routes/report.routes.ts"
import fileRoutes from "./routes/file.routes.ts"
import feedRoutes from "./routes/feed.routes.ts";
import commentRoutes from "./routes/comment.routes.ts"
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
    // Allow requests from any origin. We echo the origin so credentials (cookies) can still be used.
    origin: (origin, callback) => {
      // If no origin (e.g., same-origin requests like curl or server-to-server), allow it
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  })
);
// app.options('*', (req, res) => {
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
//   res.sendStatus(204);
// });

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan("dev"));
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/groups", discussionRoutes);
app.use("/api/users", userRoutes);
app.use("/api/register", registrationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use("/api/posts", postRoutes)
app.use("/api/report", reportRoutes)
app.use("/api/feed", feedRoutes)
app.use("/api/comments", commentRoutes)
app.use("/file", fileRoutes)
// 404 handler for unknown API routes - return JSON
app.use((req, res) => {
  res.status(404).json({ status: 'fail', message: 'Not Found' });
});

// Register centralized error handler (returns JSON)
app.use(errorHandler);

export default app;
