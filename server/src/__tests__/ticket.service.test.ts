import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma", () => ({
  prisma: {
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

import { prisma } from "../lib/prisma";
import * as svc from "../services/ticket";
import { ConflictError, ForbiddenError, NotFoundError } from "../lib/errors";

const LANDLORD_ID = "L1";
const TENANT_ID = "T1";
const PROPERTY_ID = "P1";
const TICKET_ID = "TK1";

const landlordActor = { id: LANDLORD_ID, role: "LANDLORD" };
const tenantActor = { id: TENANT_ID, role: "TENANT" };

const mockTicket = {
  id: TICKET_ID,
  tenantId: TENANT_ID,
  propertyId: PROPERTY_ID,
  property: { id: PROPERTY_ID, landlordId: LANDLORD_ID },
  title: "Leaky tap",
  description: "Dripping all night",
  category: "PLUMBING",
  priority: "HIGH",
  status: "OPEN",
};

describe("ticket service - createTicket", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates ticket using property from active tenancy", async () => {
    (prisma.tenancy.findFirst as any).mockResolvedValue({ id: "ten1", propertyId: PROPERTY_ID });
    (prisma.maintenanceTicket.create as any).mockResolvedValue({ id: TICKET_ID, propertyId: PROPERTY_ID });

    const result = await svc.createTicket(TENANT_ID, {
      title: "Leaky tap",
      description: "Dripping",
      category: "PLUMBING",
      priority: "HIGH",
    });

    expect(prisma.tenancy.findFirst).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID, status: "ACTIVE" },
    });
    expect(prisma.maintenanceTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: TENANT_ID, propertyId: PROPERTY_ID }),
      })
    );
    expect(result).toMatchObject({ id: TICKET_ID });
  });

  it("throws ConflictError when tenant has no active tenancy", async () => {
    (prisma.tenancy.findFirst as any).mockResolvedValue(null);

    await expect(
      svc.createTicket(TENANT_ID, {
        title: "Leaky tap",
        description: "Dripping",
        category: "PLUMBING",
        priority: "HIGH",
      })
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("ticket service - authorize / getById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws ForbiddenError for unrelated user", async () => {
    (prisma.maintenanceTicket.findUnique as any).mockResolvedValue(mockTicket);
    await expect(svc.getById(TICKET_ID, { id: "UNRELATED", role: "TENANT" })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows tenant to get their own ticket", async () => {
    (prisma.maintenanceTicket.findUnique as any).mockResolvedValue(mockTicket);
    await svc.getById(TICKET_ID, tenantActor);
    // second call for full include
    expect(prisma.maintenanceTicket.findUnique).toHaveBeenCalledTimes(2);
  });

  it("allows landlord to get ticket on their property", async () => {
    (prisma.maintenanceTicket.findUnique as any).mockResolvedValue(mockTicket);
    await svc.getById(TICKET_ID, landlordActor);
    expect(prisma.maintenanceTicket.findUnique).toHaveBeenCalledTimes(2);
  });
});

describe("ticket service - addUpdate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws ForbiddenError when tenant tries to change status", async () => {
    (prisma.maintenanceTicket.findUnique as any).mockResolvedValue(mockTicket);
    await expect(
      svc.addUpdate(TICKET_ID, tenantActor, { newStatus: "IN_PROGRESS" })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows landlord to change status and updates the ticket", async () => {
    (prisma.maintenanceTicket.findUnique as any).mockResolvedValue(mockTicket);
    (prisma.ticketUpdate.create as any).mockResolvedValue({ id: "u1", newStatus: "IN_PROGRESS" });
    (prisma.maintenanceTicket.update as any).mockResolvedValue({ ...mockTicket, status: "IN_PROGRESS" });

    const result = await svc.addUpdate(TICKET_ID, landlordActor, { newStatus: "IN_PROGRESS" });
    expect(prisma.maintenanceTicket.update).toHaveBeenCalledWith({
      where: { id: TICKET_ID },
      data: { status: "IN_PROGRESS" },
    });
    expect(result.status).toBe("IN_PROGRESS");
    expect(result.landlordId).toBe(LANDLORD_ID);
    expect(result.tenantId).toBe(TENANT_ID);
  });

  it("allows a message update without status change", async () => {
    (prisma.maintenanceTicket.findUnique as any).mockResolvedValue(mockTicket);
    (prisma.ticketUpdate.create as any).mockResolvedValue({ id: "u1", message: "We'll look at it" });

    const result = await svc.addUpdate(TICKET_ID, tenantActor, { message: "Please hurry" });
    expect(prisma.maintenanceTicket.update).not.toHaveBeenCalled();
    expect(result.status).toBe("OPEN");
  });
});

describe("ticket service - listForLandlord", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters tickets by property.landlordId", async () => {
    (prisma.maintenanceTicket.findMany as any).mockResolvedValue([]);
    await svc.listForLandlord(LANDLORD_ID);
    expect(prisma.maintenanceTicket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { property: { landlordId: LANDLORD_ID } },
      })
    );
  });
});
