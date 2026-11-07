import { Router } from "express";
import { asyncHandler } from "../../utils/http";
import { listSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier } from "../../services/suppliers";
import { validate } from "../../middleware/validate";
import { idParam } from "../shared/schemas";
import { requireAuth, requireStaff } from "../../middleware/auth"; import { forbidden } from "../../utils/http";
import { hasPermission } from "../../services/permissions";

export const suppliersRouter = Router();

suppliersRouter.get(
  "/",
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    const search = (req.query.search as string) || undefined;
    const suppliers = await listSuppliers(search);
    res.json({ suppliers });
  })
);

suppliersRouter.get(
  "/:id",
  requireAuth,
  requireStaff,
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const supplier = await getSupplier(req.params.id);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.json({ supplier });
  })
);

suppliersRouter.post(
  "/",
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    const supplier = await createSupplier(req.body);
    res.status(201).json({ supplier });
  })
);

suppliersRouter.patch(
  "/:id",
  requireAuth,
  requireStaff,
  validate(idParam, "params"),
  asyncHandler(async (req, res) => {
    const supplier = await updateSupplier(req.params.id, req.body);
    if (!supplier) return res.status(404).json({ error: "Supplier not found" });
    res.json({ supplier });
  })
);

suppliersRouter.delete(
  "/:id",
  requireAuth,
  requireStaff,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== "super-admin") throw forbidden("Only a super administrator can delete suppliers.");
    const deleted = await deleteSupplier(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Supplier not found" });
    res.json({ deleted: true });
  })
);