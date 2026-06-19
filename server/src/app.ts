import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/error";
import { env } from "./config/env";
import { authRouter } from "./routes/auth";
import { propertiesRouter } from "./routes/properties";

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.CLIENT_URL }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/properties", propertiesRouter);

  app.use(errorHandler);
  return app;
}
