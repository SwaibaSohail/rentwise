import { prisma } from "../lib/prisma";
import { ForbiddenError, NotFoundError, ConflictError } from "../lib/errors";

export async function assignTenant(landlordId: string, propertyId: string, tenantEmail: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new NotFoundError("Property not found");
  if (property.landlordId !== landlordId) throw new ForbiddenError("Not your property");

  const tenant = await prisma.user.findUnique({ where: { email: tenantEmail } });
  if (!tenant || tenant.role !== "TENANT") throw new NotFoundError("No tenant account with that email");

  const propertyActive = await prisma.tenancy.findFirst({ where: { propertyId, status: "ACTIVE" } });
  if (propertyActive) throw new ConflictError("Property already has an active tenant");

  const tenantActive = await prisma.tenancy.findFirst({ where: { tenantId: tenant.id, status: "ACTIVE" } });
  if (tenantActive) throw new ConflictError("That tenant already has an active tenancy");

  const tenancy = await prisma.tenancy.create({
    data: { propertyId, tenantId: tenant.id, startDate: new Date(), status: "ACTIVE" },
  });
  await prisma.property.update({ where: { id: propertyId }, data: { status: "RENTED" } });
  return tenancy;
}

export async function endTenancy(landlordId: string, tenancyId: string) {
  const tenancy = await prisma.tenancy.findUnique({
    where: { id: tenancyId },
    include: { property: true },
  });
  if (!tenancy) throw new NotFoundError("Tenancy not found");
  if (tenancy.property.landlordId !== landlordId) throw new ForbiddenError("Not your property");

  const updated = await prisma.tenancy.update({
    where: { id: tenancyId },
    data: { status: "ENDED", endDate: new Date() },
  });
  await prisma.property.update({ where: { id: tenancy.propertyId }, data: { status: "AVAILABLE" } });
  return updated;
}

export function listByLandlord(landlordId: string) {
  return prisma.tenancy.findMany({
    where: { property: { landlordId }, status: "ACTIVE" },
    include: { property: true, tenant: true },
  });
}

export function getActiveForTenant(tenantId: string) {
  return prisma.tenancy.findFirst({
    where: { tenantId, status: "ACTIVE" },
    include: { property: true },
  });
}
