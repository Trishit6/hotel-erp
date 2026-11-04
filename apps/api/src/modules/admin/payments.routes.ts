import { Router } from "express";
import { requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/http";
import { invoiceQuerySchema, paymentQuerySchema } from "../shared/query";
import { paymentSchema } from "../shared/schemas";
import { actorFrom } from "../shared/actor";
import { listInvoices, listPayments, recordPayment } from "../../services/payments";

export const paymentsRouter = Router();

paymentsRouter.get(
  "/",
  requirePermission("payments:read"),
  validate(paymentQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    res.json(await listPayments(req.query as never));
  }),
);

paymentsRouter.post(
  "/",
  requirePermission("payments:write"),
  validate(paymentSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json(await recordPayment(req.body, actorFrom(req)));
  }),
);

paymentsRouter.get(
  "/invoices",
  requirePermission("payments:read"),
  validate(invoiceQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    res.json(await listInvoices(req.query as never));
  }),
);
