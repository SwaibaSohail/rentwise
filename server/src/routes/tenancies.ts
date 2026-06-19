import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { assignSchema } from "../schemas/tenancy";
import * as svc from "../services/tenancy";

export const tenanciesRouter = Router();

tenanciesRouter.use(requireAuth);

// landlord assigns a tenant to a property
tenanciesRouter.post("/", requireRole("LANDLORD"), async (req: AuthedRequest, res, next) => {
  try {
    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "validation_error", message: parsed.error.issues[0].message });
    }
    const tenancy = await svc.assignTenant(req.user!.id, parsed.data.propertyId, parsed.data.tenantEmail);
    res.status(201).json(tenancy);
  } catch (err) {
    next(err);
  }
});

// landlord's active tenancies (with property + tenant)
tenanciesRouter.get("/mine", requireRole("LANDLORD"), async (req: AuthedRequest, res, next) => {
  try {
    res.json(await svc.listByLandlord(req.user!.id));
  } catch (err) {
    next(err);
  }
});

// tenant's current tenancy (or null)
tenanciesRouter.get("/active", requireRole("TENANT"), async (req: AuthedRequest, res, next) => {
  try {
    res.json(await svc.getActiveForTenant(req.user!.id));
  } catch (err) {
    next(err);
  }
});

// landlord ends a tenancy
tenanciesRouter.patch("/:id/end", requireRole("LANDLORD"), async (req: AuthedRequest, res, next) => {
  try {
    res.json(await svc.endTenancy(req.user!.id, req.params.id));
  } catch (err) {
    next(err);
  }
});
