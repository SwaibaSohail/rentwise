import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma", () => ({
  prisma: {
    property: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma";
import * as svc from "../services/property";
import { ForbiddenError, NotFoundError } from "../lib/errors";

const data = {
  title: "Flat", description: "Nice", address: "1 St", city: "Lagos",
  rentAmount: 1000, bedrooms: 2, bathrooms: 1, imageUrls: [],
};

describe("property service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("create attaches landlordId", async () => {
    (prisma.property.create as any).mockResolvedValue({ id: "p1" });
    await svc.createProperty("L1", data);
    expect(prisma.property.create).toHaveBeenCalledWith({ data: { ...data, landlordId: "L1" } });
  });

  it("listAvailable filters AVAILABLE", async () => {
    (prisma.property.findMany as any).mockResolvedValue([]);
    await svc.listAvailable();
    expect(prisma.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "AVAILABLE" } })
    );
  });

  it("getById throws NotFound when missing", async () => {
    (prisma.property.findUnique as any).mockResolvedValue(null);
    await expect(svc.getById("nope")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("update throws Forbidden when not owner", async () => {
    (prisma.property.findUnique as any).mockResolvedValue({ id: "p1", landlordId: "OTHER" });
    await expect(svc.updateProperty("p1", "L1", { title: "x" })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("update succeeds for owner", async () => {
    (prisma.property.findUnique as any).mockResolvedValue({ id: "p1", landlordId: "L1" });
    (prisma.property.update as any).mockResolvedValue({ id: "p1", title: "x" });
    const r = await svc.updateProperty("p1", "L1", { title: "x" });
    expect(r).toMatchObject({ id: "p1" });
    expect(prisma.property.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { title: "x" } });
  });

  it("remove throws Forbidden when not owner", async () => {
    (prisma.property.findUnique as any).mockResolvedValue({ id: "p1", landlordId: "OTHER" });
    await expect(svc.removeProperty("p1", "L1")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("setStatus updates status for owner", async () => {
    (prisma.property.findUnique as any).mockResolvedValue({ id: "p1", landlordId: "L1" });
    (prisma.property.update as any).mockResolvedValue({ id: "p1", status: "RENTED" });
    await svc.setStatus("p1", "L1", "RENTED");
    expect(prisma.property.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { status: "RENTED" } });
  });
});
