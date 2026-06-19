import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PropertyForm from "../components/PropertyForm";

describe("PropertyForm", () => {
  it("submits typed values via onSubmit", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PropertyForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/title/i), "My Flat");
    await userEvent.type(screen.getByLabelText(/description/i), "Cozy");
    await userEvent.type(screen.getByLabelText(/address/i), "1 St");
    await userEvent.type(screen.getByLabelText(/city/i), "Lagos");
    await userEvent.type(screen.getByLabelText(/rent/i), "1200");
    await userEvent.type(screen.getByLabelText(/bedrooms/i), "2");
    await userEvent.type(screen.getByLabelText(/bathrooms/i), "1");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "My Flat", description: "Cozy", address: "1 St", city: "Lagos",
      rentAmount: 1200, bedrooms: 2, bathrooms: 1, imageUrls: [],
    });
  });
});
