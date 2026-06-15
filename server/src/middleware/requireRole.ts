import type { NextFunction, Response } from "express";
import type { AuthedRequest } from "./auth";

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "unauthorized", message: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "forbidden", message: "Insufficient role" });
    }
    next();
  };
}
