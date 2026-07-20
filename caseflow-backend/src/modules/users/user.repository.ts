import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { CreateUserDto, UpdateUserDto, UserQueryDto } from "./user.dto";

// Never select passwordHash outside of auth — this is the list every other
// endpoint in this module reads and returns to the client.
const safeSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  avatarUrl: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const userRepository = {
  findMany(query: UserQueryDto) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: "insensitive" } },
              { lastName: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return prisma.user.findMany({ where, select: safeSelect, orderBy: [{ isActive: "desc" }, { firstName: "asc" }] });
  },

  findById(id: string) {
    return prisma.user.findFirst({ where: { id, deletedAt: null }, select: safeSelect });
  },

  findByEmail(email: string) {
    return prisma.user.findFirst({ where: { email, deletedAt: null } });
  },

  create(data: CreateUserDto & { passwordHash: string }) {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
      },
      select: safeSelect,
    });
  },

  update(id: string, data: UpdateUserDto) {
    return prisma.user.update({ where: { id }, data, select: safeSelect });
  },

  updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  // Deactivation, not deletion: users are referenced from cases/tasks/audit
  // history throughout the app, so a hard delete (or even soft-delete via
  // deletedAt) would orphan or hide that history. isActive: false blocks
  // login and can be reversed; it never removes the row.
  deactivate(id: string) {
    return prisma.user.update({ where: { id }, data: { isActive: false }, select: safeSelect });
  },

  reactivate(id: string) {
    return prisma.user.update({ where: { id }, data: { isActive: true }, select: safeSelect });
  },

  countActiveOwners() {
    return prisma.user.count({ where: { role: "OWNER", isActive: true, deletedAt: null } });
  },

  revokeAllRefreshTokensForUser(userId: string) {
    return prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  },
};
