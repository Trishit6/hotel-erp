import { Router } from "express";
import { requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/http";
import { actorFrom } from "../shared/actor";
import { settingsUpdateSchema } from "../shared/schemas";
import { getSettings, updateSettings } from "../../services/settings";

export const settingsRouter = Router();

settingsRouter.get(
  "/",
  requirePermission("settings:manage"),
  asyncHandler(async (_req, res) => {
    res.json({ settings: await getSettings() });
  }),
);

settingsRouter.patch(
  "/",
  requirePermission("settings:manage"),
  validate(settingsUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json({ settings: await updateSettings(req.body, actorFrom(req)) });
  }),
);
