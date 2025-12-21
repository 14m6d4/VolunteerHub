import dotenv from "dotenv";
import app from "./app.ts";
import { connectDB } from "./config/db.ts";
import { EventModel } from "./models/Event.model.ts";

dotenv.config();

const PORT: number = parseInt(process.env.PORT as string, 10) || 5000;
const BACKEND_URL: string = process.env.BACKEND_URL || "";

const startServer = async (): Promise<void> => {
    try {
        await connectDB();

        console.log("Syncing Event indexes...");
        await EventModel.syncIndexes();
        console.log("Event indexes synced.");

        app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT} in ${process.env.NODE_ENV} mode.`);
            console.log(`BACKEND_URL: ${BACKEND_URL}`);
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown server setup error';
        console.error(`FATAL ERROR: Server setup failed. Reason: ${errorMessage}`);
        process.exit(1);
    }
};

startServer();