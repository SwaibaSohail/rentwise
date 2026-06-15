import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";
import { QueryProvider } from "../providers/QueryProvider";

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));

describe("App", () => {
  it("renders the RentWise heading", () => {
    render(
      <QueryProvider>
        <App />
      </QueryProvider>
    );
    expect(
      screen.getByRole("heading", { name: /rentwise/i })
    ).toBeInTheDocument();
  });
});
