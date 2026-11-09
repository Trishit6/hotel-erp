import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth";
import { bookingWriteLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { asyncHandler, forbidden } from "../../utils/http";
import { accountProfileSchema, customerReservationSchema, idParam } from "../shared/schemas";
import { actorFrom } from "../shared/actor";
import {
  assertCustomer,
  cancelOwnReservation,
  getAccountOverview,
  updateAccountProfile,
} from "../../services/account";
import { createReservation } from "../../services/reservations";

export const accountRouter = Router();

accountRouter.use(requireAuth);

accountRouter.use((req: Request, _res: Response, next: NextFunction) => {
  try {
    assertCustomer(req.user!.role);
    next();
  } catch (error) {
    next(error);
  }
});

accountRouter.get(
  "/overview",
  asyncHandler(async (req, res) => {
    res.json(await getAccountOverview(req.user!.id));
  }),
);

accountRouter.post(
  "/reservations",
  bookingWriteLimiter,
  validate(customerReservationSchema),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const result = await createReservation(
      { ...req.body, guestName: user.name, email: user.email },
      {
        source: "customer",
        actor: actorFrom(req),
        customer: { id: user.id, name: user.name, email: user.email },
      },
    );
    res.status(201).json(result);
  }),
);

accountRouter.patch(
  "/profile",
  validate(accountProfileSchema),
  asyncHandler(async (req, res) => {
    res.json(await updateAccountProfile(req.user!.id, req.body));
  }),
);

accountRouter.post(
  "/reservations/:id/cancel",
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    res.json({ reservation: await cancelOwnReservation(req.user!.id, req.params.id) });
  }),
);

accountRouter.get(
  "/permissions",
  asyncHandler(async () => {
    // Customer accounts have no staff permissions by design.
    throw forbidden("Customer accounts do not carry staff permissions.");
  }),
);
