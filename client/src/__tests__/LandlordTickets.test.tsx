import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "L1", name: "Lara", role: "LANDLORD" }, logout: vi.fn() }),
}));
vi.mock("../lib/properties", () => ({
  propertiesApi: {
    listMine: vi.fn().mockResolvedValue([]),
    seedSamples: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock("../lib/tenancies", () => ({
  tenanciesApi: { listMine: vi.fn().mockResolvedValue([]), assign: vi.fn(), end: vi.fn() },
}));
vi.mock("../lib/tickets", () => ({
  ticketsApi: {
    listLandlord: vi.fn(),
    addUpdate: vi.fn(),
    listMine: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
  },
}));
vi.mock("../hooks/useTicketEvents", () => ({
  useTicketEvents: () => {},
}));
vi.mock("../hooks/useApplicationEvents", () => ({
  useApplicationEvents: () => {},
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
vi.mock("../lib/stats", () => ({
  statsApi: {
    landlord: vi.fn().mockResolvedValue({
      totalProperties: 0, available: 0, rented: 0, occupancyRate: 0,
      activeTenancies: 0, tickets: { open: 0, inProgress: 0, resolved: 0, closed: 0 },
    }),
    tenant: vi.fn().mockResolvedValue({ hasHome: false, home: null, openTickets: 0, totalTickets: 0 }),
  },
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

import { ticketsApi } from "../lib/tickets";
import LandlordDashboard from "../pages/LandlordDashboard";

const TICKET = {
  id: "t1",
  propertyId: "p1",
  tenantId: "T1",
  title: "Broken boiler",
  description: "The boiler stopped working",
  category: "PLUMBING" as const,
  priority: "HIGH" as const,
  status: "OPEN" as const,
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
  property: { id: "p1", title: "Sunny Flat" },
  tenant: { id: "T1", name: "Tom Tenant", email: "tom@x.com" },
  updates: [],
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LandlordDashboard />
    </QueryClientProvider>
  );
}

describe("LandlordDashboard — Maintenance tickets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a 'no tickets' message when list is empty", async () => {
    (ticketsApi.listLandlord as any).mockResolvedValue([]);
    renderPage();
    await waitFor(
      () => expect(screen.getByText(/no maintenance tickets yet/i)).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it("renders incoming tickets with tenant + property info", async () => {
    (ticketsApi.listLandlord as any).mockResolvedValue([TICKET]);
    renderPage();
    await waitFor(
      () => expect(screen.getByText("Broken boiler")).toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(screen.getByText(/Tom Tenant/)).toBeInTheDocument();
    expect(screen.getByText(/Sunny Flat/)).toBeInTheDocument();
  });

  it("renders a status selector and comment input for each ticket", async () => {
    (ticketsApi.listLandlord as any).mockResolvedValue([TICKET]);
    renderPage();
    await waitFor(
      () => expect(screen.getByText("Broken boiler")).toBeInTheDocument(),
      { timeout: 5000 }
    );
    expect(screen.getByLabelText(/change status for broken boiler/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/comment for broken boiler/i)).toBeInTheDocument();
  });
});
