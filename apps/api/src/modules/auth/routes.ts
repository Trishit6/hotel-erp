import { Router } from "express";
import { env } from "../../config/env";
import { attachUser, requireAuth } from "../../middleware/auth";
import { authLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../shared/schemas";
import { asyncHandler, unauthorized } from "../../utils/http";
import { ROLE_HOME, type UserRole } from "../../constants";
import { authenticate, changePassword, registerCustomer } from "../../services/users";
import {
  clearSessionCookie,
  createSession,
  destroySession,
  findSession,
  setSessionCookie,
} from "../../services/session";
import { createPasswordResetToken, resetPasswordWithToken } from "../../services/passwordReset";
import { mapUser } from "../../services/mappers";

export const authRouter = Router();

authRouter.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    // Public signup always creates a customer. `registerSchema` has no role
    // field, so a request cannot request a staff role.
    const user = await registerCustomer(req.body);
    const session = await createSession(user.id, req);
    setSessionCookie(res, session.token, session.expiresAt);
    res.status(201).json({ user, redirect: ROLE_HOME[user.role as UserRole] });
  }),
);

authRouter.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    // The same endpoint authenticates every role; the role always comes from
    // the database row, never from the request body.
    const user = await authenticate(req.body.email, req.body.password);
    if (!user) throw unauthorized("Invalid email or password.");
    const session = await createSession(user.id, req);
    setSessionCookie(res, session.token, session.expiresAt);
    const mapped = mapUser(user);
    res.json({ user: mapped, redirect: ROLE_HOME[mapped.role as UserRole] });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[env.session.cookieName] as string | undefined;
    if (token) {
      const session = await findSession(token);
      if (session) await destroySession(session.sessionId);
    }
    clearSessionCookie(res);
    res.status(204).end();
  }),
);

authRouter.get(
  "/me",
  attachUser,
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user, redirect: ROLE_HOME[req.user!.role as UserRole] });
  }),
);

authRouter.post(
  "/change-password",
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    await changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword, req.sessionId);
    res.status(204).end();
  }),
);

authRouter.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const token = await createPasswordResetToken(req.body.email);
    // The response is identical for unknown addresses. No email provider is
    // configured, so in development the token is returned to keep the flow
    // testable; production never exposes it.
    res.json({
      ok: true,
      message: "If that email belongs to an account, reset instructions have been issued.",
      ...(!env.isProduction && token ? { resetToken: token } : {}),
    });
  }),
);

authRouter.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    await resetPasswordWithToken(req.body.token, req.body.password);
    res.status(204).end();
  }),
);
