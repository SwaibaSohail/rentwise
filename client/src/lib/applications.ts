import { api } from "./api";
import type { Property } from "./properties";

export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";
export interface Application {
  id: string;
  propertyId: string;
  tenantId: string;
  status: ApplicationStatus;
  createdAt: string;
  property?: Property;
  tenant?: { id: string; name: string; email: string };
}

export const applicationsApi = {
  apply: (propertyId: string) =>
    api.post<Application>("/api/applications", { propertyId }).then((r) => r.data),
  listMine: () =>
    api.get<Application[]>("/api/applications/mine").then((r) => r.data),
  listLandlord: () =>
    api.get<Application[]>("/api/applications/landlord").then((r) => r.data),
  approve: (id: string) =>
    api.patch(`/api/applications/${id}/approve`).then((r) => r.data),
  reject: (id: string) =>
    api.patch(`/api/applications/${id}/reject`).then((r) => r.data),
};
