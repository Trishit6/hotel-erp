import { Router } from "express";
import { requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/http";
import { idParam, orderSchema, orderStatusSchema } from "../shared/schemas";
import { orderQuerySchema } from "../shared/query";
import { actorFrom } from "../shared/actor";
import { createOrder, listOrders, updateOrderStatus } from "../../services/restaurant";

export const restaurantRouter = Router();

restaurantRouter.get(
  "/orders",
  requirePermission("restaurant:read"),
  validate(orderQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    res.json(await listOrders(req.query as never));
  }),
);

restaurantRouter.post(
  "/orders",
  requirePermission("restaurant:write"),
  validate(orderSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ order: await createOrder(req.body, actorFrom(req)) });
  }),
);

restaurantRouter.patch(
  "/orders/:id/status",
  requirePermission("restaurant:write"),
  validate(idParam, "params"),
  validate(orderStatusSchema),
  asyncHandler(async (req, res) => {
    res.json({ order: await updateOrderStatus(req.params.id, req.body.status, actorFrom(req)) });
  }),
);
