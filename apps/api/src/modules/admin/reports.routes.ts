import { Router } from "express";
import { requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/http";
import { reportQuerySchema } from "../shared/query";
import { getDashboard, getReportSummary } from "../../services/reports";

export const reportsRouter = Router();

reportsRouter.get(
  "/dashboard",
  requirePermission("dashboard:read"),
  asyncHandler(async (_req, res) => {
    res.json(await getDashboard());
  }),
);

reportsRouter.get(
  "/summary",
  requirePermission("reports:read"),
  validate(reportQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as { from: string; to: string };
    res.json(await getReportSummary(query.from, query.to));
  }),
);
