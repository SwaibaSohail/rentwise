import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/error";
import { env } from "./config/env";
import { authRouter } from "./routes/auth";
import { propertiesRouter } from "./routes/properties";
import { tenanciesRouter } from "./routes/tenancies";
import { ticketsRouter } from "./routes/tickets";
import { statsRouter } from "./routes/stats";
import { applicationsRouter } from "./routes/applications";
import { chatRouter } from "./routes/chat";
import { paymentsRouter } from "./routes/payments";
import { uploadsRouter } from "./routes/uploads";

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.CLIENT_URL }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/properties", propertiesRouter);
  app.use("/api/tenancies", tenanciesRouter);
  app.use("/api/tickets", ticketsRouter);
  app.use("/api/stats", statsRouter);
  app.use("/api/applications", applicationsRouter);
  app.use("/api/conversations", chatRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/uploads", uploadsRouter);

  app.use(errorHandler);
  return app;
}
