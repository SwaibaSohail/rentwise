import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Prevent real Firebase init
vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  firebaseApp: {},
}));

import TicketForm from "../components/TicketForm";

describe("TicketForm", () => {
  it("calls onSubmit with typed values and defaults for category/priority", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TicketForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/title/i), "Leaking pipe");
    await userEvent.type(screen.getByLabelText(/description/i), "Pipe under sink is leaking");

    await userEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "Leaking pipe",
      description: "Pipe under sink is leaking",
      category: "OTHER",
      priority: "MEDIUM",
    });
  });

  it("calls onSubmit with selected category and priority", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TicketForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/title/i), "No hot water");
    await userEvent.type(screen.getByLabelText(/description/i), "Boiler is broken");
    await userEvent.selectOptions(screen.getByLabelText(/category/i), "PLUMBING");
    await userEvent.selectOptions(screen.getByLabelText(/priority/i), "HIGH");

    await userEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "No hot water",
      description: "Boiler is broken",
      category: "PLUMBING",
      priority: "HIGH",
    });
  });

  it("shows an error when onSubmit rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("No active tenancy"));
    render(<TicketForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/title/i), "Bad tile");
    await userEvent.type(screen.getByLabelText(/description/i), "Cracked floor tile");
    await userEvent.click(screen.getByRole("button", { name: /submit ticket/i }));

    expect(await screen.findByText(/no active tenancy/i)).toBeInTheDocument();
  });
});
