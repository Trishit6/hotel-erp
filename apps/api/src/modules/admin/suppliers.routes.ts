import { Router } from "express";
import { asyncHandler, forbidden } from "../../utils/http";
import { requirePermission } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  idParam,
  supplierCreateSchema,
  supplierQuerySchema,
  supplierUpdateSchema,
} from "../shared/schemas";
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  listSuppliers,
  updateSupplier,
} from "../../services/suppliers";

export const suppliersRouter = Router();

suppliersRouter.get(
  "/",
  requirePermission("inventory:read"),
  validate(supplierQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as { search?: string };
    res.json({ suppliers: await listSuppliers(query.search) });
  }),
);

suppliersRouter.get(
  "/:id",
  requirePermission("inventory:read"),
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const supplier = await getSupplier(req.params.id);
    if (!supplier) {
      res.status(404).json({ error: { code: "not_found", message: "Supplier not found." } });
      return;
    }
    res.json({ supplier });
  }),
);

suppliersRouter.post(
  "/",
  requirePermission("inventory:write"),
  validate(supplierCreateSchema),
  asyncHandler(async (req, res) => {
    const supplier = await createSupplier(req.body);
    res.status(201).json({ supplier });
  }),
);

suppliersRouter.patch(
  "/:id",
  requirePermission("inventory:write"),
  validate(idParam, "params"),
  validate(supplierUpdateSchema),
  asyncHandler(async (req, res) => {
    const supplier = await updateSupplier(req.params.id, req.body);
    if (!supplier) {
      res.status(404).json({ error: { code: "not_found", message: "Supplier not found." } });
      return;
    }
    res.json({ supplier });
  }),
);

suppliersRouter.delete(
  "/:id",
  requirePermission("inventory:write"),
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    if (req.user!.role !== "super-admin") throw forbidden("Only a super administrator can delete suppliers.");
    const deleted = await deleteSupplier(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: { code: "not_found", message: "Supplier not found." } });
      return;
    }
    res.json({ deleted: true });
  }),
);
