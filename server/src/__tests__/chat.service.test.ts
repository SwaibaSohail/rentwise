import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    tenancy: { findFirst: vi.fn() },
    conversation: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma";
import * as svc from "../services/chat";
import { ForbiddenError, NotFoundError } from "../lib/errors";

const LANDLORD_ID = "L1";
const TENANT_ID = "T1";
const CONV_ID = "C1";

const mockLandlord = { id: LANDLORD_ID, role: "LANDLORD", name: "Landlord" };
const mockTenant = { id: TENANT_ID, role: "TENANT", name: "Tenant" };
const mockConv = { id: CONV_ID, landlordId: LANDLORD_ID, tenantId: TENANT_ID };

describe("chat service - getOrCreateConversation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws NotFoundError when other user does not exist", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    await expect(svc.getOrCreateConversation(LANDLORD_ID, "LANDLORD", "unknown")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws ForbiddenError when both users have same role", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: "L2", role: "LANDLORD" });
    await expect(svc.getOrCreateConversation(LANDLORD_ID, "LANDLORD", "L2")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws ForbiddenError when no shared active tenancy", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockTenant);
    (prisma.tenancy.findFirst as any).mockResolvedValue(null);
    await expect(svc.getOrCreateConversation(LANDLORD_ID, "LANDLORD", TENANT_ID)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("calls upsert when landlord and tenant share an active tenancy", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockTenant);
    (prisma.tenancy.findFirst as any).mockResolvedValue({ id: "ten1" });
    (prisma.conversation.upsert as any).mockResolvedValue({ ...mockConv, landlord: mockLandlord, tenant: mockTenant });

    const result = await svc.getOrCreateConversation(LANDLORD_ID, "LANDLORD", TENANT_ID);

    expect(prisma.conversation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { landlordId_tenantId: { landlordId: LANDLORD_ID, tenantId: TENANT_ID } },
      })
    );
    expect(result).toMatchObject({ id: CONV_ID });
  });

  it("works when tenant initiates with landlord", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(mockLandlord);
    (prisma.tenancy.findFirst as any).mockResolvedValue({ id: "ten1" });
    (prisma.conversation.upsert as any).mockResolvedValue({ ...mockConv, landlord: mockLandlord, tenant: mockTenant });

    await svc.getOrCreateConversation(TENANT_ID, "TENANT", LANDLORD_ID);

    expect(prisma.conversation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { landlordId_tenantId: { landlordId: LANDLORD_ID, tenantId: TENANT_ID } },
      })
    );
  });
});

describe("chat service - listMessages + sendMessage participant guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("listMessages throws ForbiddenError for non-participant", async () => {
    (prisma.conversation.findUnique as any).mockResolvedValue(mockConv);
    await expect(svc.listMessages(CONV_ID, "UNRELATED")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("sendMessage throws ForbiddenError for non-participant", async () => {
    (prisma.conversation.findUnique as any).mockResolvedValue(mockConv);
    await expect(svc.sendMessage(CONV_ID, "UNRELATED", "hi")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listMessages throws NotFoundError when conversation missing", async () => {
    (prisma.conversation.findUnique as any).mockResolvedValue(null);
    await expect(svc.listMessages(CONV_ID, LANDLORD_ID)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("chat service - sendMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates message and returns recipientId = the other party", async () => {
    (prisma.conversation.findUnique as any).mockResolvedValue(mockConv);
    const mockMessage = { id: "M1", conversationId: CONV_ID, senderId: LANDLORD_ID, body: "hello" };
    (prisma.message.create as any).mockResolvedValue(mockMessage);
    (prisma.conversation.update as any).mockResolvedValue(mockConv);

    const result = await svc.sendMessage(CONV_ID, LANDLORD_ID, "hello");

    expect(prisma.message.create).toHaveBeenCalledWith({
      data: { conversationId: CONV_ID, senderId: LANDLORD_ID, body: "hello" },
    });
    expect(result.message).toMatchObject({ id: "M1" });
    expect(result.recipientId).toBe(TENANT_ID);
  });

  it("recipientId is landlord when tenant sends", async () => {
    (prisma.conversation.findUnique as any).mockResolvedValue(mockConv);
    const mockMessage = { id: "M2", conversationId: CONV_ID, senderId: TENANT_ID, body: "hey" };
    (prisma.message.create as any).mockResolvedValue(mockMessage);
    (prisma.conversation.update as any).mockResolvedValue(mockConv);

    const result = await svc.sendMessage(CONV_ID, TENANT_ID, "hey");
    expect(result.recipientId).toBe(LANDLORD_ID);
  });
});
