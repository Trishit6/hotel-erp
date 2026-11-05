import type { NextFunction, Request, Response } from "express";

/**
 * Minimal structured access log. Paths are logged without query strings so
 * guest emails, lookup terms and tokens never end up in log files.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.log(
      JSON.stringify({
        level: "info",
        type: "request",
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
        ip: req.ip,
      }),
    );
  });
  next();
}
