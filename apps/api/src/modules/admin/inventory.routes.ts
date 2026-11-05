import { Router } from "express";
import { requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/http";
import { idParam, inventoryAdjustSchema, inventorySchema, inventoryUpdateSchema } from "../shared/schemas";
import { inventoryQuerySchema } from "../shared/query";
import { actorFrom } from "../shared/actor";
import {
  adjustInventory,
  createInventoryItem,
  deleteInventoryItem,
  listInventory,
  updateInventoryItem,
} from "../../services/inventory";

export const inventoryRouter = Router();

inventoryRouter.get(
  "/",
  requirePermission("inventory:read"),
  validate(inventoryQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    res.json(await listInventory(req.query as never));
  }),
);

inventoryRouter.post(
  "/",
  requirePermission("inventory:write"),
  validate(inventorySchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ item: await createInventoryItem(req.body, actorFrom(req)) });
  }),
);

inventoryRouter.post(
  "/:id/adjust",
  requirePermission("inventory:write"),
  validate(idParam, "params"),
  validate(inventoryAdjustSchema),
  asyncHandler(async (req, res) => {
    res.json({ item: await adjustInventory(req.params.id, req.body.amount, actorFrom(req)) });
  }),
);

inventoryRouter.patch(
  "/:id",
  requirePermission("inventory:write"),
  validate(idParam, "params"),
  validate(inventoryUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json({ item: await updateInventoryItem(req.params.id, req.body, actorFrom(req)) });
  }),
);

inventoryRouter.delete(
  "/:id",
  requirePermission("inventory:write"),
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    await deleteInventoryItem(req.params.id, actorFrom(req));
    res.status(204).end();
  }),
);
