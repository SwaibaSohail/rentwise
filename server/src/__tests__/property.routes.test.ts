import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/firebase", () => ({ getVerifiedUid: vi.fn() }));
vi.mock("../lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    property: {
      create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(),
      update: vi.fn(), delete: vi.fn(), count: vi.fn(),
    },
  },
}));

import { getVerifiedUid } from "../lib/firebase";
import { prisma } from "../lib/prisma";
import { createApp } from "../app";

const LANDLORD = { id: "L1", role: "LANDLORD", firebaseUid: "fl", email: "l@x.com", name: "L" };
const TENANT = { id: "T1", role: "TENANT", firebaseUid: "ft", email: "t@x.com", name: "T" };
const body = {
  title: "Flat", description: "Nice", address: "1 St", city: "Lagos",
  rentAmount: 1000, bedrooms: 2, bathrooms: 1, imageUrls: [],
};

function asUser(u: typeof LANDLORD | null) {
  (getVerifiedUid as any).mockResolvedValue(u ? { uid: u.firebaseUid, email: u.email } : null);
  (prisma.user.findUnique as any).mockResolvedValue(u);
}

describe("property routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /api/properties returns AVAILABLE for any authed user", async () => {
    asUser(TENANT);
    (prisma.property.findMany as any).mockResolvedValue([{ id: "p1" }]);
    const res = await request(createApp()).get("/api/properties").set("Authorization", "Bearer x");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "p1" }]);
    expect(prisma.property.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: "AVAILABLE" } }));
  });

  it("POST /api/properties forbidden for tenant (403)", async () => {
    asUser(TENANT);
    const res = await request(createApp()).post("/api/properties").set("Authorization", "Bearer x").send(body);
    expect(res.status).toBe(403);
  });

  it("POST /api/properties creates for landlord (201)", async () => {
    asUser(LANDLORD);
    (prisma.property.create as any).mockResolvedValue({ id: "p1", ...body, landlordId: "L1" });
    const res = await request(createApp()).post("/api/properties").set("Authorization", "Bearer x").send(body);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: "p1", landlordId: "L1" });
  });

  it("POST /api/properties validation error (400)", async () => {
    asUser(LANDLORD);
    const res = await request(createApp()).post("/api/properties").set("Authorization", "Bearer x").send({ title: "" });
    expect(res.status).toBe(400);
  });

  it("GET /api/properties/mine returns landlord list", async () => {
    asUser(LANDLORD);
    (prisma.property.findMany as any).mockResolvedValue([{ id: "p1", landlordId: "L1" }]);
    const res = await request(createApp()).get("/api/properties/mine").set("Authorization", "Bearer x");
    expect(res.status).toBe(200);
    expect(prisma.property.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { landlordId: "L1" } }));
  });

  it("PATCH /api/properties/:id 403 when not owner", async () => {
    asUser(LANDLORD);
    (prisma.property.findUnique as any).mockResolvedValue({ id: "p1", landlordId: "OTHER" });
    const res = await request(createApp()).patch("/api/properties/p1").set("Authorization", "Bearer x").send({ title: "z" });
    expect(res.status).toBe(403);
  });

  it("DELETE /api/properties/:id 204 for owner", async () => {
    asUser(LANDLORD);
    (prisma.property.findUnique as any).mockResolvedValue({ id: "p1", landlordId: "L1" });
    (prisma.property.delete as any).mockResolvedValue({ id: "p1" });
    const res = await request(createApp()).delete("/api/properties/p1").set("Authorization", "Bearer x");
    expect(res.status).toBe(204);
  });

  it("POST /api/properties/seed-samples creates when landlord has none", async () => {
    asUser(LANDLORD);
    (prisma.property.count as any).mockResolvedValue(0);
    (prisma.property.create as any).mockResolvedValue({ id: "p" });
    const res = await request(createApp()).post("/api/properties/seed-samples").set("Authorization", "Bearer x");
    expect(res.status).toBe(201);
    expect((prisma.property.create as any).mock.calls.length).toBeGreaterThan(0);
  });

  it("POST /api/properties/seed-samples no-op (200) when landlord already has some", async () => {
    asUser(LANDLORD);
    (prisma.property.count as any).mockResolvedValue(3);
    const res = await request(createApp()).post("/api/properties/seed-samples").set("Authorization", "Bearer x");
    expect(res.status).toBe(200);
    expect(prisma.property.create).not.toHaveBeenCalled();
  });
});
