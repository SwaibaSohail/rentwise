import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PropertyForm from "../components/PropertyForm";

vi.mock("../lib/uploads", () => ({
  uploadsApi: {
    image: vi.fn().mockResolvedValue({ url: "https://res.cloudinary.com/x/img.jpg" }),
  },
}));

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

  it("uploads a selected file and includes the url in submitted imageUrls", async () => {
    const { uploadsApi } = await import("../lib/uploads");
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<PropertyForm onSubmit={onSubmit} />);

    // Fill required fields
    await userEvent.type(screen.getByLabelText(/title/i), "Beach House");
    await userEvent.type(screen.getByLabelText(/description/i), "Nice");
    await userEvent.type(screen.getByLabelText(/address/i), "2 Ave");
    await userEvent.type(screen.getByLabelText(/city/i), "Abuja");
    await userEvent.type(screen.getByLabelText(/rent/i), "800");
    await userEvent.type(screen.getByLabelText(/bedrooms/i), "3");
    await userEvent.type(screen.getByLabelText(/bathrooms/i), "2");

    // Upload a file
    const fileInput = screen.getByLabelText(/property image/i);
    const file = new File(["dummy"], "x.png", { type: "image/png" });
    await userEvent.upload(fileInput, file);

    // Wait for upload to complete (uploadsApi.image resolves)
    await waitFor(() => expect(uploadsApi.image).toHaveBeenCalledWith(file));

    // Submit
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrls: ["https://res.cloudinary.com/x/img.jpg"],
        })
      )
    );
  });
});
