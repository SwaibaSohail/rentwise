import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma", () => ({
  prisma: {
    property: { count: vi.fn() },
    tenancy: { count: vi.fn(), findFirst: vi.fn() },
    maintenanceTicket: { groupBy: vi.fn(), count: vi.fn() },
  },
}));

import { prisma } from "../lib/prisma";
import { landlordStats, tenantStats } from "../services/stats";

describe("landlordStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns correct occupancyRate when total=4, rented=2 → 50%", async () => {
    // Promise.all order: total, available, rented, activeTenancies, ticketGroups
    (prisma.property.count as any)
      .mockResolvedValueOnce(4)   // total
      .mockResolvedValueOnce(2)   // available
      .mockResolvedValueOnce(2);  // rented
    (prisma.tenancy.count as any).mockResolvedValueOnce(2); // activeTenancies
    (prisma.maintenanceTicket.groupBy as any).mockResolvedValueOnce([]);

    const result = await landlordStats("L1");
    expect(result.totalProperties).toBe(4);
    expect(result.available).toBe(2);
    expect(result.rented).toBe(2);
    expect(result.occupancyRate).toBe(50);
    expect(result.activeTenancies).toBe(2);
  });

  it("returns occupancyRate=0 when total=0", async () => {
    (prisma.property.count as any)
      .mockResolvedValueOnce(0)  // total
      .mockResolvedValueOnce(0)  // available
      .mockResolvedValueOnce(0); // rented
    (prisma.tenancy.count as any).mockResolvedValueOnce(0);
    (prisma.maintenanceTicket.groupBy as any).mockResolvedValueOnce([]);

    const result = await landlordStats("L1");
    expect(result.occupancyRate).toBe(0);
  });

  it("maps groupBy rows to ticket breakdown correctly", async () => {
    (prisma.property.count as any)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);
    (prisma.tenancy.count as any).mockResolvedValueOnce(2);
    (prisma.maintenanceTicket.groupBy as any).mockResolvedValueOnce([
      { status: "OPEN", _count: { _all: 3 } },
      { status: "RESOLVED", _count: { _all: 1 } },
    ]);

    const result = await landlordStats("L1");
    expect(result.tickets.open).toBe(3);
    expect(result.tickets.resolved).toBe(1);
    expect(result.tickets.inProgress).toBe(0);
    expect(result.tickets.closed).toBe(0);
  });
});

describe("tenantStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns hasHome=true and home fields when tenancy exists", async () => {
    const mockTenancy = {
      id: "ten1",
      property: { title: "Flat 1", city: "London", rentAmount: 1200 },
    };
    (prisma.tenancy.findFirst as any).mockResolvedValueOnce(mockTenancy);
    (prisma.maintenanceTicket.count as any)
      .mockResolvedValueOnce(2)  // openTickets
      .mockResolvedValueOnce(5); // totalTickets

    const result = await tenantStats("T1");
    expect(result.hasHome).toBe(true);
    expect(result.home).toEqual({ title: "Flat 1", city: "London", rentAmount: 1200 });
    expect(result.openTickets).toBe(2);
    expect(result.totalTickets).toBe(5);
  });

  it("returns hasHome=false and home=null when no tenancy", async () => {
    (prisma.tenancy.findFirst as any).mockResolvedValueOnce(null);
    (prisma.maintenanceTicket.count as any)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const result = await tenantStats("T1");
    expect(result.hasHome).toBe(false);
    expect(result.home).toBeNull();
    expect(result.openTickets).toBe(0);
    expect(result.totalTickets).toBe(0);
  });
});
