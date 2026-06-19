import { prisma } from "../lib/prisma";
import { ForbiddenError, NotFoundError } from "../lib/errors";
import type { CreatePropertyInput, UpdatePropertyInput } from "../schemas/property";

export function createProperty(landlordId: string, data: CreatePropertyInput) {
  return prisma.property.create({ data: { ...data, landlordId } });
}

export function listByLandlord(landlordId: string) {
  return prisma.property.findMany({ where: { landlordId }, orderBy: { createdAt: "desc" } });
}

export function listAvailable() {
  return prisma.property.findMany({ where: { status: "AVAILABLE" }, orderBy: { createdAt: "desc" } });
}

export async function getById(id: string) {
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) throw new NotFoundError("Property not found");
  return property;
}

async function ownOrThrow(id: string, landlordId: string) {
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) throw new NotFoundError("Property not found");
  if (property.landlordId !== landlordId) throw new ForbiddenError("Not your property");
  return property;
}

export async function updateProperty(id: string, landlordId: string, data: UpdatePropertyInput) {
  await ownOrThrow(id, landlordId);
  return prisma.property.update({ where: { id }, data });
}

export async function removeProperty(id: string, landlordId: string) {
  await ownOrThrow(id, landlordId);
  return prisma.property.delete({ where: { id } });
}

export async function setStatus(id: string, landlordId: string, status: "AVAILABLE" | "RENTED") {
  await ownOrThrow(id, landlordId);
  return prisma.property.update({ where: { id }, data: { status } });
}
