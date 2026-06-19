import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "T1", name: "Tom", role: "TENANT" }, logout: vi.fn() }),
}));
vi.mock("../lib/properties", () => ({
  propertiesApi: { listAvailable: vi.fn() },
}));

import { propertiesApi } from "../lib/properties";
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
    (propertiesApi.listAvailable as any).mockResolvedValue([
      { id: "p1", landlordId: "L1", title: "Modern Loft", description: "d", address: "a",
        city: "Ikeja", rentAmount: 800, bedrooms: 1, bathrooms: 1, status: "AVAILABLE",
        imageUrls: [], createdAt: "2026-01-01" },
    ]);
    renderPage();
    await waitFor(() => expect(screen.getByText("Modern Loft")).toBeInTheDocument());
  });

  it("shows an empty state when nothing is available", async () => {
    (propertiesApi.listAvailable as any).mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(screen.getByText(/no properties available/i)).toBeInTheDocument());
  });
});
