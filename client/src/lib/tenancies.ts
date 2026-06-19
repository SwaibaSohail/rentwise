import { api } from "./api";
import type { Property } from "./properties";

export interface Tenancy {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string | null;
  status: "ACTIVE" | "ENDED";
  property?: Property;
  tenant?: { id: string; name: string; email: string };
}

export const tenanciesApi = {
  assign: (propertyId: string, tenantEmail: string) =>
    api.post<Tenancy>("/api/tenancies", { propertyId, tenantEmail }).then((r) => r.data),
  listMine: () => api.get<Tenancy[]>("/api/tenancies/mine").then((r) => r.data),
  active: () => api.get<Tenancy | null>("/api/tenancies/active").then((r) => r.data),
  end: (id: string) => api.patch<Tenancy>(`/api/tenancies/${id}/end`).then((r) => r.data),
};
