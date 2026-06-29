import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "T1", name: "Tom", role: "TENANT" }, logout: vi.fn() }),
}));
vi.mock("../lib/properties", () => ({
  propertiesApi: {
    listAvailable: vi.fn().mockResolvedValue([]),
    listMine: vi.fn().mockResolvedValue([]),
    seedSamples: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock("../lib/tenancies", () => ({
  tenanciesApi: {
    active: vi.fn(),
    listMine: vi.fn().mockResolvedValue([]),
    assign: vi.fn(),
    end: vi.fn(),
  },
}));
vi.mock("../lib/tickets", () => ({
  ticketsApi: { listMine: vi.fn().mockResolvedValue([]), listLandlord: vi.fn().mockResolvedValue([]), create: vi.fn(), addUpdate: vi.fn() },
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
vi.mock("../lib/payments", () => ({
  paymentsApi: {
    checkout: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/test" }),
    confirm: vi.fn().mockResolvedValue({
      id: "pay1", tenancyId: "ten1", tenantId: "T1", amount: 100000, currency: "usd",
      status: "PAID", stripeSessionId: "cs_test_123", createdAt: "2026-01-01T00:00:00Z", paidAt: "2026-01-01T00:01:00Z",
      tenancy: { property: { title: "Sunny Flat" } },
    }),
    listMine: vi.fn().mockResolvedValue([]),
    listLandlord: vi.fn().mockResolvedValue([
      {
        id: "pay2", tenancyId: "ten2", tenantId: "T2", amount: 150000, currency: "usd",
        status: "PAID", stripeSessionId: "cs_test_456", createdAt: "2026-01-02T00:00:00Z", paidAt: "2026-01-02T00:01:00Z",
        tenancy: { property: { title: "City Studio" } },
        tenant: { name: "Tariq Tenant", email: "tariq@example.com" },
      },
    ]),
  },
}));

import { paymentsApi } from "../lib/payments";
import { tenanciesApi } from "../lib/tenancies";
import { propertiesApi } from "../lib/properties";
import TenantDashboard from "../pages/TenantDashboard";
import LandlordDashboard from "../pages/LandlordDashboard";

const ACTIVE_TENANCY = {
  id: "ten1", propertyId: "p9", tenantId: "T1", startDate: "2026-01-01", endDate: null, status: "ACTIVE",
  property: {
    id: "p9", landlordId: "L1", title: "My Rented Place", description: "d", address: "a",
    city: "Lagos", rentAmount: 1000, bedrooms: 2, bathrooms: 1, status: "RENTED",
    imageUrls: [], createdAt: "2026-01-01",
  },
};

function renderTenant() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <TenantDashboard />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

function renderLandlord() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <LandlordDashboard />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

describe("Payments — Tenant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows 'Pay rent' button when tenant has an active tenancy", async () => {
    (tenanciesApi.active as any).mockResolvedValue(ACTIVE_TENANCY);
    renderTenant();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /pay rent/i })).toBeInTheDocument()
    );
  });

  it("calls paymentsApi.checkout when the Pay rent button is clicked", async () => {
    (tenanciesApi.active as any).mockResolvedValue(ACTIVE_TENANCY);
    renderTenant();
    const btn = await screen.findByRole("button", { name: /pay rent/i });
    fireEvent.click(btn);
    await waitFor(() => expect(paymentsApi.checkout).toHaveBeenCalledTimes(1));
  });

  it("does not show the Pay rent button when there is no active tenancy", async () => {
    (tenanciesApi.active as any).mockResolvedValue(null);
    renderTenant();
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /pay rent/i })).not.toBeInTheDocument()
    );
  });
});

describe("Payments — Landlord received list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (propertiesApi.listMine as any).mockResolvedValue([]);
  });

  it("shows received payment with tenant name, property, and amount", async () => {
    renderLandlord();
    await waitFor(() =>
      expect(screen.getByText("Tariq Tenant")).toBeInTheDocument()
    );
    expect(screen.getByText("City Studio")).toBeInTheDocument();
    expect(screen.getByText("$1,500")).toBeInTheDocument();
  });
});
