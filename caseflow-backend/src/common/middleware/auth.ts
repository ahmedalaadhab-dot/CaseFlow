import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { verifyAccessToken } from "../../modules/auth/tokens";
import { UnauthorizedError, ForbiddenError } from "../errors/AppError";

// Augment Express's Request with the authenticated user identity.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing access token");
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }
}

// Role hierarchy: OWNER > MANAGER > EMPLOYEE / RECEPTION > VIEWER.
// requireRole lists which roles are explicitly permitted for a route;
// OWNER is always implicitly allowed everywhere.
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new UnauthorizedError();

    if (req.user.role === "OWNER" || allowed.includes(req.user.role)) {
      return next();
    }

    throw new ForbiddenError();
  };
}
