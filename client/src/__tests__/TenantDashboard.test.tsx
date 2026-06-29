import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "T1", name: "Tom", role: "TENANT" }, logout: vi.fn() }),
}));
vi.mock("../lib/properties", () => ({
  propertiesApi: { listAvailable: vi.fn() },
}));
vi.mock("../lib/tenancies", () => ({
  tenanciesApi: { active: vi.fn() },
}));
vi.mock("../lib/tickets", () => ({
  ticketsApi: { listMine: vi.fn().mockResolvedValue([]), create: vi.fn() },
}));
vi.mock("../hooks/useTicketEvents", () => ({
  useTicketEvents: () => {},
}));
vi.mock("../lib/applications", () => ({
  applicationsApi: {
    listMine: vi.fn().mockResolvedValue([]),
    listLandlord: vi.fn().mockResolvedValue([]),
    apply: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  },
}));
vi.mock("../hooks/useApplicationEvents", () => ({
  useApplicationEvents: () => {},
}));
vi.mock("../lib/chat", () => ({
  chatApi: {
    list: vi.fn().mockResolvedValue([]),
    start: vi.fn(),
    messages: vi.fn().mockResolvedValue([]),
    send: vi.fn(),
  },
}));
vi.mock("../hooks/useChatEvents", () => ({
  useChatEvents: () => {},
}));
vi.mock("../lib/stats", () => ({
  statsApi: {
    landlord: vi.fn().mockResolvedValue({
      totalProperties: 0, available: 0, rented: 0, occupancyRate: 0,
      activeTenancies: 0, tickets: { open: 0, inProgress: 0, resolved: 0, closed: 0 },
    }),
    tenant: vi.fn().mockResolvedValue({ hasHome: false, home: null, openTickets: 0, totalTickets: 0 }),
  },
}));

import { propertiesApi } from "../lib/properties";
import { tenanciesApi } from "../lib/tenancies";
import TenantDashboard from "../pages/TenantDashboard";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TenantDashboard />
    </QueryClientProvider>
  );
}

describe("TenantDashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists available properties", async () => {
    (tenanciesApi.active as any).mockResolvedValue(null);
    (propertiesApi.listAvailable as any).mockResolvedValue([
      { id: "p1", landlordId: "L1", title: "Modern Loft", description: "d", address: "a",
        city: "Ikeja", rentAmount: 800, bedrooms: 1, bathrooms: 1, status: "AVAILABLE",
        imageUrls: [], createdAt: "2026-01-01" },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText("Modern Loft")).toBeInTheDocument());
  });

  it("shows an empty state when nothing is available", async () => {
    (tenanciesApi.active as any).mockResolvedValue(null);
    (propertiesApi.listAvailable as any).mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText(/no properties available/i)).toBeInTheDocument());
  });

  it("shows 'Your home' when the tenant has an active tenancy", async () => {
    (propertiesApi.listAvailable as any).mockResolvedValue([]);
    (tenanciesApi.active as any).mockResolvedValue({
      id: "ten1", propertyId: "p9", tenantId: "T1", startDate: "2026-01-01", endDate: null, status: "ACTIVE",
      property: { id: "p9", landlordId: "L1", title: "My Rented Place", description: "d", address: "a",
        city: "Lagos", rentAmount: 1000, bedrooms: 2, bathrooms: 1, status: "RENTED", imageUrls: [], createdAt: "2026-01-01" },
    });
    renderPage();
    await waitFor(() => expect(screen.getByText("Your home")).toBeInTheDocument());
    expect(screen.getByText("My Rented Place")).toBeInTheDocument();
  });
});
