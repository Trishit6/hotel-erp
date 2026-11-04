import { Router } from "express";
import { requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/http";
import { attendanceUpdateSchema, idParam, staffSchema } from "../shared/schemas";
import { attendanceQuerySchema } from "../shared/query";
import { actorFrom } from "../shared/actor";
import {
  createStaff,
  listAttendance,
  listStaff,
  updateAttendance,
  updateStaff,
} from "../../services/staff";

export const staffRouter = Router();

staffRouter.get(
  "/",
  requirePermission("staff:read"),
  asyncHandler(async (_req, res) => {
    res.json({ staff: await listStaff() });
  }),
);

staffRouter.get(
  "/attendance",
  requirePermission("attendance:read"),
  validate(attendanceQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as { date?: string };
    res.json({ attendance: await listAttendance(query.date) });
  }),
);

staffRouter.patch(
  "/attendance/:id",
  requirePermission("attendance:write"),
  validate(idParam, "params"),
  validate(attendanceUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json({ attendance: await updateAttendance(req.params.id, req.body, actorFrom(req)) });
  }),
);

staffRouter.post(
  "/",
  requirePermission("staff:write"),
  validate(staffSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ staff: await createStaff(req.body, actorFrom(req)) });
  }),
);

staffRouter.patch(
  "/:id",
  requirePermission("staff:write"),
  validate(idParam, "params"),
  validate(staffSchema.partial()),
  asyncHandler(async (req, res) => {
    res.json({ staff: await updateStaff(req.params.id, req.body, actorFrom(req)) });
  }),
);
