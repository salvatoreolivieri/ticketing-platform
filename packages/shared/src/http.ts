import type { NextFunction, Request, RequestHandler, Response } from "express";
import { fail } from "./envelope";
import { AppError } from "./errors";

/** Wraps an async handler so thrown/rejected errors reach the error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/** Maps AppError -> its status envelope; anything else -> 500. Mount last. */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json(fail(err.status, [err.toApiError()], err.message));
    return;
  }
  console.error(err);
  res
    .status(500)
    .json(
      fail(
        500,
        [{ code: "INTERNAL_SERVER_ERROR", message: "Internal server error" }],
        "Internal server error",
      ),
    );
}

/** Fallback for unmatched routes — keeps the envelope consistent. */
export function notFoundMiddleware(_req: Request, res: Response): void {
  res
    .status(404)
    .json(fail(404, [{ code: "NOT_FOUND", message: "Route not found" }], "Route not found"));
}
