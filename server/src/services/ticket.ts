import { prisma } from "../lib/prisma";
import { ForbiddenError, NotFoundError, ConflictError } from "../lib/errors";
import type { CreateTicketInput, AddUpdateInput } from "../schemas/ticket";

interface Actor { id: string; role: string }

export async function createTicket(tenantId: string, data: CreateTicketInput) {
  const tenancy = await prisma.tenancy.findFirst({ where: { tenantId, status: "ACTIVE" } });
  if (!tenancy) throw new ConflictError("You have no active tenancy to file a ticket for");
  return prisma.maintenanceTicket.create({
    data: {
      propertyId: tenancy.propertyId,
      tenantId,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
    },
    include: { property: true },
  });
}

export function listForTenant(tenantId: string) {
  return prisma.maintenanceTicket.findMany({
    where: { tenantId },
    include: { property: true, updates: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export function listForLandlord(landlordId: string) {
  return prisma.maintenanceTicket.findMany({
    where: { property: { landlordId } },
    include: { property: true, tenant: true, updates: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

async function authorize(id: string, actor: Actor) {
  const ticket = await prisma.maintenanceTicket.findUnique({ where: { id }, include: { property: true } });
  if (!ticket) throw new NotFoundError("Ticket not found");
  const isTenant = ticket.tenantId === actor.id;
  const isLandlord = ticket.property.landlordId === actor.id;
  if (!isTenant && !isLandlord) throw new ForbiddenError("Not your ticket");
  return ticket;
}

export async function getById(id: string, actor: Actor) {
  await authorize(id, actor);
  return prisma.maintenanceTicket.findUnique({
    where: { id },
    include: { property: true, tenant: true, updates: { include: { author: true }, orderBy: { createdAt: "asc" } } },
  });
}

export async function addUpdate(id: string, actor: Actor, data: AddUpdateInput) {
  const ticket = await authorize(id, actor);
  if (data.newStatus && ticket.property.landlordId !== actor.id) {
    throw new ForbiddenError("Only the landlord can change status");
  }
  const update = await prisma.ticketUpdate.create({
    data: { ticketId: id, authorId: actor.id, message: data.message ?? "", newStatus: data.newStatus ?? null },
  });
  let status = ticket.status;
  if (data.newStatus) {
    const updated = await prisma.maintenanceTicket.update({ where: { id }, data: { status: data.newStatus } });
    status = updated.status;
  }
  return { update, status, landlordId: ticket.property.landlordId, tenantId: ticket.tenantId };
}
