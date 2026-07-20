import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { authRepository } from "./auth.repository";
import { signAccessToken, signRefreshJti, verifyRefreshJti } from "./tokens";
import { UnauthorizedError, NotFoundError, ConflictError } from "../../common/errors/AppError";
import { LoginDto, ResetPasswordDto, UpdateMeDto, ChangePasswordDto } from "./auth.dto";

const REFRESH_TOKEN_TTL_DAYS = 30;
const RESET_TOKEN_TTL_MINUTES = 30;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export const authService = {
  async login(dto: LoginDto) {
    const user = await authRepository.findUserByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role });

    // The refresh token's own JWT signature protects against tampering;
    // the DB row is the source of truth for revocation ("remember me"
    // sessions can be logged out server-side, e.g. from a device list).
    const refreshTokenValue = signRefreshJti(user.id) + "." + randomUUID();
    await authRepository.createRefreshToken({
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: addDays(new Date(), dto.rememberMe ? REFRESH_TOKEN_TTL_DAYS : 1),
    });

    await authRepository.updateLastLogin(user.id);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  },

  async refresh(refreshTokenValue: string) {
    const stored = await authRepository.findRefreshToken(refreshTokenValue);
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const jwtPart = refreshTokenValue.split(".").slice(0, 3).join("."); // reconstruct the signed JWT portion
    let payload: { sub: string };
    try {
      payload = verifyRefreshJti(jwtPart);
    } catch {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const user = await authRepository.findUserById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedError();

    // Rotate: revoke the old token, issue a new pair. Prevents indefinite
    // reuse of a leaked refresh token.
    await authRepository.revokeRefreshToken(refreshTokenValue);

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const newRefreshTokenValue = signRefreshJti(user.id) + "." + randomUUID();
    await authRepository.createRefreshToken({
      userId: user.id,
      token: newRefreshTokenValue,
      expiresAt: addDays(new Date(), REFRESH_TOKEN_TTL_DAYS),
    });

    return { accessToken, refreshToken: newRefreshTokenValue };
  },

  async logout(refreshTokenValue: string) {
    const stored = await authRepository.findRefreshToken(refreshTokenValue);
    if (stored && !stored.revokedAt) {
      await authRepository.revokeRefreshToken(refreshTokenValue);
    }
  },

  async forgotPassword(email: string) {
    const user = await authRepository.findUserByEmail(email);
    // Always return success shape regardless of whether the user exists,
    // so this endpoint can't be used to enumerate registered emails.
    if (!user) return;

    const token = randomUUID();
    await authRepository.createPasswordResetToken({
      userId: user.id,
      token,
      expiresAt: addMinutes(new Date(), RESET_TOKEN_TTL_MINUTES),
    });

    // TODO: send via NotificationProvider (email channel) once implemented.
    console.log(`[dev] Password reset link for ${email}: /reset-password?token=${token}`);
  },

  async resetPassword(dto: ResetPasswordDto) {
    const resetToken = await authRepository.findValidPasswordResetToken(dto.token);
    if (!resetToken) throw new NotFoundError("Reset token");

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await authRepository.updatePassword(resetToken.userId, passwordHash);
    await authRepository.markPasswordResetTokenUsed(resetToken.id);
    // Invalidate all existing sessions after a password reset.
    await authRepository.revokeAllRefreshTokensForUser(resetToken.userId);
  },

  async updateMe(userId: string, dto: UpdateMeDto) {
    if (dto.email) {
      const existing = await authRepository.findUserByEmail(dto.email);
      if (existing && existing.id !== userId) {
        throw new ConflictError("A user with this email already exists");
      }
    }
    return authRepository.updateProfile(userId, dto);
  },

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedError();

    const currentMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentMatches) throw new UnauthorizedError("Current password is incorrect");

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await authRepository.updatePassword(userId, passwordHash);
    // Force re-login everywhere, including this session's next refresh —
    // the caller's frontend should treat this like a logout.
    await authRepository.revokeAllRefreshTokensForUser(userId);
  },
};
