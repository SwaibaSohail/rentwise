import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma", () => ({
  prisma: {
    property: { findUnique: vi.fn(), update: vi.fn() },
    tenancy: { findFirst: vi.fn(), create: vi.fn() },
    application: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}));

import { prisma } from "../lib/prisma";
import * as svc from "../services/application";
import { ForbiddenError, ConflictError } from "../lib/errors";

const AVAILABLE_PROPERTY = { id: "p1", landlordId: "L1", status: "AVAILABLE" };
const RENTED_PROPERTY = { id: "p2", landlordId: "L1", status: "RENTED" };
const APP = { id: "app1", propertyId: "p1", tenantId: "T1", status: "PENDING", property: AVAILABLE_PROPERTY };

beforeEach(() => vi.clearAllMocks());

describe("application service - apply", () => {
  it("409 when property is not AVAILABLE", async () => {
    (prisma.property.findUnique as any).mockResolvedValue(RENTED_PROPERTY);
    await expect(svc.apply("T1", "p2")).rejects.toBeInstanceOf(ConflictError);
  });

  it("409 when tenant already has an active tenancy", async () => {
    (prisma.property.findUnique as any).mockResolvedValue(AVAILABLE_PROPERTY);
    (prisma.tenancy.findFirst as any).mockResolvedValue({ id: "ten1", status: "ACTIVE" });
    await expect(svc.apply("T1", "p1")).rejects.toBeInstanceOf(ConflictError);
  });

  it("409 when tenant already has a PENDING application", async () => {
    (prisma.property.findUnique as any).mockResolvedValue(AVAILABLE_PROPERTY);
    (prisma.tenancy.findFirst as any).mockResolvedValue(null);
    (prisma.application.findUnique as any).mockResolvedValue({ id: "app1", status: "PENDING" });
    await expect(svc.apply("T1", "p1")).rejects.toBeInstanceOf(ConflictError);
  });

  it("upserts with PENDING status on happy path", async () => {
    (prisma.property.findUnique as any).mockResolvedValue(AVAILABLE_PROPERTY);
    (prisma.tenancy.findFirst as any).mockResolvedValue(null);
    (prisma.application.findUnique as any).mockResolvedValue(null);
    (prisma.application.upsert as any).mockResolvedValue({ id: "app1", status: "PENDING", property: AVAILABLE_PROPERTY, tenant: { id: "T1" } });
    const result = await svc.apply("T1", "p1");
    expect(prisma.application.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { propertyId_tenantId: { propertyId: "p1", tenantId: "T1" } },
        update: { status: "PENDING" },
        create: { propertyId: "p1", tenantId: "T1", status: "PENDING" },
      })
    );
    expect(result).toMatchObject({ id: "app1", status: "PENDING" });
  });
});

describe("application service - approve", () => {
  it("403 when landlord does not own the property", async () => {
    (prisma.application.findUnique as any).mockResolvedValue({
      ...APP,
      property: { ...AVAILABLE_PROPERTY, landlordId: "OTHER" },
    });
    await expect(svc.approve("L1", "app1")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("creates tenancy, sets property RENTED, and rejects other pending apps", async () => {
    (prisma.application.findUnique as any).mockResolvedValue(APP);
    (prisma.tenancy.findFirst as any)
      .mockResolvedValueOnce(null) // property-active check
      .mockResolvedValueOnce(null); // tenant-active check
    (prisma.tenancy.create as any).mockResolvedValue({ id: "ten1", status: "ACTIVE" });
    (prisma.property.update as any).mockResolvedValue({});
    (prisma.application.update as any).mockResolvedValue({ ...APP, status: "APPROVED" });
    (prisma.application.updateMany as any).mockResolvedValue({ count: 2 });

    const result = await svc.approve("L1", "app1");

    expect(prisma.tenancy.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ propertyId: "p1", tenantId: "T1", status: "ACTIVE" }),
      })
    );
    expect(prisma.property.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { status: "RENTED" } });
    expect(prisma.application.update).toHaveBeenCalledWith({ where: { id: "app1" }, data: { status: "APPROVED" } });
    expect(prisma.application.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ propertyId: "p1", status: "PENDING", NOT: { id: "app1" } }),
        data: { status: "REJECTED" },
      })
    );
    expect(result.tenancy).toMatchObject({ id: "ten1" });
    expect(result.tenantId).toBe("T1");
  });
});

describe("application service - reject", () => {
  it("rejects the application and returns tenantId", async () => {
    (prisma.application.findUnique as any).mockResolvedValue(APP);
    (prisma.application.update as any).mockResolvedValue({ ...APP, status: "REJECTED" });
    const result = await svc.reject("L1", "app1");
    expect(prisma.application.update).toHaveBeenCalledWith({ where: { id: "app1" }, data: { status: "REJECTED" } });
    expect(result.tenantId).toBe("T1");
    expect(result.application).toMatchObject({ status: "REJECTED" });
  });
});
