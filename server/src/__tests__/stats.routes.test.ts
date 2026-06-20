import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/firebase", () => ({ getVerifiedUid: vi.fn() }));
vi.mock("../lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    property: { count: vi.fn() },
    tenancy: { count: vi.fn(), findFirst: vi.fn() },
    maintenanceTicket: { groupBy: vi.fn(), count: vi.fn() },
  },
}));

import { getVerifiedUid } from "../lib/firebase";
import { prisma } from "../lib/prisma";
import { createApp } from "../app";

const LANDLORD = { id: "L1", role: "LANDLORD", firebaseUid: "fl", email: "l@x.com", name: "L" };
const TENANT = { id: "T1", role: "TENANT", firebaseUid: "ft", email: "t@x.com", name: "T" };

function asUser(u: typeof LANDLORD) {
  (getVerifiedUid as any).mockResolvedValue({ uid: u.firebaseUid, email: u.email });
  (prisma.user.findUnique as any).mockResolvedValue(u);
}

describe("stats routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /api/stats/landlord returns 403 for tenant", async () => {
    asUser(TENANT);
    const res = await request(createApp())
      .get("/api/stats/landlord")
      .set("Authorization", "Bearer x");
    expect(res.status).toBe(403);
  });

  it("GET /api/stats/landlord returns 200 for landlord", async () => {
    asUser(LANDLORD);
    // Promise.all: property.count x3, tenancy.count x1, maintenanceTicket.groupBy x1
    (prisma.property.count as any)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2);
    (prisma.tenancy.count as any).mockResolvedValueOnce(2);
    (prisma.maintenanceTicket.groupBy as any).mockResolvedValueOnce([]);

    const res = await request(createApp())
      .get("/api/stats/landlord")
      .set("Authorization", "Bearer x");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalProperties: 4, occupancyRate: 50 });
  });

  it("GET /api/stats/tenant returns 200 for tenant", async () => {
    asUser(TENANT);
    (prisma.tenancy.findFirst as any).mockResolvedValueOnce(null);
    (prisma.maintenanceTicket.count as any)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const res = await request(createApp())
      .get("/api/stats/tenant")
      .set("Authorization", "Bearer x");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ hasHome: false, home: null });
  });

  it("GET /api/stats/tenant returns 403 for landlord", async () => {
    asUser(LANDLORD);
    const res = await request(createApp())
      .get("/api/stats/tenant")
      .set("Authorization", "Bearer x");
    expect(res.status).toBe(403);
  });
});
