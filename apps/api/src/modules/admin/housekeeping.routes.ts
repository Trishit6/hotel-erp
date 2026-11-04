import { Router } from "express";
import { requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/http";
import { taskCreateSchema, taskUpdateSchema, idParam } from "../shared/schemas";
import { taskQuerySchema } from "../shared/query";
import { actorFrom } from "../shared/actor";
import { createTask, listTasks, updateTask } from "../../services/housekeeping";

export const housekeepingRouter = Router();

housekeepingRouter.get(
  "/tasks",
  requirePermission("housekeeping:read"),
  validate(taskQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    res.json(await listTasks(req.query as never));
  }),
);

housekeepingRouter.post(
  "/tasks",
  requirePermission("housekeeping:write"),
  validate(taskCreateSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ task: await createTask(req.body, actorFrom(req)) });
  }),
);

housekeepingRouter.patch(
  "/tasks/:id",
  requirePermission("housekeeping:write"),
  validate(idParam, "params"),
  validate(taskUpdateSchema),
  asyncHandler(async (req, res) => {
    res.json({ task: await updateTask(req.params.id, req.body, actorFrom(req)) });
  }),
);
