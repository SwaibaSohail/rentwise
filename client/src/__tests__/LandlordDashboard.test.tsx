import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "L1", name: "Lara", role: "LANDLORD" }, logout: vi.fn() }),
}));
vi.mock("../lib/properties", () => ({
  propertiesApi: {
    listMine: vi.fn(),
    seedSamples: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock("../lib/tenancies", () => ({
  tenanciesApi: { listMine: vi.fn(), assign: vi.fn(), end: vi.fn() },
}));

import { propertiesApi } from "../lib/properties";
import { tenanciesApi } from "../lib/tenancies";
import LandlordDashboard from "../pages/LandlordDashboard";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LandlordDashboard />
    </QueryClientProvider>
  );
}

const PROP = {
  id: "p1", landlordId: "L1", title: "Sunny Flat", description: "d", address: "a",
  city: "Lagos", rentAmount: 1200, bedrooms: 2, bathrooms: 1, status: "AVAILABLE",
  imageUrls: [], createdAt: "2026-01-01",
};

describe("LandlordDashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows Load sample properties when empty", async () => {
    (propertiesApi.listMine as any).mockResolvedValue([]);
    (tenanciesApi.listMine as any).mockResolvedValue([]);
    renderPage();
    await waitFor(
      () => expect(screen.getByRole("button", { name: /load sample properties/i })).toBeInTheDocument(),
      { timeout: 5000 }
    );
  });

  it("renders the landlord's properties with an Assign tenant action when available", async () => {
    (propertiesApi.listMine as any).mockResolvedValue([PROP]);
    (tenanciesApi.listMine as any).mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText("Sunny Flat")).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByRole("button", { name: /assign tenant/i })).toBeInTheDocument();
  });

  it("shows the tenant name + End tenancy when rented", async () => {
    (propertiesApi.listMine as any).mockResolvedValue([{ ...PROP, status: "RENTED" }]);
    (tenanciesApi.listMine as any).mockResolvedValue([
      { id: "ten1", propertyId: "p1", tenantId: "T1", startDate: "2026-01-01", endDate: null, status: "ACTIVE",
        tenant: { id: "T1", name: "Tariq Tenant", email: "t@x.com" } },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText(/Tariq Tenant/)).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByRole("button", { name: /end tenancy/i })).toBeInTheDocument();
  });
});
