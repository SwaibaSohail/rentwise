import { Router } from "express";
import { getVerifiedUid } from "../lib/firebase";
import { prisma } from "../lib/prisma";
import { registerSchema } from "../schemas/auth";
import { requireAuth, type AuthedRequest } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/register", async (req, res, next) => {
  try {
    const verified = await getVerifiedUid(req.headers.authorization);
    if (!verified) {
      return res.status(401).json({ error: "unauthorized", message: "Missing or invalid token" });
    }
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "validation_error", message: parsed.error.issues[0].message });
    }
    const existing = await prisma.user.findUnique({ where: { firebaseUid: verified.uid } });
    if (existing) return res.status(200).json(existing);

    const user = await prisma.user.create({
      data: {
        firebaseUid: verified.uid,
        email: verified.email ?? "",
        name: parsed.data.name,
        role: parsed.data.role,
      },
    });
    return res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json(req.user);
});
