import { Router } from "express";
import { requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/http";
import {
  adminReservationSchema,
  assignRoomSchema,
  checkInOverrideSchema,
  checkoutOverrideSchema,
  idParam,
  reservationStatusSchema,
} from "../shared/schemas";
import { reservationQuerySchema } from "../shared/query";
import { actorFrom } from "../shared/actor";
import {
  assignReservationRoom,
  checkInReservation,
  checkOutReservation,
  createReservation,
  getReservationDetail,
  listReservations,
  updateReservationStatus,
} from "../../services/reservations";
import { notFound } from "../../utils/http";

export const reservationsRouter = Router();

reservationsRouter.get(
  "/",
  requirePermission("reservations:read"),
  validate(reservationQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    res.json(await listReservations(req.query as never));
  }),
);

reservationsRouter.post(
  "/",
  requirePermission("reservations:write"),
  validate(adminReservationSchema),
  asyncHandler(async (req, res) => {
    const result = await createReservation(req.body, { source: "staff", actor: actorFrom(req) });
    res.status(201).json(result);
  }),
);

reservationsRouter.get(
  "/:id",
  requirePermission("reservations:read"),
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const detail = await getReservationDetail(req.params.id);
    if (!detail) throw notFound("Reservation not found.");
    res.json(detail);
  }),
);

reservationsRouter.patch(
  "/:id/status",
  requirePermission("reservations:write"),
  validate(idParam, "params"),
  validate(reservationStatusSchema),
  asyncHandler(async (req, res) => {
    res.json({
      reservation: await updateReservationStatus(req.params.id, req.body.status, actorFrom(req)),
    });
  }),
);

reservationsRouter.patch(
  "/:id/room",
  requirePermission("reservations:write"),
  validate(idParam, "params"),
  validate(assignRoomSchema),
  asyncHandler(async (req, res) => {
    res.json({
      reservation: await assignReservationRoom(req.params.id, req.body.roomId, actorFrom(req)),
    });
  }),
);

reservationsRouter.post(
  "/:id/check-in",
  requirePermission("reservations:checkin"),
  validate(idParam, "params"),
  validate(checkInOverrideSchema),
  asyncHandler(async (req, res) => {
    res.json({
      reservation: await checkInReservation(req.params.id, actorFrom(req), {
        earlyCheckIn: req.body.earlyCheckIn,
      }),
    });
  }),
);

reservationsRouter.post(
  "/:id/check-out",
  requirePermission("reservations:checkout"),
  validate(idParam, "params"),
  validate(checkoutOverrideSchema),
  asyncHandler(async (req, res) => {
    res.json({
      reservation: await checkOutReservation(req.params.id, actorFrom(req), {
        overrideOutstandingBalance: req.body.overrideOutstandingBalance,
      }),
    });
  }),
);
