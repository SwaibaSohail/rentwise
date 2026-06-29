import { prisma } from "../lib/prisma";
import { ForbiddenError, NotFoundError, ConflictError } from "../lib/errors";

export async function apply(tenantId: string, propertyId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new NotFoundError("Property not found");
  if (property.status !== "AVAILABLE") throw new ConflictError("Property is not available");

  const activeTenancy = await prisma.tenancy.findFirst({ where: { tenantId, status: "ACTIVE" } });
  if (activeTenancy) throw new ConflictError("You already have an active tenancy");

  const existing = await prisma.application.findUnique({
    where: { propertyId_tenantId: { propertyId, tenantId } },
  });
  if (existing && existing.status === "PENDING") throw new ConflictError("You already applied to this property");

  return prisma.application.upsert({
    where: { propertyId_tenantId: { propertyId, tenantId } },
    update: { status: "PENDING" },
    create: { propertyId, tenantId, status: "PENDING" },
    include: { property: true, tenant: true },
  });
}

export function listForTenant(tenantId: string) {
  return prisma.application.findMany({ where: { tenantId }, include: { property: true }, orderBy: { createdAt: "desc" } });
}

export function listForLandlord(landlordId: string) {
  return prisma.application.findMany({
    where: { status: "PENDING", property: { landlordId } },
    include: { property: true, tenant: true },
    orderBy: { createdAt: "desc" },
  });
}

async function ownedApp(appId: string, landlordId: string) {
  const app = await prisma.application.findUnique({ where: { id: appId }, include: { property: true } });
  if (!app) throw new NotFoundError("Application not found");
  if (app.property.landlordId !== landlordId) throw new ForbiddenError("Not your property");
  return app;
}

export async function approve(landlordId: string, appId: string) {
  const app = await ownedApp(appId, landlordId);
  if (app.status !== "PENDING") throw new ConflictError("Application is not pending");

  const propActive = await prisma.tenancy.findFirst({ where: { propertyId: app.propertyId, status: "ACTIVE" } });
  if (propActive) throw new ConflictError("Property already has an active tenant");
  const tenantActive = await prisma.tenancy.findFirst({ where: { tenantId: app.tenantId, status: "ACTIVE" } });
  if (tenantActive) throw new ConflictError("Tenant already has an active tenancy");

  const tenancy = await prisma.tenancy.create({
    data: { propertyId: app.propertyId, tenantId: app.tenantId, startDate: new Date(), status: "ACTIVE" },
  });
  await prisma.property.update({ where: { id: app.propertyId }, data: { status: "RENTED" } });
  const application = await prisma.application.update({ where: { id: appId }, data: { status: "APPROVED" } });
  // capture the other pending applicants before auto-rejecting them, so the route can notify them
  const siblings = await prisma.application.findMany({
    where: { propertyId: app.propertyId, status: "PENDING", NOT: { id: appId } },
    select: { tenantId: true },
  });
  await prisma.application.updateMany({
    where: { propertyId: app.propertyId, status: "PENDING", NOT: { id: appId } },
    data: { status: "REJECTED" },
  });
  return { application, tenancy, tenantId: app.tenantId, rejectedTenantIds: siblings.map((x) => x.tenantId) };
}

export async function reject(landlordId: string, appId: string) {
  const app = await ownedApp(appId, landlordId);
  if (app.status !== "PENDING") throw new ConflictError("Application is not pending");
  const application = await prisma.application.update({ where: { id: appId }, data: { status: "REJECTED" } });
  return { application, tenantId: app.tenantId };
}
