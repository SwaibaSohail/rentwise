import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma", () => ({
  prisma: {
    property: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
    tenancy: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "../lib/prisma";
import * as svc from "../services/tenancy";
import { ForbiddenError, NotFoundError, ConflictError } from "../lib/errors";

const TENANT = { id: "T1", role: "TENANT", email: "t@x.com" };

describe("tenancy service - assignTenant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("404 when property missing", async () => {
    (prisma.property.findUnique as any).mockResolvedValue(null);
    await expect(svc.assignTenant("L1", "p1", "t@x.com")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("403 when property not owned", async () => {
    (prisma.property.findUnique as any).mockResolvedValue({ id: "p1", landlordId: "OTHER" });
    await expect(svc.assignTenant("L1", "p1", "t@x.com")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("404 when no tenant with that email", async () => {
    (prisma.property.findUnique as any).mockResolvedValue({ id: "p1", landlordId: "L1" });
    (prisma.user.findUnique as any).mockResolvedValue(null);
    await expect(svc.assignTenant("L1", "p1", "t@x.com")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("404 when the email belongs to a non-tenant", async () => {
    (prisma.property.findUnique as any).mockResolvedValue({ id: "p1", landlordId: "L1" });
    (prisma.user.findUnique as any).mockResolvedValue({ id: "U1", role: "LANDLORD", email: "t@x.com" });
    await expect(svc.assignTenant("L1", "p1", "t@x.com")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("409 when property already has an active tenancy", async () => {
    (prisma.property.findUnique as any).mockResolvedValue({ id: "p1", landlordId: "L1" });
    (prisma.user.findUnique as any).mockResolvedValue(TENANT);
    (prisma.tenancy.findFirst as any).mockResolvedValueOnce({ id: "existing" });
    await expect(svc.assignTenant("L1", "p1", "t@x.com")).rejects.toBeInstanceOf(ConflictError);
  });

  it("409 when tenant already has an active tenancy", async () => {
    (prisma.property.findUnique as any).mockResolvedValue({ id: "p1", landlordId: "L1" });
    (prisma.user.findUnique as any).mockResolvedValue(TENANT);
    (prisma.tenancy.findFirst as any)
      .mockResolvedValueOnce(null) // property check
      .mockResolvedValueOnce({ id: "other" }); // tenant check
    await expect(svc.assignTenant("L1", "p1", "t@x.com")).rejects.toBeInstanceOf(ConflictError);
  });

  it("creates ACTIVE tenancy and sets property RENTED", async () => {
    (prisma.property.findUnique as any).mockResolvedValue({ id: "p1", landlordId: "L1" });
    (prisma.user.findUnique as any).mockResolvedValue(TENANT);
    (prisma.tenancy.findFirst as any).mockResolvedValue(null);
    (prisma.tenancy.create as any).mockResolvedValue({ id: "ten1", status: "ACTIVE" });
    (prisma.property.update as any).mockResolvedValue({});
    const r = await svc.assignTenant("L1", "p1", "t@x.com");
    expect(r).toMatchObject({ id: "ten1", status: "ACTIVE" });
    expect(prisma.tenancy.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ propertyId: "p1", tenantId: "T1", status: "ACTIVE" }) })
    );
    expect(prisma.property.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { status: "RENTED" } });
  });
});

describe("tenancy service - endTenancy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("403 when property not owned", async () => {
    (prisma.tenancy.findUnique as any).mockResolvedValue({ id: "ten1", propertyId: "p1", property: { landlordId: "OTHER" } });
    await expect(svc.endTenancy("L1", "ten1")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("ends tenancy and sets property AVAILABLE", async () => {
    (prisma.tenancy.findUnique as any).mockResolvedValue({ id: "ten1", propertyId: "p1", property: { landlordId: "L1" } });
    (prisma.tenancy.update as any).mockResolvedValue({ id: "ten1", status: "ENDED" });
    (prisma.property.update as any).mockResolvedValue({});
    const r = await svc.endTenancy("L1", "ten1");
    expect(r).toMatchObject({ status: "ENDED" });
    expect(prisma.property.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { status: "AVAILABLE" } });
  });
});
