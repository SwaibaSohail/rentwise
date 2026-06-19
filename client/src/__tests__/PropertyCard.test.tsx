import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PropertyCard from "../components/PropertyCard";
import type { Property } from "../lib/properties";

const property: Property = {
  id: "p1", landlordId: "L1", title: "Sunny Flat", description: "Nice",
  address: "1 St", city: "Lagos", rentAmount: 1200, bedrooms: 2, bathrooms: 1,
  status: "AVAILABLE", imageUrls: [], createdAt: "2026-01-01",
};

describe("PropertyCard", () => {
  it("shows title, city, rent and status", () => {
    render(<PropertyCard property={property} />);
    expect(screen.getByText("Sunny Flat")).toBeInTheDocument();
    expect(screen.getByText(/Lagos/)).toBeInTheDocument();
    expect(screen.getByText(/1,?200/)).toBeInTheDocument();
    expect(screen.getByText(/available/i)).toBeInTheDocument();
  });
});
