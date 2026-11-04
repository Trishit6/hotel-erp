import { Router } from "express";
import { requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/http";
import { guestSchema, guestUpdateSchema, idParam } from "../shared/schemas";
import { guestQuerySchema } from "../shared/query";
import { actorFrom } from "../shared/actor";
import { createGuest, getGuest, listGuests, updateGuest } from "../../services/guests";
import { notFound } from "../../utils/http";

export const guestsRouter = Router();

guestsRouter.get(
  "/",
  requirePermission("guests:read"),
  validate(guestQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    res.json(await listGuests(req.query as never));
  }),
);

guestsRouter.post(
  "/",
  requirePermission("guests:write"),
  validate(guestSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ guest: await createGuest(req.body, actorFrom(req)) });
  }),
);

guestsRouter.get(
  "/:id",
  requirePermission("guests:read"),
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const guest = await getGuest(req.params.id);
    if (!guest) throw notFound("Guest not found.");
    res.json({ guest });
  }),
);

guestsRouter.patch(
  "/:id",
  requirePermission("guests:write"),
  validate(idParam, "params"),
  validate(guestUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json({ guest: await updateGuest(req.params.id, req.body, actorFrom(req)) });
  }),
);
