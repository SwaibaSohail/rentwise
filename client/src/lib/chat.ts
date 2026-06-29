import { api } from "./api";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  other: { id: string; name: string };
  lastMessage: Message | null;
}

export const chatApi = {
  start: (withUserId: string) =>
    api.post("/api/conversations", { withUserId }).then((r) => r.data),
  list: () =>
    api.get<ConversationSummary[]>("/api/conversations").then((r) => r.data),
  messages: (id: string) =>
    api.get<Message[]>(`/api/conversations/${id}/messages`).then((r) => r.data),
  send: (id: string, body: string) =>
    api.post<Message>(`/api/conversations/${id}/messages`, { body }).then((r) => r.data),
};
