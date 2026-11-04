import { Router } from "express";
import { env } from "../../config/env";
import { attachUser, requireAuth } from "../../middleware/auth";
import { authLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { changePasswordSchema, loginSchema, setupSchema } from "../shared/schemas";
import { asyncHandler, conflict, forbidden, unauthorized } from "../../utils/http";
import { safeEqual } from "../../services/session";
import {
  authenticate,
  changePassword,
  createUser,
  userCount,
} from "../../services/users";
import {
  clearSessionCookie,
  createSession,
  destroySession,
  findSession,
  setSessionCookie,
} from "../../services/session";
import { mapUser } from "../../services/mappers";

export const authRouter = Router();

authRouter.post(
  "/setup",
  authLimiter,
  validate(setupSchema),
  asyncHandler(async (req, res) => {
    if (!env.setupToken) {
      throw forbidden("Initial setup is disabled. Configure SETUP_TOKEN on the API server.");
    }
    if (!safeEqual(req.body.setupToken, env.setupToken)) {
      throw forbidden("The setup token is invalid.");
    }
    if ((await userCount()) > 0) {
      throw conflict("Setup has already been completed. Sign in instead.");
    }
    const user = await createUser({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      role: "super-admin",
    });
    const session = await createSession(user.id, req);
    setSessionCookie(res, session.token, session.expiresAt);
    res.status(201).json({ user });
  }),
);

authRouter.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await authenticate(req.body.email, req.body.password);
    if (!user) throw unauthorized("Invalid email or password.");
    const session = await createSession(user.id, req);
    setSessionCookie(res, session.token, session.expiresAt);
    res.json({ user: mapUser(user) });
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
    res.json({ user: req.user });
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
