import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { requireRole } from "../middleware/requireRole";

function appWith(role: string | undefined, allowed: string[]) {
  const app = express();
  app.get(
    "/landlord-only",
    (req, _res, next) => {
      if (role) (req as any).user = { id: "u1", role };
      next();
    },
    requireRole(...allowed),
    (_req, res) => res.json({ ok: true })
  );
  return app;
}

describe("requireRole", () => {
  it("401 when no user on request", async () => {
    const res = await request(appWith(undefined, ["LANDLORD"])).get("/landlord-only");
    expect(res.status).toBe(401);
  });
  it("403 when role not allowed", async () => {
    const res = await request(appWith("TENANT", ["LANDLORD"])).get("/landlord-only");
    expect(res.status).toBe(403);
  });
  it("calls next when role allowed", async () => {
    const res = await request(appWith("LANDLORD", ["LANDLORD"])).get("/landlord-only");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
