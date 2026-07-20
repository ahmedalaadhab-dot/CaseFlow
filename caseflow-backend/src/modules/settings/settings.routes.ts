import { z } from "zod";
import { Router, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { asyncHandler, ok } from "../../common/middleware/errorHandler";
import { requireAuth, requireRole } from "../../common/middleware/auth";

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
};

const upsertSchema = z.object({ key: z.string().min(1), value: z.unknown() });

const settingsController = {
  getAll: asyncHandler(async (_req: Request, res: Response) => ok(res, await settingsService.getAll())),
  upsert: asyncHandler(async (req: Request, res: Response) => {
    const dto = upsertSchema.parse(req.body);
    const updated = await settingsService.upsert(dto.key, dto.value);
    return ok(res, updated);
  }),
};

const router = Router();
router.use(requireAuth);

router.get("/", settingsController.getAll);
// Settings are office-wide config; restrict writes to Manager/Owner.
router.put("/", requireRole("MANAGER"), settingsController.upsert);

export default router;
