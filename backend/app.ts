import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";
import type { Application } from "express";
import authRoutes from './routes/auth.routes.ts'
import eventRoutes from "./routes/event.routes.ts";
import userRoutes from './routes/user.routes.ts';
import errorHandler from './middlewares/error.middleware.ts';
import passport from "./config/passport.ts";
const FRONTEND_URL = process.env.FRONTEND_URL || "*";

const app: Application = express();

// Middleware
app.use(express.json());
app.use(passport.initialize());

// app.use(
//     cors({
//         origin: (origin, callback) => {
//             if (!origin) return callback(null, true);
//             if (origin === FRONTEND_URL) return callback(null, true);
//             return callback(new Error("Not allowed by CORS"));
//         },
//         credentials: true,
//     })
// );
app.use(cors());

app.use(morgan("dev"));

app.use('/api/auth', authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/users", userRoutes);

// 404 handler for unknown API routes - return JSON
app.use((req, res) => {
	res.status(404).json({ status: 'fail', message: 'Not Found' });
});

// Register centralized error handler (returns JSON)
app.use(errorHandler);

export default app;
