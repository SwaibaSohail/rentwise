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
    setStatus: vi.fn(),
  },
}));

import { propertiesApi } from "../lib/properties";
import LandlordDashboard from "../pages/LandlordDashboard";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LandlordDashboard />
    </QueryClientProvider>
  );
}

describe("LandlordDashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows Load sample properties when empty", async () => {
    (propertiesApi.listMine as any).mockResolvedValue([]);
    renderPage();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /load sample properties/i })).toBeInTheDocument()
    );
  });

  it("renders the landlord's properties", async () => {
    (propertiesApi.listMine as any).mockResolvedValue([
      { id: "p1", landlordId: "L1", title: "Sunny Flat", description: "d", address: "a",
        city: "Lagos", rentAmount: 1200, bedrooms: 2, bathrooms: 1, status: "AVAILABLE",
        imageUrls: [], createdAt: "2026-01-01" },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText("Sunny Flat")).toBeInTheDocument());
  });
});
