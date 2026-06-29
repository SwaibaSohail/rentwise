import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/firebase", () => ({ getVerifiedUid: vi.fn() }));
vi.mock("../lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));
vi.mock("../socket", () => ({ emitToUser: vi.fn() }));
vi.mock("../services/chat", () => ({
  getOrCreateConversation: vi.fn(),
  listConversations: vi.fn(),
  listMessages: vi.fn(),
  sendMessage: vi.fn(),
}));

import { getVerifiedUid } from "../lib/firebase";
import { prisma } from "../lib/prisma";
import { emitToUser } from "../socket";
import * as chatSvc from "../services/chat";
import { createApp } from "../app";

const LANDLORD = { id: "L1", role: "LANDLORD", firebaseUid: "fl", email: "l@x.com", name: "Landlord" };
const TENANT = { id: "T1", role: "TENANT", firebaseUid: "ft", email: "t@x.com", name: "Tenant" };

function asUser(u: typeof LANDLORD) {
  (getVerifiedUid as any).mockResolvedValue({ uid: u.firebaseUid, email: u.email });
  (prisma.user.findUnique as any).mockResolvedValue(u);
}

const mockConv = { id: "C1", landlordId: "L1", tenantId: "T1", landlord: LANDLORD, tenant: TENANT };
const mockMessage = { id: "M1", conversationId: "C1", senderId: "L1", body: "hello", createdAt: new Date().toISOString() };

describe("chat routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST /api/conversations - 201 when eligible", async () => {
    asUser(LANDLORD);
    (chatSvc.getOrCreateConversation as any).mockResolvedValue(mockConv);

    const res = await request(createApp())
      .post("/api/conversations")
      .set("Authorization", "Bearer x")
      .send({ withUserId: "T1" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: "C1" });
    expect(chatSvc.getOrCreateConversation).toHaveBeenCalledWith("L1", "LANDLORD", "T1");
  });

  it("POST /api/conversations - 400 on validation error (missing withUserId)", async () => {
    asUser(LANDLORD);

    const res = await request(createApp())
      .post("/api/conversations")
      .set("Authorization", "Bearer x")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("GET /api/conversations - 200 returns list", async () => {
    asUser(LANDLORD);
    (chatSvc.listConversations as any).mockResolvedValue([{ id: "C1", other: { id: "T1", name: "Tenant" }, lastMessage: null }]);

    const res = await request(createApp())
      .get("/api/conversations")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it("GET /api/conversations/:id/messages - 200 returns messages", async () => {
    asUser(TENANT);
    (chatSvc.listMessages as any).mockResolvedValue([mockMessage]);

    const res = await request(createApp())
      .get("/api/conversations/C1/messages")
      .set("Authorization", "Bearer x");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(chatSvc.listMessages).toHaveBeenCalledWith("C1", "T1");
  });

  it("POST /api/conversations/:id/messages - 201 + emitToUser called", async () => {
    asUser(LANDLORD);
    (chatSvc.sendMessage as any).mockResolvedValue({ message: mockMessage, recipientId: "T1" });

    const res = await request(createApp())
      .post("/api/conversations/C1/messages")
      .set("Authorization", "Bearer x")
      .send({ body: "hello" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: "M1" });
    expect(emitToUser).toHaveBeenCalledWith("T1", "message:new", mockMessage);
  });

  it("POST /api/conversations/:id/messages - 400 on validation error (empty body)", async () => {
    asUser(LANDLORD);

    const res = await request(createApp())
      .post("/api/conversations/C1/messages")
      .set("Authorization", "Bearer x")
      .send({ body: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("GET /api/conversations - 401 when unauthenticated", async () => {
    (getVerifiedUid as any).mockResolvedValue(null);

    const res = await request(createApp())
      .get("/api/conversations");

    expect(res.status).toBe(401);
  });
});
