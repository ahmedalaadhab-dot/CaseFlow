import { Request, Response } from "express";
import multer from "multer";
import { asyncHandler, ok } from "../../common/middleware/errorHandler";
import { documentService } from "./document.service";
import { ValidationError, UnauthorizedError } from "../../common/errors/AppError";
import { env } from "../../config/env";
import { z } from "zod";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
});

const categorySchema = z.enum([
  "PASSPORT", "CPR", "PHOTOS", "MEDICAL", "CONTRACTS", "INVOICES", "GOVERNMENT_FORMS", "OTHER",
]);

export const documentController = {
  listForCase: asyncHandler(async (req: Request, res: Response) => {
    const docs = await documentService.listForCase(req.params.caseId);
    return ok(res, docs);
  }),

  upload: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    if (!req.file) throw new ValidationError(undefined, "No file provided");

    const category = categorySchema.parse(req.body.category);

    const created = await documentService.upload({
      caseId: req.params.caseId,
      category,
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      uploadedByUserId: req.user.id,
    });

    return ok(res, created, undefined, 201);
  }),

  rename: asyncHandler(async (req: Request, res: Response) => {
    const { fileName } = z.object({ fileName: z.string().min(1) }).parse(req.body);
    const updated = await documentService.rename(req.params.id, fileName);
    return ok(res, updated);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    await documentService.remove(req.params.id, req.user.id);
    return ok(res, { message: "Document deleted" });
  }),
};
