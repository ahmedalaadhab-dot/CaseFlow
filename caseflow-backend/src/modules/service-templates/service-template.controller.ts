import { Request, Response } from "express";
import { asyncHandler, ok } from "../../common/middleware/errorHandler";
import { serviceTemplateService } from "./service-template.service";
import { createServiceTemplateSchema, updateServiceTemplateSchema } from "./service-template.dto";
import { z } from "zod";

export const serviceTemplateController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const activeOnly = req.query.activeOnly !== "false";
    const items = await serviceTemplateService.list(activeOnly);
    return ok(res, items);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const found = await serviceTemplateService.getById(req.params.id);
    return ok(res, found);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const dto = createServiceTemplateSchema.parse(req.body);
    const created = await serviceTemplateService.create(dto);
    return ok(res, created, undefined, 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const dto = updateServiceTemplateSchema.parse(req.body);
    const updated = await serviceTemplateService.update(req.params.id, dto);
    return ok(res, updated);
  }),

  setActive: asyncHandler(async (req: Request, res: Response) => {
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
    const updated = await serviceTemplateService.setActive(req.params.id, isActive);
    return ok(res, updated);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await serviceTemplateService.remove(req.params.id);
    return ok(res, { message: "Service template deleted" });
  }),
};
