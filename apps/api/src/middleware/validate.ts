import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { badRequest } from "../utils/http";

type Source = "body" | "query" | "params";

export function validate(schema: ZodType, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(
        badRequest(
          result.error.issues[0]?.message ?? "Please check the submitted details.",
          result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
        ),
      );
      return;
    }
    (req as unknown as Record<Source, unknown>)[source] = result.data;
    next();
  };
}
