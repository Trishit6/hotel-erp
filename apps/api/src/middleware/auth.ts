import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { STAFF_ROLES } from "../constants";
import type { Permission } from "../services/permissions";
import { hasPermission } from "../services/permissions";
import { findSession } from "../services/session";
import { clearSessionCookie } from "../services/session";
import { forbidden, unauthorized } from "../utils/http";

export async function attachUser(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[env.session.cookieName] as string | undefined;
  if (!token) {
    next();
    return;
  }
  try {
    const session = await findSession(token);
    if (session) {
      req.user = session.user;
      req.sessionId = session.sessionId;
    }
  } catch {
    // A failed session lookup must not block public endpoints. Keep the log
    // free of cookies, tokens, session hashes, and user details.
    console.error("[auth] session lookup failed");
  }
  next();
}

export function optionalSessionCookieCleanup(res: Response): void {
  clearSessionCookie(res);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    clearSessionCookie(res);
    next(unauthorized());
    return;
  }
  next();
}

/** Customer accounts may never reach staff endpoints, even read-only ones. */
export function requireStaff(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(unauthorized());
    return;
  }
  if (!(STAFF_ROLES as readonly string[]).includes(req.user.role)) {
    next(forbidden("This area is for hotel staff only."));
    return;
  }
  next();
}

export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (!(STAFF_ROLES as readonly string[]).includes(req.user.role) || !hasPermission(req.user.role as never, permission)) {
      next(forbidden());
      return;
    }
    next();
  };
}
