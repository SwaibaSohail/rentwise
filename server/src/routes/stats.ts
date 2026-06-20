import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import * as svc from "../services/stats";

export const statsRouter = Router();
statsRouter.use(requireAuth);

statsRouter.get("/landlord", requireRole("LANDLORD"), async (req: AuthedRequest, res, next) => {
  try { res.json(await svc.landlordStats(req.user!.id)); } catch (err) { next(err); }
});

statsRouter.get("/tenant", requireRole("TENANT"), async (req: AuthedRequest, res, next) => {
  try { res.json(await svc.tenantStats(req.user!.id)); } catch (err) { next(err); }
});
