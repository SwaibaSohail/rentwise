import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";

function renderWithAuth(authValue: unknown, initialPath = "/secret") {
  vi.doMock("../context/AuthContext", () => ({ useAuth: () => authValue }));
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/secret" element={<ProtectedRoute><p>secret</p></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>
  );
}

vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));
import { useAuth } from "../context/AuthContext";

describe("ProtectedRoute", () => {
  it("redirects to /login when unauthenticated", () => {
    (useAuth as any).mockReturnValue({ user: null, loading: false });
    renderWithAuth({ user: null, loading: false });
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    (useAuth as any).mockReturnValue({ user: { id: "u1", role: "TENANT" }, loading: false });
    renderWithAuth({ user: { id: "u1", role: "TENANT" }, loading: false });
    expect(screen.getByText("secret")).toBeInTheDocument();
  });

  it("redirects when role not allowed", () => {
    (useAuth as any).mockReturnValue({ user: { id: "u1", role: "TENANT" }, loading: false });
    render(
      <MemoryRouter initialEntries={["/secret"]}>
        <Routes>
          <Route path="/login" element={<p>login page</p>} />
          <Route path="/secret" element={<ProtectedRoute role="LANDLORD"><p>secret</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("login page")).toBeInTheDocument();
  });
});
