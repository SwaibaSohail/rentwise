import { api } from "./api";

export interface Property {
  id: string;
  landlordId: string;
  title: string;
  description: string;
  address: string;
  city: string;
  rentAmount: number;
  bedrooms: number;
  bathrooms: number;
  status: "AVAILABLE" | "RENTED";
  imageUrls: string[];
  createdAt: string;
}

export interface PropertyInput {
  title: string;
  description: string;
  address: string;
  city: string;
  rentAmount: number;
  bedrooms: number;
  bathrooms: number;
  imageUrls: string[];
}

export const propertiesApi = {
  listAvailable: () => api.get<Property[]>("/api/properties").then((r) => r.data),
  listMine: () => api.get<Property[]>("/api/properties/mine").then((r) => r.data),
  create: (data: PropertyInput) => api.post<Property>("/api/properties", data).then((r) => r.data),
  update: (id: string, data: Partial<PropertyInput>) =>
    api.patch<Property>(`/api/properties/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/properties/${id}`).then(() => id),
  setStatus: (id: string, status: Property["status"]) =>
    api.patch<Property>(`/api/properties/${id}/status`, { status }).then((r) => r.data),
  seedSamples: () => api.post("/api/properties/seed-samples").then((r) => r.data),
};
