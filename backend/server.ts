import dotenv from "dotenv";
import app from "./app.ts"; // Import Express app 
import { connectDB } from "./config/db.ts"; // Import the DB connection function
import { EventModel } from "./models/Event.model.ts";

dotenv.config();

// Use PORT from env, default to 5000
const PORT: number = parseInt(process.env.PORT as string, 10) || 5000;
const BACKEND_URL: string = process.env.BACKEND_URL || "";

/**
 * @function startServer
 * @description Connects DB and starts server.
 */
const startServer = async (): Promise<void> => {
    try {
        // 1. Connect MongoDB
        await connectDB();

        // 2. Sync Indexes to ensure schema matches DB (fixes 'tags' text index issue)
        console.log("Syncing Event indexes...");
        await EventModel.syncIndexes();
        console.log("Event indexes synced.");

        // 3. Start Express server after successful DB connection
        app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT} in ${process.env.NODE_ENV} mode.`);
            console.log(`BACKEND_URL: ${BACKEND_URL}`);
        });

    } catch (error) {
        // Handle fatal errors, log, and exit
        const errorMessage = error instanceof Error ? error.message : 'Unknown server setup error';
        console.error(`FATAL ERROR: Server setup failed. Reason: ${errorMessage}`);
        process.exit(1);
    }
};

startServer();