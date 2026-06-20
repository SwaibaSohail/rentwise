import { api } from "./api";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketCategory = "PLUMBING" | "ELECTRICAL" | "APPLIANCE" | "STRUCTURAL" | "OTHER";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface TicketUpdate {
  id: string; ticketId: string; authorId: string; message: string;
  newStatus: TicketStatus | null; createdAt: string;
  author?: { id: string; name: string; role: string };
}
export interface Ticket {
  id: string; propertyId: string; tenantId: string; title: string; description: string;
  category: TicketCategory; priority: TicketPriority; status: TicketStatus;
  createdAt: string; updatedAt: string;
  property?: { id: string; title: string };
  tenant?: { id: string; name: string; email: string };
  updates?: TicketUpdate[];
}
export interface CreateTicketInput {
  title: string; description: string; category: TicketCategory; priority: TicketPriority;
}

export const ticketsApi = {
  create: (d: CreateTicketInput) => api.post<Ticket>("/api/tickets", d).then((r) => r.data),
  listMine: () => api.get<Ticket[]>("/api/tickets/mine").then((r) => r.data),
  listLandlord: () => api.get<Ticket[]>("/api/tickets/landlord").then((r) => r.data),
  get: (id: string) => api.get<Ticket>(`/api/tickets/${id}`).then((r) => r.data),
  addUpdate: (id: string, d: { message?: string; newStatus?: TicketStatus }) =>
    api.post(`/api/tickets/${id}/updates`, d).then((r) => r.data),
};
