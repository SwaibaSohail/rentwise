import { api } from "./api";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED";

export interface Payment {
  id: string;
  tenancyId: string;
  tenantId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripeSessionId: string;
  createdAt: string;
  paidAt: string | null;
  tenancy?: { property?: { title: string } };
  tenant?: { name: string; email: string };
}

export const paymentsApi = {
  checkout: () =>
    api.post<{ url: string }>("/api/payments/checkout").then((r) => r.data),
  confirm: (sessionId: string) =>
    api.post<Payment>("/api/payments/confirm", { sessionId }).then((r) => r.data),
  listMine: () =>
    api.get<Payment[]>("/api/payments/mine").then((r) => r.data),
  listLandlord: () =>
    api.get<Payment[]>("/api/payments/landlord").then((r) => r.data),
};
