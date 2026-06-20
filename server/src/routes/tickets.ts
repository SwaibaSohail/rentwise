import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/requireRole";
import { createTicketSchema, addUpdateSchema } from "../schemas/ticket";
import * as svc from "../services/ticket";
import { emitToUser } from "../socket";

export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);

ticketsRouter.post("/", requireRole("TENANT"), async (req: AuthedRequest, res, next) => {
  try {
    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "validation_error", message: parsed.error.issues[0].message });
    const ticket = await svc.createTicket(req.user!.id, parsed.data);
    emitToUser((ticket as any).property.landlordId, "ticket:new", ticket);
    res.status(201).json(ticket);
  } catch (err) { next(err); }
});

ticketsRouter.get("/mine", requireRole("TENANT"), async (req: AuthedRequest, res, next) => {
  try { res.json(await svc.listForTenant(req.user!.id)); } catch (err) { next(err); }
});

ticketsRouter.get("/landlord", requireRole("LANDLORD"), async (req: AuthedRequest, res, next) => {
  try { res.json(await svc.listForLandlord(req.user!.id)); } catch (err) { next(err); }
});

ticketsRouter.get("/:id", async (req: AuthedRequest, res, next) => {
  try { res.json(await svc.getById(req.params.id, req.user!)); } catch (err) { next(err); }
});

ticketsRouter.post("/:id/updates", async (req: AuthedRequest, res, next) => {
  try {
    const parsed = addUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "validation_error", message: parsed.error.issues[0].message });
    const { update, status, landlordId, tenantId } = await svc.addUpdate(req.params.id, req.user!, parsed.data);
    const other = req.user!.id === landlordId ? tenantId : landlordId;
    emitToUser(other, "ticket:update", { ticketId: req.params.id, update, status });
    res.status(201).json({ update, status });
  } catch (err) { next(err); }
});
