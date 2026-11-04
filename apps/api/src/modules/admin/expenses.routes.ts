import { Router } from "express";
import { requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/http";
import { expenseApprovalSchema, expenseSchema, idParam } from "../shared/schemas";
import { expenseQuerySchema } from "../shared/query";
import { actorFrom } from "../shared/actor";
import { approveExpense, createExpense, listExpenses } from "../../services/expenses";

export const expensesRouter = Router();

expensesRouter.get(
  "/",
  requirePermission("expenses:read"),
  validate(expenseQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    res.json(await listExpenses(req.query as never));
  }),
);

expensesRouter.post(
  "/",
  requirePermission("expenses:write"),
  validate(expenseSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ expense: await createExpense(req.body, actorFrom(req)) });
  }),
);

expensesRouter.patch(
  "/:id/approval",
  requirePermission("expenses:approve"),
  validate(idParam, "params"),
  validate(expenseApprovalSchema),
  asyncHandler(async (req, res) => {
    res.json({ expense: await approveExpense(req.params.id, req.body.status, actorFrom(req)) });
  }),
);
