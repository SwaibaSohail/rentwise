import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/firebase", () => ({ getVerifiedUid: vi.fn() }));
vi.mock("../lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));
vi.mock("../socket", () => ({ emitToUser: vi.fn() }));
vi.mock("../services/payment", () => ({
  createCheckout: vi.fn(),
  confirm: vi.fn(),
  listForTenant: vi.fn(),
  listForLandlord: vi.fn(),
}));

import { getVerifiedUid } from "../lib/firebase";
import { prisma } from "../lib/prisma";
import { emitToUser } from "../socket";
import * as paymentSvc from "../services/payment";
import { createApp } from "../app";

const TENANT = { id: "T1", role: "TENANT", firebaseUid: "ft", email: "t@x.com", name: "Tenant" };
const LANDLORD = { id: "L1", role: "LANDLORD", firebaseUid: "fl", email: "l@x.com", name: "Landlord" };

function asUser(u: typeof TENANT | typeof LANDLORD) {
  (getVerifiedUid as any).mockResolvedValue({ uid: u.firebaseUid, email: u.email });
  (prisma.user.findUnique as any).mockResolvedValue(u);
}

const mockPayment = {
  id: "pay1",
  tenancyId: "ten1",
  tenantId: "T1",
  amount: 120000,
  currency: "usd",
  status: "PAID",
  stripeSessionId: "cs_test_abc",
  createdAt: new Date().toISOString(),
  paidAt: new Date().toISOString(),
};

describe("payment routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST /api/payments/checkout - tenant 200 returns url", async () => {
    asUser(TENANT);
    (paymentSvc.createCheckout as any).mockResolvedValue({ url: "https://stripe.com/pay/abc" });

    const res = await request(createApp())
      .post("/api/payments/checkout")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ url: "https://stripe.com/pay/abc" });
    expect(paymentSvc.createCheckout).toHaveBeenCalledWith("T1");
  });

  it("POST /api/payments/checkout - landlord gets 403", async () => {
    asUser(LANDLORD);

    const res = await request(createApp())
      .post("/api/payments/checkout")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(403);
  });

  it("POST /api/payments/confirm - 200 + emitToUser when becamePaid", async () => {
    asUser(TENANT);
    (paymentSvc.confirm as any).mockResolvedValue({ payment: mockPayment, landlordId: "L1", becamePaid: true });

    const res = await request(createApp())
      .post("/api/payments/confirm")
      .set("Authorization", "Bearer x")
      .send({ sessionId: "cs_test_abc" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: "pay1" });
    expect(emitToUser).toHaveBeenCalledWith("L1", "payment:received", { paymentId: "pay1", amount: 120000 });
  });

  it("POST /api/payments/confirm - 200 no emit when not becamePaid", async () => {
    asUser(TENANT);
    (paymentSvc.confirm as any).mockResolvedValue({ payment: mockPayment, landlordId: "L1", becamePaid: false });

    const res = await request(createApp())
      .post("/api/payments/confirm")
      .set("Authorization", "Bearer x")
      .send({ sessionId: "cs_test_abc" });

    expect(res.status).toBe(200);
    expect(emitToUser).not.toHaveBeenCalled();
  });

  it("POST /api/payments/confirm - 400 on missing sessionId", async () => {
    asUser(TENANT);

    const res = await request(createApp())
      .post("/api/payments/confirm")
      .set("Authorization", "Bearer x")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("GET /api/payments/mine - tenant 200 returns list", async () => {
    asUser(TENANT);
    (paymentSvc.listForTenant as any).mockResolvedValue([mockPayment]);

    const res = await request(createApp())
      .get("/api/payments/mine")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(paymentSvc.listForTenant).toHaveBeenCalledWith("T1");
  });

  it("GET /api/payments/mine - landlord gets 403", async () => {
    asUser(LANDLORD);

    const res = await request(createApp())
      .get("/api/payments/mine")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(403);
  });

  it("GET /api/payments/landlord - landlord 200 returns list", async () => {
    asUser(LANDLORD);
    (paymentSvc.listForLandlord as any).mockResolvedValue([mockPayment]);

    const res = await request(createApp())
      .get("/api/payments/landlord")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(paymentSvc.listForLandlord).toHaveBeenCalledWith("L1");
  });

  it("GET /api/payments/landlord - tenant gets 403", async () => {
    asUser(TENANT);

    const res = await request(createApp())
      .get("/api/payments/landlord")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(403);
  });

  it("POST /api/payments/checkout - 401 when unauthenticated", async () => {
    (getVerifiedUid as any).mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/payments/checkout");

    expect(res.status).toBe(401);
  });
});
