import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { sql } from "drizzle-orm";
import type { Application } from "express";
import { db } from "./db/client.ts";
import authRoutes from './routes/auth.routes.ts'
import eventRoutes from "./routes/event.routes.ts";
import discussionRoutes from "./routes/discussion.routes.ts";
import registrationRoutes from "./routes/registration.routes.ts";
import userRoutes from './routes/user.routes.ts';
import errorHandler from './middlewares/error.middleware.ts';
import { requestLogger, httpMetrics, metricsHandler } from './middlewares/observability.middleware.ts';
import passport from "./config/passport.ts";
import postRoutes from "./routes/post.routes.ts";
import notificationRoutes from "./routes/notification.routes.ts";
import reportRoutes from "./routes/report.routes.ts"
import feedRoutes from "./routes/feed.routes.ts";
import commentRoutes from "./routes/comment.routes.ts"
import adminRoutes from "./routes/admin.routes.ts"
// Strip trailing slash from FRONTEND_URL to avoid CORS issues
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, '');

const app: Application = express();

// Trust only the proxies we run. In production that is Traefik alone (1);
// Cloudflare is deliberately not counted, because it appends to
// X-Forwarded-For rather than replacing it, so trusting a further hop would
// trust a value the client chose. Rate limiting identifies callers by
// CF-Connecting-IP instead - see middlewares/rateLimit.middleware.ts.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 0));

// First, so every request - including ones rejected by CORS or the body
// parser - gets a request ID, a log line and a metrics sample (a health 503
// is the 5xx the alert must see). Health and scrapes are kept out of the log
// only; /metrics is registered ahead of httpMetrics so scrapes aren't counted.
app.use(requestLogger);
app.get('/metrics', metricsHandler);
app.use(httpMetrics);

app.use(helmet({
    // The API serves JSON and redirects only; the SPA is served by nginx, which
    // sets its own headers. CSP here would apply to neither.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// The browser app is served from the same origin in production, so CORS only
// needs to cover the development server. Reflecting every origin was unsafe
// alongside credentials: true.
const allowedOrigins = new Set([FRONTEND_URL, 'http://localhost:5173']);

app.use(
    cors({
        origin: (origin, callback) => {
            // Same-origin and server-to-server requests send no Origin header.
            if (!origin || allowedOrigins.has(origin)) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    })
);

// 50mb on every route was a free memory-exhaustion DoS. Uploads go through
// multer's 5mb limit instead; the one exception is the avatar route, which
// takes a base64 data URL in the JSON body (~4/3 the file size, so 8mb covers
// the 5mb the frontend enforces).
app.use('/api/users/profile/secure', express.json({ limit: '8mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

app.get('/api/health', async (req, res) => {
    try {
        await db.execute(sql`select 1`);
        res.json({ status: 'ok' });
    } catch {
        res.status(503).json({ status: 'error', message: 'database unreachable' });
    }
});

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
app.use("/api/admin", adminRoutes)
app.use("/uploads", express.static("uploads"));

// 404 handler for unknown API routes - return JSON
app.use((req, res) => {
    res.status(404).json({ status: 'fail', message: 'Not Found' });
});

// Register centralized error handler (returns JSON)
app.use(errorHandler);

export default app;
