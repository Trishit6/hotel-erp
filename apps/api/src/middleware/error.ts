import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../config/env";
import { HttpError } from "../utils/http";

interface MysqlError {
  code?: string;
  errno?: number;
  sqlMessage?: string;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: "not_found", message: `Route ${req.method} ${req.path} not found.` },
  });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "validation_error",
        message: error.issues[0]?.message ?? "Please check the submitted details.",
        details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      },
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    });
    return;
  }

  const mysqlError = error as MysqlError;
  if (mysqlError?.code === "ER_DUP_ENTRY") {
    res.status(409).json({
      error: { code: "conflict", message: "That record already exists. Check unique fields such as email or reference." },
    });
    return;
  }
  if (mysqlError?.code === "ER_NO_REFERENCED_ROW_2" || mysqlError?.code === "ER_ROW_IS_REFERENCED_2") {
    res.status(400).json({
      error: { code: "invalid_reference", message: "A referenced record does not exist or is still in use." },
    });
    return;
  }

  console.error("[api] unhandled error:", error);
  res.status(500).json({
    error: {
      code: "internal_error",
      message: env.isProduction ? "An unexpected error occurred." : (error as Error)?.message ?? "Unexpected error.",
    },
  });
}
