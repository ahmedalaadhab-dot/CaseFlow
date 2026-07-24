import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./common/middleware/errorHandler";

import authRoutes from "./modules/auth/auth.routes";
import customerRoutes from "./modules/customers/customer.routes";
import caseRoutes from "./modules/cases/case.routes";
import serviceTemplateRoutes from "./modules/service-templates/service-template.routes";
import documentRoutes from "./modules/documents/document.routes";
import documentFolderRoutes from "./modules/documents/document-folder.routes";
import taskRoutes from "./modules/tasks/task.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import reportsRoutes from "./modules/reports/reports.routes";
import settingsRoutes from "./modules/settings/settings.routes";
import searchRoutes from "./modules/search/search.routes";
import userRoutes from "./modules/users/user.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));

  // App-wide rate limit; auth routes layer a stricter one on top (see auth.routes.ts).
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  // Serve uploaded files in dev. When STORAGE_DRIVER=s3, this line becomes
  // a no-op for new files (they're served via signed S3 URLs instead) and
  // can eventually be removed.
  app.use("/uploads", express.static(path.resolve(env.STORAGE_LOCAL_PATH)));

  app.get("/health", (_req, res) => res.json({ success: true, data: { status: "ok" } }));

  app.use("/api/auth", authRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/cases", caseRoutes);
  app.use("/api/service-templates", serviceTemplateRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/document-folders", documentFolderRoutes);
  app.use("/api/tasks", taskRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/settings", settingsRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/api/users", userRoutes);
  // Further routers (audit log viewer) mount the same way — see README
  // "Extending the API" for the pattern to follow.

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
