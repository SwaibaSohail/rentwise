import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { applySchema } from "../schemas/application";
import * as svc from "../services/application";
import { emitToUser } from "../socket";

export const applicationsRouter = Router();

applicationsRouter.use(requireAuth);

// tenant applies for an available property
applicationsRouter.post("/", requireRole("TENANT"), async (req: AuthedRequest, res, next) => {
  try {
    const parsed = applySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "validation_error", message: parsed.error.issues[0].message });
    }
    const application = await svc.apply(req.user!.id, parsed.data.propertyId);
    emitToUser((application as { property: { landlordId: string } }).property.landlordId, "application:new", application);
    res.status(201).json(application);
  } catch (err) {
    next(err);
  }
});

// tenant's own applications
applicationsRouter.get("/mine", requireRole("TENANT"), async (req: AuthedRequest, res, next) => {
  try {
    res.json(await svc.listForTenant(req.user!.id));
  } catch (err) {
    next(err);
  }
});

// pending applications on the landlord's properties
applicationsRouter.get("/landlord", requireRole("LANDLORD"), async (req: AuthedRequest, res, next) => {
  try {
    res.json(await svc.listForLandlord(req.user!.id));
  } catch (err) {
    next(err);
  }
});

// landlord approves -> creates tenancy, property RENTED, auto-rejects others
applicationsRouter.patch("/:id/approve", requireRole("LANDLORD"), async (req: AuthedRequest, res, next) => {
  try {
    const { tenantId } = await svc.approve(req.user!.id, req.params.id);
    emitToUser(tenantId, "application:approved", { applicationId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// landlord rejects
applicationsRouter.patch("/:id/reject", requireRole("LANDLORD"), async (req: AuthedRequest, res, next) => {
  try {
    const { tenantId } = await svc.reject(req.user!.id, req.params.id);
    emitToUser(tenantId, "application:rejected", { applicationId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
