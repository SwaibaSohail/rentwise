import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/firebase", () => ({ getVerifiedUid: vi.fn() }));
vi.mock("../lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock("../socket", () => ({ emitToUser: vi.fn() }));
vi.mock("../services/application", () => ({
  apply: vi.fn(),
  listForTenant: vi.fn(),
  listForLandlord: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
}));

import { getVerifiedUid } from "../lib/firebase";
import { prisma } from "../lib/prisma";
import * as svc from "../services/application";
import { emitToUser } from "../socket";
import { createApp } from "../app";

const LANDLORD = { id: "L1", role: "LANDLORD", firebaseUid: "fl", email: "l@x.com", name: "L" };
const TENANT = { id: "T1", role: "TENANT", firebaseUid: "ft", email: "t@x.com", name: "T" };

function asUser(u: typeof LANDLORD | typeof TENANT | null) {
  (getVerifiedUid as any).mockResolvedValue(u ? { uid: u.firebaseUid, email: u.email } : null);
  (prisma.user.findUnique as any).mockResolvedValue(u);
}

describe("application routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tenant POST /api/applications -> 201 and emits to landlord", async () => {
    asUser(TENANT);
    (svc.apply as any).mockResolvedValue({ id: "a1", property: { landlordId: "L9" } });
    const res = await request(createApp()).post("/api/applications").set("Authorization", "Bearer x").send({ propertyId: "p1" });
    expect(res.status).toBe(201);
    expect(svc.apply).toHaveBeenCalledWith("T1", "p1");
    expect(emitToUser).toHaveBeenCalledWith("L9", "application:new", expect.objectContaining({ id: "a1" }));
  });

  it("landlord POST /api/applications -> 403", async () => {
    asUser(LANDLORD);
    const res = await request(createApp()).post("/api/applications").set("Authorization", "Bearer x").send({ propertyId: "p1" });
    expect(res.status).toBe(403);
  });

  it("POST with no propertyId -> 400", async () => {
    asUser(TENANT);
    const res = await request(createApp()).post("/api/applications").set("Authorization", "Bearer x").send({});
    expect(res.status).toBe(400);
  });

  it("GET /mine as tenant -> 200", async () => {
    asUser(TENANT);
    (svc.listForTenant as any).mockResolvedValue([{ id: "a1" }]);
    const res = await request(createApp()).get("/api/applications/mine").set("Authorization", "Bearer x");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "a1" }]);
  });

  it("GET /landlord as tenant -> 403", async () => {
    asUser(TENANT);
    const res = await request(createApp()).get("/api/applications/landlord").set("Authorization", "Bearer x");
    expect(res.status).toBe(403);
  });

  it("approve by landlord -> 200 and emits to tenant", async () => {
    asUser(LANDLORD);
    (svc.approve as any).mockResolvedValue({ tenantId: "T7" });
    const res = await request(createApp()).patch("/api/applications/a1/approve").set("Authorization", "Bearer x");
    expect(res.status).toBe(200);
    expect(svc.approve).toHaveBeenCalledWith("L1", "a1");
    expect(emitToUser).toHaveBeenCalledWith("T7", "application:approved", { applicationId: "a1" });
  });

  it("approve by tenant -> 403", async () => {
    asUser(TENANT);
    const res = await request(createApp()).patch("/api/applications/a1/approve").set("Authorization", "Bearer x");
    expect(res.status).toBe(403);
  });

  it("reject by landlord -> 200 and emits to tenant", async () => {
    asUser(LANDLORD);
    (svc.reject as any).mockResolvedValue({ tenantId: "T8" });
    const res = await request(createApp()).patch("/api/applications/a1/reject").set("Authorization", "Bearer x");
    expect(res.status).toBe(200);
    expect(emitToUser).toHaveBeenCalledWith("T8", "application:rejected", { applicationId: "a1" });
  });
});
