import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { confirmSchema } from "../schemas/payment";
import * as svc from "../services/payment";
import { emitToUser } from "../socket";

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

paymentsRouter.post("/checkout", requireRole("TENANT"), async (req: AuthedRequest, res, next) => {
  try { res.json(await svc.createCheckout(req.user!.id)); } catch (err) { next(err); }
});

paymentsRouter.post("/confirm", requireRole("TENANT"), async (req: AuthedRequest, res, next) => {
  try {
    const parsed = confirmSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "validation_error", message: parsed.error.issues[0].message });
    const { payment, landlordId, becamePaid } = await svc.confirm(req.user!.id, parsed.data.sessionId);
    if (becamePaid) emitToUser(landlordId, "payment:received", { paymentId: payment.id, amount: payment.amount });
    res.json(payment);
  } catch (err) { next(err); }
});

paymentsRouter.get("/mine", requireRole("TENANT"), async (req: AuthedRequest, res, next) => {
  try { res.json(await svc.listForTenant(req.user!.id)); } catch (err) { next(err); }
});

paymentsRouter.get("/landlord", requireRole("LANDLORD"), async (req: AuthedRequest, res, next) => {
  try { res.json(await svc.listForLandlord(req.user!.id)); } catch (err) { next(err); }
});
