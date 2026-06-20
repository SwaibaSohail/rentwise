import { api } from "./api";

export interface LandlordStats {
  totalProperties: number; available: number; rented: number; occupancyRate: number;
  activeTenancies: number; tickets: { open: number; inProgress: number; resolved: number; closed: number };
}
export interface TenantStats {
  hasHome: boolean; home: { title: string; city: string; rentAmount: number } | null;
  openTickets: number; totalTickets: number;
}

export const statsApi = {
  landlord: () => api.get<LandlordStats>("/api/stats/landlord").then((r) => r.data),
  tenant: () => api.get<TenantStats>("/api/stats/tenant").then((r) => r.data),
};
