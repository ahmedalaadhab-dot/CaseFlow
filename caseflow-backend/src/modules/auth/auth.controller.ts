import { Request, Response } from "express";
import { asyncHandler, ok } from "../../common/middleware/errorHandler";
import { authService } from "./auth.service";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
  updateMeSchema,
  changePasswordSchema,
} from "./auth.dto";
import { authRepository } from "./auth.repository";
import { UnauthorizedError } from "../../common/errors/AppError";

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const dto = loginSchema.parse(req.body);
    const result = await authService.login(dto);
    return ok(res, result);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const dto = refreshSchema.parse(req.body);
    const result = await authService.refresh(dto.refreshToken);
    return ok(res, result);
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const dto = refreshSchema.parse(req.body);
    await authService.logout(dto.refreshToken);
    return ok(res, { message: "Logged out" });
  }),

  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const dto = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(dto.email);
    return ok(res, { message: "If that email exists, a reset link has been sent." });
  }),

  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const dto = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(dto);
    return ok(res, { message: "Password has been reset." });
  }),

  me: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const user = await authRepository.findUserById(req.user.id);
    if (!user) throw new UnauthorizedError();
    return ok(res, {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    });
  }),

  updateMe: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const dto = updateMeSchema.parse(req.body);
    const updated = await authService.updateMe(req.user.id, dto);
    return ok(res, {
      id: updated.id,
      email: updated.email,
      firstName: updated.firstName,
      lastName: updated.lastName,
      role: updated.role,
      avatarUrl: updated.avatarUrl,
    });
  }),

  changePassword: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const dto = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user.id, dto);
    return ok(res, { message: "Password changed. Please log in again." });
  }),
};
