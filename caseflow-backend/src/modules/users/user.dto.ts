import { z } from "zod";
import { Role } from "@prisma/client";

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(Role).default("EMPLOYEE"),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export const resetUserPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});
export type ResetUserPasswordDto = z.infer<typeof resetUserPasswordSchema>;

export const userQuerySchema = z.object({
  search: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
});
export type UserQueryDto = z.infer<typeof userQuerySchema>;
