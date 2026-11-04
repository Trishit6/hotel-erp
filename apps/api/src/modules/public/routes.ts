import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { publicWriteLimiter } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/http";
import { dateOnly, publicReservationSchema } from "../shared/schemas";
import {
  createReservation,
  getReservationDetail,
  lookupReservations,
} from "../../services/reservations";
import { getAvailability, getPublicCatalog } from "../../services/rooms";

export const publicRouter = Router();

const availabilityQuery = z.object({
  checkIn: dateOnly,
  checkOut: dateOnly,
  guests: z.coerce.number().int().min(1).max(16),
});

const lookupQuery = z.object({
  q: z.string().trim().min(1, "Enter a booking reference, email or phone.").max(120),
});

publicRouter.get(
  "/room-types",
  asyncHandler(async (_req, res) => {
    const catalog = await getPublicCatalog();
    res.json({ roomTypes: catalog.roomTypes });
  }),
);

publicRouter.get(
  "/catalog",
  asyncHandler(async (_req, res) => {
    res.json(await getPublicCatalog());
  }),
);

publicRouter.get(
  "/rooms",
  asyncHandler(async (_req, res) => {
    res.json(await getPublicCatalog());
  }),
);

publicRouter.get(
  "/availability",
  validate(availabilityQuery, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof availabilityQuery>;
    res.json({ rooms: await getAvailability(query.checkIn, query.checkOut, query.guests) });
  }),
);

publicRouter.post(
  "/reservations",
  publicWriteLimiter,
  validate(publicReservationSchema),
  asyncHandler(async (req, res) => {
    const result = await createReservation(req.body);
    res.status(201).json(result);
  }),
);

publicRouter.get(
  "/reservations/lookup",
  publicWriteLimiter,
  validate(lookupQuery, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as z.infer<typeof lookupQuery>;
    res.json({ reservations: await lookupReservations(query.q) });
  }),
);

publicRouter.get(
  "/reservations/:reference",
  asyncHandler(async (req, res) => {
    const detail = await getReservationDetail(req.params.reference);
    if (!detail) {
      res.status(404).json({ error: { code: "not_found", message: "Reservation not found." } });
      return;
    }
    res.json(detail);
  }),
);
