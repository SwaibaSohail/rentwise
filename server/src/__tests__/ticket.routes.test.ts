import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/firebase", () => ({ getVerifiedUid: vi.fn() }));
vi.mock("../lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    tenancy: { findFirst: vi.fn() },
    maintenanceTicket: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ticketUpdate: { create: vi.fn() },
  },
}));
vi.mock("../socket", () => ({ emitToUser: vi.fn() }));

import { getVerifiedUid } from "../lib/firebase";
import { prisma } from "../lib/prisma";
import { emitToUser } from "../socket";
import { createApp } from "../app";

const LANDLORD = { id: "L1", role: "LANDLORD", firebaseUid: "fl", email: "l@x.com", name: "L" };
const TENANT = { id: "T1", role: "TENANT", firebaseUid: "ft", email: "t@x.com", name: "T" };

function asUser(u: typeof LANDLORD) {
  (getVerifiedUid as any).mockResolvedValue({ uid: u.firebaseUid, email: u.email });
  (prisma.user.findUnique as any).mockResolvedValue(u);
}

const mockProperty = { id: "P1", landlordId: "L1", title: "Flat 1" };
const mockTicket = {
  id: "TK1",
  tenantId: "T1",
  propertyId: "P1",
  property: mockProperty,
  title: "Leaky tap",
  description: "Dripping",
  category: "PLUMBING",
  priority: "HIGH",
  status: "OPEN",
};

describe("ticket routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST /api/tickets - tenant creates ticket (201, emitToUser called)", async () => {
    asUser(TENANT);
    (prisma.tenancy.findFirst as any).mockResolvedValue({ id: "ten1", propertyId: "P1" });
    (prisma.maintenanceTicket.create as any).mockResolvedValue(mockTicket);

    const res = await request(createApp())
      .post("/api/tickets")
      .set("Authorization", "Bearer x")
      .send({ title: "Leaky tap", description: "Dripping", category: "PLUMBING", priority: "HIGH" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: "TK1" });
    expect(emitToUser).toHaveBeenCalledWith("L1", "ticket:new", expect.objectContaining({ id: "TK1" }));
  });

  it("POST /api/tickets - landlord gets 403", async () => {
    asUser(LANDLORD);
    const res = await request(createApp())
      .post("/api/tickets")
      .set("Authorization", "Bearer x")
      .send({ title: "Leaky tap", description: "Dripping", category: "PLUMBING", priority: "HIGH" });

    expect(res.status).toBe(403);
  });

  it("POST /api/tickets - validation error returns 400", async () => {
    asUser(TENANT);
    const res = await request(createApp())
      .post("/api/tickets")
      .set("Authorization", "Bearer x")
      .send({ title: "", description: "Dripping", category: "PLUMBING", priority: "HIGH" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("GET /api/tickets/mine - tenant gets their tickets", async () => {
    asUser(TENANT);
    (prisma.maintenanceTicket.findMany as any).mockResolvedValue([mockTicket]);

    const res = await request(createApp())
      .get("/api/tickets/mine")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("GET /api/tickets/landlord - landlord gets all tickets", async () => {
    asUser(LANDLORD);
    (prisma.maintenanceTicket.findMany as any).mockResolvedValue([mockTicket]);

    const res = await request(createApp())
      .get("/api/tickets/landlord")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("POST /api/tickets - tenant with no active tenancy gets 409", async () => {
    asUser(TENANT);
    (prisma.tenancy.findFirst as any).mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/tickets")
      .set("Authorization", "Bearer x")
      .send({ title: "Leaky tap", description: "Dripping", category: "PLUMBING", priority: "HIGH" });

    expect(res.status).toBe(409);
  });

  it("POST /api/tickets/:id/updates - landlord can change status (201)", async () => {
    asUser(LANDLORD);
    (prisma.maintenanceTicket.findUnique as any).mockResolvedValue(mockTicket);
    (prisma.ticketUpdate.create as any).mockResolvedValue({ id: "u1", newStatus: "IN_PROGRESS" });
    (prisma.maintenanceTicket.update as any).mockResolvedValue({ ...mockTicket, status: "IN_PROGRESS" });

    const res = await request(createApp())
      .post("/api/tickets/TK1/updates")
      .set("Authorization", "Bearer x")
      .send({ newStatus: "IN_PROGRESS" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("IN_PROGRESS");
    expect(emitToUser).toHaveBeenCalledWith("T1", "ticket:update", expect.objectContaining({ ticketId: "TK1" }));
  });
});
