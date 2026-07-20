import { prisma } from "../../config/prisma";

// Repository pattern: this is the only file allowed to write raw Prisma
// queries for auth-related tables. The service layer depends on this
// interface, not on Prisma directly, which keeps swapping/mocking easy.
export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findFirst({ where: { email, deletedAt: null } });
  },

  findUserById(id: string) {
    return prisma.user.findFirst({ where: { id, deletedAt: null } });
  },

  updateLastLogin(userId: string) {
    return prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  },

  createRefreshToken(params: { userId: string; token: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data: params });
  },

  findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({ where: { token } });
  },

  revokeRefreshToken(token: string) {
    return prisma.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    });
  },

  revokeAllRefreshTokensForUser(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  createPasswordResetToken(params: { userId: string; token: string; expiresAt: Date }) {
    return prisma.passwordResetToken.create({ data: params });
  },

  findValidPasswordResetToken(token: string) {
    return prisma.passwordResetToken.findFirst({
      where: { token, usedAt: null, expiresAt: { gt: new Date() } },
    });
  },

  markPasswordResetTokenUsed(id: string) {
    return prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
  },

  updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  },

  updateProfile(userId: string, data: { firstName?: string; lastName?: string; email?: string }) {
    return prisma.user.update({ where: { id: userId }, data });
  },
};
