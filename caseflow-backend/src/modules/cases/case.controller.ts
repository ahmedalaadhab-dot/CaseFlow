import { Request, Response } from "express";
import { asyncHandler, ok } from "../../common/middleware/errorHandler";
import { caseService } from "./case.service";
import {
  createCaseSchema,
  updateCaseSchema,
  caseQuerySchema,
  advanceStageSchema,
  toggleChecklistItemSchema,
} from "./case.dto";
import { UnauthorizedError } from "../../common/errors/AppError";

function requireUser(req: Request) {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export const caseController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = caseQuerySchema.parse(req.query);
    const { items, meta } = await caseService.list(query);
    return ok(res, items, meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const found = await caseService.getById(req.params.id);
    return ok(res, found);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const dto = createCaseSchema.parse(req.body);
    const created = await caseService.create(dto, user.id);
    return ok(res, created, undefined, 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const dto = updateCaseSchema.parse(req.body);
    const updated = await caseService.update(req.params.id, dto, user.id);
    return ok(res, updated);
  }),

  advanceStage: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const dto = advanceStageSchema.parse(req.body);
    const updated = await caseService.advanceStage(req.params.id, dto.targetCaseStageId, user.id);
    return ok(res, updated);
  }),

  toggleChecklistItem: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const dto = toggleChecklistItemSchema.parse(req.body);
    const updated = await caseService.toggleChecklistItem(req.params.id, req.params.itemId, dto.isCompleted, user.id);
    return ok(res, updated);
  }),

  archive: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const updated = await caseService.archive(req.params.id, user.id);
    return ok(res, updated);
  }),

  restore: asyncHandler(async (req: Request, res: Response) => {
    const user = requireUser(req);
    const updated = await caseService.restore(req.params.id, user.id, user.role);
    return ok(res, updated);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await caseService.remove(req.params.id);
    return ok(res, { message: "Case deleted" });
  }),
};
