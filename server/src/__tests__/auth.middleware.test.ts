import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../lib/firebase", () => ({
  getVerifiedUid: vi.fn(),
}));
vi.mock("../lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import { getVerifiedUid } from "../lib/firebase";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

function appWith() {
  const app = express();
  app.get("/protected", requireAuth, (req, res) => {
    res.json({ user: (req as any).user });
  });
  return app;
}

describe("requireAuth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 when no token", async () => {
    (getVerifiedUid as any).mockResolvedValue(null);
    const res = await request(appWith()).get("/protected");
    expect(res.status).toBe(401);
  });

  it("404 when token valid but no user row", async () => {
    (getVerifiedUid as any).mockResolvedValue({ uid: "abc", email: "a@b.com" });
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const res = await request(appWith()).get("/protected").set("Authorization", "Bearer x");
    expect(res.status).toBe(404);
  });

  it("attaches user (incl. name) and calls next when valid", async () => {
    (getVerifiedUid as any).mockResolvedValue({ uid: "abc", email: "a@b.com" });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "u1", role: "LANDLORD", firebaseUid: "abc", email: "a@b.com", name: "Sam Landlord",
    });
    const res = await request(appWith()).get("/protected").set("Authorization", "Bearer x");
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: "u1", role: "LANDLORD", name: "Sam Landlord" });
  });
});
