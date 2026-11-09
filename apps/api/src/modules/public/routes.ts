import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validate";
import { publicLookupLimiter } from "../../middleware/rateLimit";
import { asyncHandler } from "../../utils/http";
import { dateOnly } from "../shared/schemas";
import { verifyPublicReservation } from "../../services/reservations";
import { getAvailability, getPublicCatalog } from "../../services/rooms";

export const publicRouter = Router();

const availabilityQuery = z.object({
  checkIn: dateOnly,
  checkOut: dateOnly,
  guests: z.coerce.number().int().min(1).max(16),
});

const verifyReservationSchema = z
  .object({
    reference: z.string().trim().min(1, "Enter your booking reference.").max(64),
    email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(191).optional(),
    phone: z.string().trim().min(1, "Enter your mobile number.").max(32).optional(),
  })
  .strict()
  .refine(
    (value) => Number(Boolean(value.email)) + Number(Boolean(value.phone)) === 1,
    "Provide either the booking email or the booking mobile number.",
  );

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

// Customer reservation creation lives under /api/account and requires an
// authenticated customer session. There is deliberately no unauthenticated
// reservation-creation route here.

// Contact details are sent in the body so they never appear in a URL, browser
// history, or reverse-proxy access log. The limiter runs before validation and
// before the database lookup.
publicRouter.post(
  "/reservations/verify",
  publicLookupLimiter,
  validate(verifyReservationSchema),
  asyncHandler(async (req, res) => {
    const detail = await verifyPublicReservation(req.body.reference, {
      email: req.body.email,
      phone: req.body.phone,
    });
    if (!detail) {
      res.status(404).json({ error: { code: "not_found", message: "Reservation not found." } });
      return;
    }
    res.json({ reservation: detail });
  }),
);
