import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatCard from "../components/StatCard";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Properties" value={5} />);
    expect(screen.getByText("Properties")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders sub text when provided", () => {
    render(<StatCard label="Occupancy" value="75%" sub="3 of 4 rented" />);
    expect(screen.getByText("Occupancy")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("3 of 4 rented")).toBeInTheDocument();
  });

  it("does not render sub when not provided", () => {
    const { container } = render(<StatCard label="Open tickets" value={2} />);
    // only 2 p elements: label and value
    const paras = container.querySelectorAll("p");
    expect(paras).toHaveLength(2);
  });
});
