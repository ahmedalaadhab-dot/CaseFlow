import { Request, Response } from "express";
import { asyncHandler, ok } from "../../common/middleware/errorHandler";
import { userService } from "./user.service";
import { UnauthorizedError } from "../../common/errors/AppError";
import { createUserSchema, updateUserSchema, resetUserPasswordSchema, userQuerySchema } from "./user.dto";

function requireActor(req: Request) {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

export const userController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = userQuerySchema.parse(req.query);
    const users = await userService.list(query);
    return ok(res, users);
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getById(req.params.id);
    return ok(res, user);
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const dto = createUserSchema.parse(req.body);
    const created = await userService.create(dto, actor);
    return ok(res, created, undefined, 201);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const dto = updateUserSchema.parse(req.body);
    const updated = await userService.update(req.params.id, dto, actor);
    return ok(res, updated);
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const { newPassword } = resetUserPasswordSchema.parse(req.body);
    await userService.resetPassword(req.params.id, newPassword, actor);
    return ok(res, { message: "Password reset" });
  }),

  deactivate: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const updated = await userService.deactivate(req.params.id, actor);
    return ok(res, updated);
  }),

  reactivate: asyncHandler(async (req: Request, res: Response) => {
    const actor = requireActor(req);
    const updated = await userService.reactivate(req.params.id, actor);
    return ok(res, updated);
  }),
};
