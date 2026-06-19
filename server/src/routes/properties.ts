import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { createPropertySchema, updatePropertySchema } from "../schemas/property";
import * as svc from "../services/property";
import { SAMPLE_PROPERTIES } from "../lib/sampleProperties";

export const propertiesRouter = Router();

propertiesRouter.use(requireAuth);

// browse available (any authed user)
propertiesRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await svc.listAvailable());
  } catch (err) {
    next(err);
  }
});

// landlord's own
propertiesRouter.get("/mine", requireRole("LANDLORD"), async (req: AuthedRequest, res, next) => {
  try {
    res.json(await svc.listByLandlord(req.user!.id));
  } catch (err) {
    next(err);
  }
});

// create
propertiesRouter.post("/", requireRole("LANDLORD"), async (req: AuthedRequest, res, next) => {
  try {
    const parsed = createPropertySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "validation_error", message: parsed.error.issues[0].message });
    }
    const created = await svc.createProperty(req.user!.id, parsed.data);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// seed samples under the current landlord
propertiesRouter.post("/seed-samples", requireRole("LANDLORD"), async (req: AuthedRequest, res, next) => {
  try {
    const existing = await prisma.property.count({ where: { landlordId: req.user!.id } });
    if (existing > 0) {
      return res.status(200).json({ created: 0, message: "Already have properties" });
    }
    for (const sample of SAMPLE_PROPERTIES) {
      await svc.createProperty(req.user!.id, sample);
    }
    res.status(201).json({ created: SAMPLE_PROPERTIES.length });
  } catch (err) {
    next(err);
  }
});

// detail
propertiesRouter.get("/:id", async (req, res, next) => {
  try {
    res.json(await svc.getById(req.params.id));
  } catch (err) {
    next(err);
  }
});

// update
propertiesRouter.patch("/:id", requireRole("LANDLORD"), async (req: AuthedRequest, res, next) => {
  try {
    const parsed = updatePropertySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "validation_error", message: parsed.error.issues[0].message });
    }
    res.json(await svc.updateProperty(req.params.id, req.user!.id, parsed.data));
  } catch (err) {
    next(err);
  }
});

// status toggle
propertiesRouter.patch("/:id/status", requireRole("LANDLORD"), async (req: AuthedRequest, res, next) => {
  try {
    const status = req.body?.status;
    if (status !== "AVAILABLE" && status !== "RENTED") {
      return res.status(400).json({ error: "validation_error", message: "status must be AVAILABLE or RENTED" });
    }
    res.json(await svc.setStatus(req.params.id, req.user!.id, status));
  } catch (err) {
    next(err);
  }
});

// delete
propertiesRouter.delete("/:id", requireRole("LANDLORD"), async (req: AuthedRequest, res, next) => {
  try {
    await svc.removeProperty(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
