import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/firebase", () => ({ getVerifiedUid: vi.fn() }));
vi.mock("../lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    property: { findUnique: vi.fn(), update: vi.fn() },
    tenancy: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  },
}));

import { getVerifiedUid } from "../lib/firebase";
import { prisma } from "../lib/prisma";
import { createApp } from "../app";

const LANDLORD = { id: "L1", role: "LANDLORD", firebaseUid: "fl", email: "l@x.com", name: "L" };
const TENANT = { id: "T1", role: "TENANT", firebaseUid: "ft", email: "t@x.com", name: "T" };

function asUser(u: typeof LANDLORD) {
  (getVerifiedUid as any).mockResolvedValue({ uid: u.firebaseUid, email: u.email });
  (prisma.user.findUnique as any).mockImplementation((args: any) => {
    // requireAuth looks up by firebaseUid; assign looks up tenant by email
    if (args.where.firebaseUid) return Promise.resolve(u);
    if (args.where.email === TENANT.email) return Promise.resolve(TENANT);
    return Promise.resolve(null);
  });
}

describe("tenancy routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST /api/tenancies forbidden for tenant (403)", async () => {
    asUser(TENANT);
    const res = await request(createApp())
      .post("/api/tenancies").set("Authorization", "Bearer x")
      .send({ propertyId: "p1", tenantEmail: "t@x.com" });
    expect(res.status).toBe(403);
  });

  it("POST /api/tenancies validation error (400)", async () => {
    asUser(LANDLORD);
    const res = await request(createApp())
      .post("/api/tenancies").set("Authorization", "Bearer x")
      .send({ propertyId: "p1", tenantEmail: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("POST /api/tenancies assigns and returns 201", async () => {
    asUser(LANDLORD);
    (prisma.property.findUnique as any).mockResolvedValue({ id: "p1", landlordId: "L1" });
    (prisma.tenancy.findFirst as any).mockResolvedValue(null);
    (prisma.tenancy.create as any).mockResolvedValue({ id: "ten1", status: "ACTIVE" });
    (prisma.property.update as any).mockResolvedValue({});
    const res = await request(createApp())
      .post("/api/tenancies").set("Authorization", "Bearer x")
      .send({ propertyId: "p1", tenantEmail: "t@x.com" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: "ten1", status: "ACTIVE" });
  });

  it("GET /api/tenancies/active forbidden for landlord (403)", async () => {
    asUser(LANDLORD);
    const res = await request(createApp()).get("/api/tenancies/active").set("Authorization", "Bearer x");
    expect(res.status).toBe(403);
  });

  it("GET /api/tenancies/active returns tenant's tenancy", async () => {
    asUser(TENANT);
    (prisma.tenancy.findFirst as any).mockResolvedValue({ id: "ten1", property: { id: "p1", title: "Flat" } });
    const res = await request(createApp()).get("/api/tenancies/active").set("Authorization", "Bearer x");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: "ten1" });
  });
});
