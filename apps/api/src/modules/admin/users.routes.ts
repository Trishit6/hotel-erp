import { Router } from "express";
import { requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/http";
import { idParam, userCreateSchema, userUpdateSchema } from "../shared/schemas";
import { actorFrom } from "../shared/actor";
import { createUser, listUsers, updateUser } from "../../services/users";

export const usersRouter = Router();

usersRouter.get(
  "/",
  requirePermission("users:manage"),
  asyncHandler(async (_req, res) => {
    res.json({ users: await listUsers() });
  }),
);

usersRouter.post(
  "/",
  requirePermission("users:manage"),
  validate(userCreateSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ user: await createUser(req.body, actorFrom(req)) });
  }),
);

usersRouter.patch(
  "/:id",
  requirePermission("users:manage"),
  validate(idParam, "params"),
  validate(userUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json({ user: await updateUser(req.params.id, req.body, actorFrom(req), req.sessionId) });
  }),
);
