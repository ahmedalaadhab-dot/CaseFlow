import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";
import { env } from "../../config/env";

// Every API response follows the same envelope so the frontend can rely
// on a single shape: { success, data } or { success, error }.
export function ok(res: Response, data: unknown, meta?: Record<string, unknown>, status = 200) {
  return res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ success: false, error: { message: "Route not found" } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      success: false,
      error: { message: "Validation failed", details: err.flatten() },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, details: err.details },
    });
  }

  // body-parser throws a plain SyntaxError (with .status/.type set) for
  // malformed JSON bodies — treat it as a client error, not a server fault.
  if (err instanceof SyntaxError && (err as any).status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      error: { message: "Malformed JSON in request body" },
    });
  }

  console.error("Unhandled error:", err);

  return res.status(500).json({
    success: false,
    error: {
      message: "Internal server error",
      // Only leak stack traces in non-production environments.
      ...(env.NODE_ENV !== "production" && err instanceof Error ? { stack: err.stack } : {}),
    },
  });
}

// Wrap async route handlers so thrown/rejected errors reach errorHandler
// without a try/catch in every controller.
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
