import { Request, Response } from "express";
import { asyncHandler, ok } from "../../common/middleware/errorHandler";
import { customerService } from "./customer.service";
import { createCustomerSchema, updateCustomerSchema, customerQuerySchema } from "./customer.dto";

export const customerController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = customerQuerySchema.parse(req.query);
    const { items, meta } = await customerService.list(query);
    return ok(res, items, meta);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const customer = await customerService.getById(req.params.id);
    return ok(res, customer);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const dto = createCustomerSchema.parse(req.body);
    const customer = await customerService.create(dto);
    return ok(res, customer, undefined, 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const dto = updateCustomerSchema.parse(req.body);
    const customer = await customerService.update(req.params.id, dto);
    return ok(res, customer);
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    await customerService.remove(req.params.id);
    return ok(res, { message: "Customer deleted" });
  }),
};
