import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const signup = vi.fn();
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ signup, user: null, loading: false }),
}));
vi.mock("react-router-dom", async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return { ...actual, useNavigate: () => vi.fn() };
});

import Signup from "../pages/Signup";

describe("Signup page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits name, email, password and selected role", async () => {
    (signup as any).mockResolvedValue(undefined);
    render(<MemoryRouter><Signup /></MemoryRouter>);

    await userEvent.type(screen.getByLabelText(/name/i), "Sam");
    await userEvent.type(screen.getByLabelText(/email/i), "a@b.com");
    await userEvent.type(screen.getByLabelText(/password/i), "secret1");
    await userEvent.click(screen.getByRole("radio", { name: /landlord/i }));
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(signup).toHaveBeenCalledWith("a@b.com", "secret1", "Sam", "LANDLORD");
  });
});
