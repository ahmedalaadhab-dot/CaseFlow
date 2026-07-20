import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { userRepository } from "./user.repository";
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from "../../common/errors/AppError";
import { CreateUserDto, UpdateUserDto, UserQueryDto } from "./user.dto";

interface Actor {
  id: string;
  role: Role;
}

export const userService = {
  list(query: UserQueryDto) {
    return userRepository.findMany(query);
  },

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError("User");
    return user;
  },

  async create(dto: CreateUserDto, actor: Actor) {
    // Assigning the OWNER role is the one privilege an OWNER account can't
    // hand out through a MANAGER-level session — otherwise a Manager could
    // mint themselves (or anyone) a new Owner account.
    if (dto.role === "OWNER" && actor.role !== "OWNER") {
      throw new ForbiddenError("Only an owner can create another owner");
    }

    const existing = await userRepository.findByEmail(dto.email);
    if (existing) throw new ConflictError("A user with this email already exists");

    const passwordHash = await bcrypt.hash(dto.password, 12);
    return userRepository.create({ ...dto, passwordHash });
  },

  async update(id: string, dto: UpdateUserDto, actor: Actor) {
    const target = await this.getById(id);

    // Only an owner may touch an owner account's role/active state, and
    // only an owner may promote someone else to owner.
    if ((target.role === "OWNER" || dto.role === "OWNER") && actor.role !== "OWNER") {
      throw new ForbiddenError("Only an owner can manage owner-level accounts");
    }

    if (dto.isActive === false && id === actor.id) {
      throw new ValidationError(undefined, "You can't deactivate your own account");
    }

    if (target.role === "OWNER" && dto.role && dto.role !== "OWNER") {
      const activeOwners = await userRepository.countActiveOwners();
      if (activeOwners <= 1) {
        throw new ValidationError(undefined, "There must be at least one active owner");
      }
    }

    const updated = await userRepository.update(id, dto);
    if (dto.isActive === false) {
      await userRepository.revokeAllRefreshTokensForUser(id);
    }
    return updated;
  },

  async resetPassword(id: string, newPassword: string, actor: Actor) {
    const target = await this.getById(id);
    if (target.role === "OWNER" && actor.role !== "OWNER") {
      throw new ForbiddenError("Only an owner can reset another owner's password");
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await userRepository.updatePassword(id, passwordHash);
    // Force re-login everywhere after an admin-triggered password reset.
    await userRepository.revokeAllRefreshTokensForUser(id);
  },

  async deactivate(id: string, actor: Actor) {
    return this.update(id, { isActive: false }, actor);
  },

  async reactivate(id: string, actor: Actor) {
    const target = await this.getById(id);
    if (target.role === "OWNER" && actor.role !== "OWNER") {
      throw new ForbiddenError("Only an owner can manage owner-level accounts");
    }
    return userRepository.reactivate(id);
  },
};
