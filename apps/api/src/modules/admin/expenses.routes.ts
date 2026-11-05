import { Router } from "express";
import { requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/http";
import { expenseApprovalSchema, expenseSchema, expenseUpdateSchema, idParam } from "../shared/schemas";
import { expenseQuerySchema } from "../shared/query";
import { actorFrom } from "../shared/actor";
import {
  approveExpense,
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
} from "../../services/expenses";

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

expensesRouter.patch(
  "/:id",
  requirePermission("expenses:write"),
  validate(idParam, "params"),
  validate(expenseUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json({ expense: await updateExpense(req.params.id, req.body, actorFrom(req)) });
  }),
);

expensesRouter.delete(
  "/:id",
  requirePermission("expenses:write"),
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    await deleteExpense(req.params.id, actorFrom(req));
    res.status(204).end();
  }),
);
