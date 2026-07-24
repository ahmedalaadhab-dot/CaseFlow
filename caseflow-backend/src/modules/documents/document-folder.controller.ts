import { Request, Response } from "express";
import { z } from "zod";
import { asyncHandler, ok } from "../../common/middleware/errorHandler";
import { documentFolderService } from "./document-folder.service";

const nameSchema = z.object({ name: z.string().min(1).max(100) });

export const documentFolderController = {
  listForCase: asyncHandler(async (req: Request, res: Response) => {
    const folders = await documentFolderService.listForCase(req.params.caseId);
    return ok(res, folders);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { name } = nameSchema.parse(req.body);
    const folder = await documentFolderService.create(req.params.caseId, name);
    return ok(res, folder, undefined, 201);
  }),

  rename: asyncHandler(async (req: Request, res: Response) => {
    const { name } = nameSchema.parse(req.body);
    const folder = await documentFolderService.rename(req.params.id, name);
    return ok(res, folder);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await documentFolderService.remove(req.params.id);
    return ok(res, { message: "Folder deleted" });
  }),
};
