import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Tenant dashboard mocks ──────────────────────────────────────────────────
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "T1", name: "Tom", role: "TENANT" }, logout: vi.fn() }),
}));
vi.mock("../lib/properties", () => ({
  propertiesApi: { listAvailable: vi.fn(), listMine: vi.fn() },
}));
vi.mock("../lib/tenancies", () => ({
  tenanciesApi: { active: vi.fn(), listMine: vi.fn(), assign: vi.fn(), end: vi.fn() },
}));
vi.mock("../lib/tickets", () => ({
  ticketsApi: {
    listMine: vi.fn().mockResolvedValue([]),
    listLandlord: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    addUpdate: vi.fn(),
  },
}));
vi.mock("../hooks/useTicketEvents", () => ({ useTicketEvents: () => {} }));
vi.mock("../hooks/useApplicationEvents", () => ({ useApplicationEvents: () => {} }));
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
vi.mock("../lib/applications", () => ({
  applicationsApi: {
    listMine: vi.fn().mockResolvedValue([]),
    listLandlord: vi.fn().mockResolvedValue([]),
    apply: vi.fn().mockResolvedValue({ id: "app1", propertyId: "p1", tenantId: "T1", status: "PENDING", createdAt: "2026-01-01" }),
    approve: vi.fn().mockResolvedValue({ ok: true }),
    reject: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

import { propertiesApi } from "../lib/properties";
import { tenanciesApi } from "../lib/tenancies";
import { applicationsApi } from "../lib/applications";
import TenantDashboard from "../pages/TenantDashboard";
import LandlordDashboard from "../pages/LandlordDashboard";

const AVAILABLE_PROP = {
  id: "p1", landlordId: "L1", title: "Sunny Flat", description: "Nice place",
  address: "1 Main St", city: "Lagos", rentAmount: 1200, bedrooms: 2, bathrooms: 1,
  status: "AVAILABLE" as const, imageUrls: [], createdAt: "2026-01-01",
};

function renderTenant() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TenantDashboard />
    </QueryClientProvider>
  );
}

function renderLandlord() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LandlordDashboard />
    </QueryClientProvider>
  );
}

describe("Applications — Tenant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows Apply button on an available property when tenant has no home", async () => {
    (tenanciesApi.active as any).mockResolvedValue(null);
    (propertiesApi.listAvailable as any).mockResolvedValue([AVAILABLE_PROP]);
    (applicationsApi.listMine as any).mockResolvedValue([]);
    renderTenant();
    await waitFor(
      () => expect(screen.getByRole("button", { name: /apply/i })).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it("shows disabled Applied button when tenant already applied to a property", async () => {
    (tenanciesApi.active as any).mockResolvedValue(null);
    (propertiesApi.listAvailable as any).mockResolvedValue([AVAILABLE_PROP]);
    (applicationsApi.listMine as any).mockResolvedValue([
      { id: "app1", propertyId: "p1", tenantId: "T1", status: "PENDING", createdAt: "2026-01-01",
        property: AVAILABLE_PROP },
    ]);
    renderTenant();
    await waitFor(
      () => expect(screen.getByRole("button", { name: /applied/i })).toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(screen.getByRole("button", { name: /applied/i })).toBeDisabled();
  });

  it("hides Apply button when tenant already has an active tenancy", async () => {
    (tenanciesApi.active as any).mockResolvedValue({
      id: "ten1", propertyId: "p9", tenantId: "T1", startDate: "2026-01-01", endDate: null,
      status: "ACTIVE",
      property: { id: "p9", landlordId: "L1", title: "My Home", description: "d", address: "a",
        city: "Lagos", rentAmount: 1000, bedrooms: 2, bathrooms: 1, status: "RENTED" as const,
        imageUrls: [], createdAt: "2026-01-01" },
    });
    (propertiesApi.listAvailable as any).mockResolvedValue([AVAILABLE_PROP]);
    (applicationsApi.listMine as any).mockResolvedValue([]);
    renderTenant();
    await waitFor(
      () => expect(screen.getByText("Your home")).toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(screen.queryByRole("button", { name: /^apply$/i })).not.toBeInTheDocument();
  });

  it("shows My applications list when tenant has applications", async () => {
    (tenanciesApi.active as any).mockResolvedValue(null);
    (propertiesApi.listAvailable as any).mockResolvedValue([]);
    (applicationsApi.listMine as any).mockResolvedValue([
      { id: "app1", propertyId: "p1", tenantId: "T1", status: "PENDING", createdAt: "2026-01-01",
        property: AVAILABLE_PROP },
    ]);
    renderTenant();
    await waitFor(
      () => expect(screen.getByText("My applications")).toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(screen.getByText("Sunny Flat")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  it("calls applicationsApi.apply when Apply button is clicked", async () => {
    (tenanciesApi.active as any).mockResolvedValue(null);
    (propertiesApi.listAvailable as any).mockResolvedValue([AVAILABLE_PROP]);
    (applicationsApi.listMine as any).mockResolvedValue([]);
    const user = userEvent.setup();
    renderTenant();
    const applyBtn = await screen.findByRole("button", { name: /apply/i });
    await user.click(applyBtn);
    await waitFor(() =>
      expect(applicationsApi.apply).toHaveBeenCalledWith("p1")
    );
  });
});

describe("Applications — Landlord", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows pending application with Approve and Reject buttons", async () => {
    (propertiesApi.listMine as any).mockResolvedValue([]);
    (tenanciesApi.listMine as any).mockResolvedValue([]);
    (applicationsApi.listLandlord as any).mockResolvedValue([
      { id: "app1", propertyId: "p1", tenantId: "T1", status: "PENDING", createdAt: "2026-01-01",
        property: AVAILABLE_PROP,
        tenant: { id: "T1", name: "Tom Tenant", email: "tom@example.com" } },
    ]);
    renderLandlord();
    await waitFor(
      () => expect(screen.getByText("Applications")).toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(screen.getByText("Tom Tenant")).toBeInTheDocument();
    expect(screen.getByText("Sunny Flat")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });

  it("calls applicationsApi.approve when Approve is clicked", async () => {
    (propertiesApi.listMine as any).mockResolvedValue([]);
    (tenanciesApi.listMine as any).mockResolvedValue([]);
    (applicationsApi.listLandlord as any).mockResolvedValue([
      { id: "app1", propertyId: "p1", tenantId: "T1", status: "PENDING", createdAt: "2026-01-01",
        property: AVAILABLE_PROP,
        tenant: { id: "T1", name: "Tom Tenant", email: "tom@example.com" } },
    ]);
    const user = userEvent.setup();
    renderLandlord();
    const approveBtn = await screen.findByRole("button", { name: /approve/i });
    await user.click(approveBtn);
    await waitFor(() =>
      expect(applicationsApi.approve).toHaveBeenCalledWith("app1")
    );
  });

  it("calls applicationsApi.reject when Reject is clicked", async () => {
    (propertiesApi.listMine as any).mockResolvedValue([]);
    (tenanciesApi.listMine as any).mockResolvedValue([]);
    (applicationsApi.listLandlord as any).mockResolvedValue([
      { id: "app1", propertyId: "p1", tenantId: "T1", status: "PENDING", createdAt: "2026-01-01",
        property: AVAILABLE_PROP,
        tenant: { id: "T1", name: "Tom Tenant", email: "tom@example.com" } },
    ]);
    const user = userEvent.setup();
    renderLandlord();
    const rejectBtn = await screen.findByRole("button", { name: /reject/i });
    await user.click(rejectBtn);
    await waitFor(() =>
      expect(applicationsApi.reject).toHaveBeenCalledWith("app1")
    );
  });
});
