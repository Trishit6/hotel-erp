import { Router } from "express";
import { requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/http";
import { idParam, roomSchema, roomStatusSchema, roomTypeSchema, roomUpdateSchema } from "../shared/schemas";
import { actorFrom } from "../shared/actor";
import {
  createRoom,
  createRoomType,
  deleteRoom,
  deleteRoomType,
  listRoomTypes,
  listRooms,
  updateRoom,
  updateRoomStatus,
  updateRoomType,
} from "../../services/rooms";

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

roomsRouter.post(
  "/types",
  requirePermission("rooms:write"),
  validate(roomTypeSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ roomType: await createRoomType(req.body, actorFrom(req)) });
  }),
);

roomsRouter.patch(
  "/types/:id",
  requirePermission("rooms:write"),
  validate(idParam, "params"),
  validate(roomTypeSchema.partial()),
  asyncHandler(async (req, res) => {
    res.json({ roomType: await updateRoomType(req.params.id, req.body, actorFrom(req)) });
  }),
);

roomsRouter.delete(
  "/types/:id",
  requirePermission("rooms:write"),
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    await deleteRoomType(req.params.id, actorFrom(req));
    res.status(204).end();
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

roomsRouter.patch(
  "/:id",
  requirePermission("rooms:write"),
  validate(idParam, "params"),
  validate(roomUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json({ room: await updateRoom(req.params.id, req.body, actorFrom(req)) });
  }),
);

roomsRouter.delete(
  "/:id",
  requirePermission("rooms:write"),
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    await deleteRoom(req.params.id, actorFrom(req));
    res.status(204).end();
  }),
);
