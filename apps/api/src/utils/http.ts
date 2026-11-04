import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code = "request_error", details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) => new HttpError(400, message, "validation_error", details);
export const unauthorized = (message = "Authentication required.") => new HttpError(401, message, "unauthorized");
export const forbidden = (message = "You do not have permission to perform this action.") =>
  new HttpError(403, message, "forbidden");
export const notFound = (message = "Resource not found.") => new HttpError(404, message, "not_found");
export const conflict = (message: string, details?: unknown) => new HttpError(409, message, "conflict", details);

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function errorMessage(error: unknown): string {
  if (error instanceof ZodError) return error.issues[0]?.message ?? "Please check the submitted details.";
  if (error instanceof Error) return error.message;
  return "Unexpected error.";
}
