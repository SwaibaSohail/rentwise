import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/firebase", () => ({ getVerifiedUid: vi.fn() }));
vi.mock("../lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), create: vi.fn() } },
}));

import { getVerifiedUid } from "../lib/firebase";
import { prisma } from "../lib/prisma";
import { createApp } from "../app";

describe("POST /api/auth/register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401 without a valid token", async () => {
    (getVerifiedUid as any).mockResolvedValue(null);
    const res = await request(createApp())
      .post("/api/auth/register")
      .send({ name: "Sam", role: "TENANT" });
    expect(res.status).toBe(401);
  });

  it("400 on invalid role", async () => {
    (getVerifiedUid as any).mockResolvedValue({ uid: "abc", email: "a@b.com" });
    const res = await request(createApp())
      .post("/api/auth/register")
      .set("Authorization", "Bearer x")
      .send({ name: "Sam", role: "WIZARD" });
    expect(res.status).toBe(400);
  });

  it("creates a user and returns 201", async () => {
    (getVerifiedUid as any).mockResolvedValue({ uid: "abc", email: "a@b.com" });
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({
      id: "u1", firebaseUid: "abc", email: "a@b.com", name: "Sam", role: "TENANT",
    });
    const res = await request(createApp())
      .post("/api/auth/register")
      .set("Authorization", "Bearer x")
      .send({ name: "Sam", role: "TENANT" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: "u1", role: "TENANT" });
  });

  it("is idempotent — returns existing user with 200", async () => {
    (getVerifiedUid as any).mockResolvedValue({ uid: "abc", email: "a@b.com" });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "u1", firebaseUid: "abc", email: "a@b.com", name: "Sam", role: "TENANT",
    });
    const res = await request(createApp())
      .post("/api/auth/register")
      .set("Authorization", "Bearer x")
      .send({ name: "Sam", role: "TENANT" });
    expect(res.status).toBe(200);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
