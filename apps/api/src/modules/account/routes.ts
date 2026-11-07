import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler, forbidden } from "../../utils/http";
import { accountProfileSchema, idParam } from "../shared/schemas";
import {
  assertCustomer,
  cancelOwnReservation,
  getAccountOverview,
  updateAccountProfile,
} from "../../services/account";

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
