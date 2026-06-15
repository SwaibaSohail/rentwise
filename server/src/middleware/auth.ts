import type { NextFunction, Request, Response } from "express";
import { getVerifiedUid } from "../lib/firebase";
import { prisma } from "../lib/prisma";

export interface AuthedRequest extends Request {
  user?: { id: string; role: string; firebaseUid: string; email: string };
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const verified = await getVerifiedUid(req.headers.authorization);
  if (!verified) {
    return res.status(401).json({ error: "unauthorized", message: "Missing or invalid token" });
  }
  const user = await prisma.user.findUnique({ where: { firebaseUid: verified.uid } });
  if (!user) {
    return res.status(404).json({ error: "user_not_found", message: "No account; register first" });
  }
  req.user = { id: user.id, role: user.role, firebaseUid: user.firebaseUid, email: user.email };
  next();
}
