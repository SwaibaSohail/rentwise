import { prisma } from "../lib/prisma";

export async function landlordStats(landlordId: string) {
  const [total, available, rented, activeTenancies, ticketGroups] = await Promise.all([
    prisma.property.count({ where: { landlordId } }),
    prisma.property.count({ where: { landlordId, status: "AVAILABLE" } }),
    prisma.property.count({ where: { landlordId, status: "RENTED" } }),
    prisma.tenancy.count({ where: { status: "ACTIVE", property: { landlordId } } }),
    prisma.maintenanceTicket.groupBy({
      by: ["status"],
      where: { property: { landlordId } },
      _count: { _all: true },
    }),
  ]);
  const tickets = { open: 0, inProgress: 0, resolved: 0, closed: 0 };
  for (const g of ticketGroups) {
    if (g.status === "OPEN") tickets.open = g._count._all;
    else if (g.status === "IN_PROGRESS") tickets.inProgress = g._count._all;
    else if (g.status === "RESOLVED") tickets.resolved = g._count._all;
    else if (g.status === "CLOSED") tickets.closed = g._count._all;
  }
  const occupancyRate = total === 0 ? 0 : Math.round((rented / total) * 100);
  return { totalProperties: total, available, rented, occupancyRate, activeTenancies, tickets };
}

export async function tenantStats(tenantId: string) {
  const tenancy = await prisma.tenancy.findFirst({
    where: { tenantId, status: "ACTIVE" },
    include: { property: true },
  });
  const [openTickets, totalTickets] = await Promise.all([
    prisma.maintenanceTicket.count({ where: { tenantId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.maintenanceTicket.count({ where: { tenantId } }),
  ]);
  return {
    hasHome: !!tenancy,
    home: tenancy ? { title: tenancy.property.title, city: tenancy.property.city, rentAmount: tenancy.property.rentAmount } : null,
    openTickets,
    totalTickets,
  };
}
