import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
        retrieve: vi.fn(),
      },
    },
  },
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    tenancy: { findFirst: vi.fn() },
    payment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma";
import { stripe } from "../lib/stripe";
import * as svc from "../services/payment";
import { ConflictError, NotFoundError, ForbiddenError } from "../lib/errors";

const TENANT_ID = "T1";
const LANDLORD_ID = "L1";
const TENANCY_ID = "ten1";
const SESSION_ID = "cs_test_abc123";

const mockProperty = { id: "P1", title: "Nice Flat", rentAmount: 1200, landlordId: LANDLORD_ID };
const mockTenancy = { id: TENANCY_ID, tenantId: TENANT_ID, propertyId: "P1", status: "ACTIVE", property: mockProperty };
const mockPayment = {
  id: "pay1",
  tenancyId: TENANCY_ID,
  tenantId: TENANT_ID,
  amount: 120000,
  currency: "usd",
  status: "PENDING",
  stripeSessionId: SESSION_ID,
  tenancy: { ...mockTenancy, property: mockProperty },
};

describe("payment service — createCheckout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws ConflictError when no active tenancy", async () => {
    (prisma.tenancy.findFirst as any).mockResolvedValue(null);
    await expect(svc.createCheckout(TENANT_ID)).rejects.toBeInstanceOf(ConflictError);
  });

  it("calls stripe.checkout.sessions.create with unit_amount = rent*100", async () => {
    (prisma.tenancy.findFirst as any).mockResolvedValue(mockTenancy);
    (stripe.checkout.sessions.create as any).mockResolvedValue({ id: SESSION_ID, url: "https://stripe.com/pay" });
    (prisma.payment.create as any).mockResolvedValue(mockPayment);

    const result = await svc.createCheckout(TENANT_ID);

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        line_items: expect.arrayContaining([
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 120000 }),
          }),
        ]),
      })
    );
    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING", stripeSessionId: SESSION_ID }),
      })
    );
    expect(result).toEqual({ url: "https://stripe.com/pay" });
  });
});

describe("payment service — confirm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError when payment not found", async () => {
    (prisma.payment.findUnique as any).mockResolvedValue(null);
    await expect(svc.confirm(TENANT_ID, SESSION_ID)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws ForbiddenError when payment belongs to another tenant", async () => {
    (prisma.payment.findUnique as any).mockResolvedValue({ ...mockPayment, tenantId: "OTHER" });
    await expect(svc.confirm(TENANT_ID, SESSION_ID)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("session paid → updates payment to PAID, becamePaid true", async () => {
    (prisma.payment.findUnique as any).mockResolvedValue(mockPayment);
    (stripe.checkout.sessions.retrieve as any).mockResolvedValue({ payment_status: "paid" });
    const updatedPayment = { ...mockPayment, status: "PAID", paidAt: new Date() };
    (prisma.payment.update as any).mockResolvedValue(updatedPayment);

    const result = await svc.confirm(TENANT_ID, SESSION_ID);

    expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith(SESSION_ID);
    expect(prisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockPayment.id },
        data: expect.objectContaining({ status: "PAID" }),
      })
    );
    expect(result.becamePaid).toBe(true);
    expect(result.landlordId).toBe(LANDLORD_ID);
  });

  it("session unpaid → becamePaid false, no update", async () => {
    (prisma.payment.findUnique as any).mockResolvedValue(mockPayment);
    (stripe.checkout.sessions.retrieve as any).mockResolvedValue({ payment_status: "unpaid" });

    const result = await svc.confirm(TENANT_ID, SESSION_ID);

    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(result.becamePaid).toBe(false);
  });

  it("already PAID → idempotent (no retrieve or update), becamePaid false", async () => {
    (prisma.payment.findUnique as any).mockResolvedValue({ ...mockPayment, status: "PAID" });

    const result = await svc.confirm(TENANT_ID, SESSION_ID);

    expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(result.becamePaid).toBe(false);
  });
});
