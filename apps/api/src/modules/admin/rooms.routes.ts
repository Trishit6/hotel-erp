import { Router } from "express";
import { requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/http";
import { idParam, roomSchema, roomStatusSchema } from "../shared/schemas";
import { actorFrom } from "../shared/actor";
import { createRoom, listRoomTypes, listRooms, updateRoomStatus } from "../../services/rooms";

export const roomsRouter = Router();

roomsRouter.get(
  "/",
  requirePermission("rooms:read"),
  asyncHandler(async (_req, res) => {
    res.json({ rooms: await listRooms() });
  }),
);

roomsRouter.get(
  "/types",
  requirePermission("rooms:read"),
  asyncHandler(async (_req, res) => {
    res.json({ roomTypes: await listRoomTypes() });
  }),
);

roomsRouter.post(
  "/",
  requirePermission("rooms:write"),
  validate(roomSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ room: await createRoom(req.body, actorFrom(req)) });
  }),
);

roomsRouter.patch(
  "/:id/status",
  requirePermission("rooms:status"),
  validate(idParam, "params"),
  validate(roomStatusSchema),
  asyncHandler(async (req, res) => {
    res.json({ room: await updateRoomStatus(req.params.id, req.body.status, actorFrom(req)) });
  }),
);
