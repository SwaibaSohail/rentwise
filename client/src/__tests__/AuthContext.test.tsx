import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const onAuthStateChanged = vi.fn();
const signInWithEmailAndPassword = vi.fn();
const createUserWithEmailAndPassword = vi.fn();
const signOut = vi.fn();

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth: unknown, cb: (u: unknown) => void) => {
    onAuthStateChanged(cb);
    cb(null); // start signed-out
    return () => {};
  },
  signInWithEmailAndPassword: (...a: unknown[]) => signInWithEmailAndPassword(...a),
  createUserWithEmailAndPassword: (...a: unknown[]) => createUserWithEmailAndPassword(...a),
  signOut: (...a: unknown[]) => signOut(...a),
}));
vi.mock("@/lib/firebase", () => ({ auth: {} }));
vi.mock("@/lib/api", () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { AuthProvider, useAuth } from "../context/AuthContext";
import { api } from "@/lib/api";

function Probe() {
  const { user, loading, login } = useAuth();
  if (loading) return <p>loading</p>;
  return (
    <div>
      <p>user: {user ? user.role : "none"}</p>
      <button onClick={() => login("a@b.com", "pw")}>login</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts signed out after auth resolves", async () => {
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText("user: none")).toBeInTheDocument());
  });

  it("login signs in via firebase then loads the profile", async () => {
    (signInWithEmailAndPassword as any).mockResolvedValue({ user: { uid: "abc" } });
    (api.get as any).mockResolvedValue({ data: { id: "u1", role: "LANDLORD" } });
    render(<AuthProvider><Probe /></AuthProvider>);
    await screen.findByText("user: none");
    await userEvent.click(screen.getByText("login"));
    expect(signInWithEmailAndPassword).toHaveBeenCalled();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/api/auth/me"));
  });
});
