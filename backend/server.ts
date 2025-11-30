import dotenv from "dotenv";
dotenv.config();

import app from "./app.ts";

const PORT = process.env.PORT || 5000;
const BACKEND_URL = process.env.BACKEND_URL || "";

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`BACKEND_URL: ${BACKEND_URL}`);
    try {
        console.log("Registered routes:");

        app._router.stack.forEach((middleware: any) => {
            if (middleware.route) {
                const methods = Object.keys(middleware.route.methods).join(",");
                console.log(`${methods.toUpperCase()} ${middleware.route.path}`);
            } else if (middleware.name === "router") {
                const handlers = middleware.handle?.stack;

                if (Array.isArray(handlers)) {
                    handlers.forEach((handler: any) => {
                        if (handler.route) {
                            const methods = Object.keys(handler.route.methods).join(",");
                            console.log(`${methods.toUpperCase()} ${handler.route.path}`);
                        }
                    });
                }
            }
        });
    } catch (e) {
        console.error("Failed to list routes on startup", e);
    }
});
