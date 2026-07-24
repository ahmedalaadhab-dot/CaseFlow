import { z } from "zod";
import multer from "multer";
import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler, ok } from "../../common/middleware/errorHandler";
import { requireAuth, requireRole } from "../../common/middleware/auth";
import { storage } from "../../common/storage";
import { env } from "../../config/env";
import { ValidationError } from "../../common/errors/AppError";

// Settings are stored as flexible key/value JSON rows so new settings
// panels can be added without a migration. Known keys used by the
// frontend: "office_info", "theme", "working_hours", "custom_priorities",
// "custom_statuses", "backup".
const settingsService = {
  async getAll() {
    const rows = await prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },

  async upsert(key: string, value: unknown) {
    return prisma.setting.upsert({
      where: { key },
      update: { value: value as any },
      create: { key, value: value as any },
    });
  },

  async uploadLogo(buffer: Buffer, originalName: string) {
    const storageKey = await storage.save({ buffer, originalName, folder: "office" });
    const url = await storage.getUrl(storageKey);
    const current = await prisma.setting.findUnique({ where: { key: "office_info" } });
    const officeInfo = (current?.value as Record<string, unknown>) ?? {};
    const updated = await this.upsert("office_info", { ...officeInfo, logoUrl: url });
    return updated;
  },
};

const upsertSchema = z.object({ key: z.string().min(1), value: z.unknown() });

const ACCEPTED_LOGO_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
});

const settingsController = {
  getAll: asyncHandler(async (_req: Request, res: Response) => ok(res, await settingsService.getAll())),
  upsert: asyncHandler(async (req: Request, res: Response) => {
    const dto = upsertSchema.parse(req.body);
    const updated = await settingsService.upsert(dto.key, dto.value);
    return ok(res, updated);
  }),
  uploadLogo: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new ValidationError(undefined, "No file provided");
    if (!ACCEPTED_LOGO_MIME_TYPES.has(req.file.mimetype)) {
      throw new ValidationError({ mimeType: req.file.mimetype }, "Unsupported file type. Accepted: PNG, JPG, WEBP, SVG");
    }
    const updated = await settingsService.uploadLogo(req.file.buffer, req.file.originalname);
    return ok(res, updated);
  }),
};

const router = Router();
router.use(requireAuth);

router.get("/", settingsController.getAll);
// Settings are office-wide config; restrict writes to Manager/Owner.
router.put("/", requireRole("MANAGER"), settingsController.upsert);
router.post("/logo", requireRole("MANAGER"), logoUpload.single("file"), settingsController.uploadLogo);

export default router;
