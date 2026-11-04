import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { attachUser } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { globalLimiter } from "./middleware/rateLimit";
import { HttpError } from "./utils/http";
import { asyncHandler } from "./utils/http";
import { pingDatabase } from "./database/client";
import { authRouter } from "./modules/auth/routes";
import { publicRouter } from "./modules/public/routes";
import { adminRouter } from "./modules/admin";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.webOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new HttpError(403, "This origin is not allowed to access the API.", "cors_forbidden"));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Accept"],
    }),
  );

  app.use(express.json({ limit: "200kb" }));
  app.use(cookieParser());
  app.use(attachUser);
  app.use(globalLimiter);

  app.get(
    "/api/health",
    asyncHandler(async (_req, res) => {
      const databaseUp = await pingDatabase();
      res.status(databaseUp ? 200 : 503).json({
        status: databaseUp ? "ok" : "degraded",
        database: databaseUp ? "up" : "down",
        time: new Date().toISOString(),
      });
    }),
  );

  app.use("/api/auth", authRouter);
  app.use("/api/public", publicRouter);
  app.use("/api/admin", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
