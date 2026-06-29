import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { startSchema, messageSchema } from "../schemas/chat";
import * as svc from "../services/chat";
import { emitToUser } from "../socket";

export const chatRouter = Router();
chatRouter.use(requireAuth);

chatRouter.post("/", async (req: AuthedRequest, res, next) => {
  try {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "validation_error", message: parsed.error.issues[0].message });
    const conv = await svc.getOrCreateConversation(req.user!.id, req.user!.role, parsed.data.withUserId);
    res.status(201).json(conv);
  } catch (err) { next(err); }
});

chatRouter.get("/", async (req: AuthedRequest, res, next) => {
  try { res.json(await svc.listConversations(req.user!.id)); } catch (err) { next(err); }
});

chatRouter.get("/:id/messages", async (req: AuthedRequest, res, next) => {
  try { res.json(await svc.listMessages(req.params.id, req.user!.id)); } catch (err) { next(err); }
});

chatRouter.post("/:id/messages", async (req: AuthedRequest, res, next) => {
  try {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "validation_error", message: parsed.error.issues[0].message });
    const { message, recipientId } = await svc.sendMessage(req.params.id, req.user!.id, parsed.data.body);
    emitToUser(recipientId, "message:new", message);
    res.status(201).json(message);
  } catch (err) { next(err); }
});
