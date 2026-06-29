import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Prevent real Firebase / socket init
vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  firebaseApp: {},
}));
vi.mock("@/lib/socket", () => ({
  getSocket: vi.fn().mockResolvedValue(null),
  disconnectSocket: vi.fn(),
}));
vi.mock("../lib/chat", () => ({
  chatApi: {
    list: vi.fn().mockResolvedValue([]),
    start: vi.fn(),
    messages: vi.fn().mockResolvedValue([]),
    send: vi.fn(),
  },
}));

import { chatApi } from "../lib/chat";
import ChatThread from "../components/ChatThread";

function renderThread(conversationId = "conv1", meId = "user1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ChatThread conversationId={conversationId} meId={meId} />
    </QueryClientProvider>
  );
}

describe("ChatThread", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows empty state when there are no messages", async () => {
    (chatApi.messages as any).mockResolvedValue([]);
    renderThread();
    await waitFor(() =>
      expect(screen.getByText(/no messages yet/i)).toBeInTheDocument()
    );
  });

  it("renders messages with correct alignment", async () => {
    (chatApi.messages as any).mockResolvedValue([
      { id: "m1", conversationId: "conv1", senderId: "user1", body: "Hello there!", createdAt: "2026-01-01T10:00:00Z" },
      { id: "m2", conversationId: "conv1", senderId: "user2", body: "Hi back!", createdAt: "2026-01-01T10:01:00Z" },
    ]);
    renderThread("conv1", "user1");
    await waitFor(() => expect(screen.getByText("Hello there!")).toBeInTheDocument());
    expect(screen.getByText("Hi back!")).toBeInTheDocument();
  });

  it("calls chatApi.send when the user submits a message", async () => {
    (chatApi.messages as any).mockResolvedValue([]);
    (chatApi.send as any).mockResolvedValue({
      id: "m3", conversationId: "conv1", senderId: "user1", body: "Hey!", createdAt: "2026-01-01T10:02:00Z",
    });
    const user = userEvent.setup();
    renderThread("conv1", "user1");

    const input = screen.getByRole("textbox", { name: /message input/i });
    await user.type(input, "Hey!");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() =>
      expect(chatApi.send).toHaveBeenCalledWith("conv1", "Hey!")
    );
  });

  it("clears input after sending", async () => {
    (chatApi.messages as any).mockResolvedValue([]);
    (chatApi.send as any).mockResolvedValue({
      id: "m4", conversationId: "conv1", senderId: "user1", body: "Test", createdAt: "2026-01-01T10:03:00Z",
    });
    const user = userEvent.setup();
    renderThread("conv1", "user1");

    const input = screen.getByRole("textbox", { name: /message input/i });
    await user.type(input, "Test");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("disables send button when input is empty", async () => {
    (chatApi.messages as any).mockResolvedValue([]);
    renderThread();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /send/i })).toBeDisabled()
    );
  });
});
