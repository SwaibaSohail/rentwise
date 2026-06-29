import { prisma } from "../lib/prisma";
import { ForbiddenError, NotFoundError } from "../lib/errors";

async function shareActiveTenancy(landlordId: string, tenantId: string) {
  const t = await prisma.tenancy.findFirst({
    where: { tenantId, status: "ACTIVE", property: { landlordId } },
  });
  return !!t;
}

export async function getOrCreateConversation(meId: string, meRole: string, otherUserId: string) {
  const other = await prisma.user.findUnique({ where: { id: otherUserId } });
  if (!other) throw new NotFoundError("User not found");
  let landlordId: string, tenantId: string;
  if (meRole === "LANDLORD" && other.role === "TENANT") { landlordId = meId; tenantId = otherUserId; }
  else if (meRole === "TENANT" && other.role === "LANDLORD") { landlordId = otherUserId; tenantId = meId; }
  else throw new ForbiddenError("Chat is between a landlord and a tenant");
  if (!(await shareActiveTenancy(landlordId, tenantId))) {
    throw new ForbiddenError("You can only message someone you share an active tenancy with");
  }
  return prisma.conversation.upsert({
    where: { landlordId_tenantId: { landlordId, tenantId } },
    update: {},
    create: { landlordId, tenantId },
    include: { landlord: true, tenant: true },
  });
}

export async function listConversations(meId: string) {
  const convs = await prisma.conversation.findMany({
    where: { OR: [{ landlordId: meId }, { tenantId: meId }] },
    include: { landlord: true, tenant: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });
  return convs.map((c) => ({
    id: c.id,
    other: c.landlordId === meId
      ? { id: c.tenant.id, name: c.tenant.name }
      : { id: c.landlord.id, name: c.landlord.name },
    lastMessage: c.messages[0] ?? null,
  }));
}

async function participantConv(convId: string, meId: string) {
  const c = await prisma.conversation.findUnique({ where: { id: convId } });
  if (!c) throw new NotFoundError("Conversation not found");
  if (c.landlordId !== meId && c.tenantId !== meId) throw new ForbiddenError("Not your conversation");
  return c;
}

export async function listMessages(convId: string, meId: string) {
  await participantConv(convId, meId);
  return prisma.message.findMany({ where: { conversationId: convId }, orderBy: { createdAt: "asc" } });
}

export async function sendMessage(convId: string, meId: string, body: string) {
  const c = await participantConv(convId, meId);
  const message = await prisma.message.create({ data: { conversationId: convId, senderId: meId, body } });
  await prisma.conversation.update({ where: { id: convId }, data: { updatedAt: new Date() } });
  const recipientId = c.landlordId === meId ? c.tenantId : c.landlordId;
  return { message, recipientId };
}
