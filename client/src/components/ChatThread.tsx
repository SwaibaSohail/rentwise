import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatApi } from "../lib/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatThreadProps {
  conversationId: string;
  meId: string;
}

export default function ChatThread({ conversationId, meId }: ChatThreadProps) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => chatApi.messages(conversationId),
  });

  const sendMut = useMutation({
    mutationFn: (text: string) => chatApi.send(conversationId, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      setBody("");
    },
  });

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    sendMut.mutate(trimmed);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto p-2">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
              msg.senderId === meId
                ? "self-end bg-primary text-primary-foreground ml-auto"
                : "self-start bg-muted"
            }`}
          >
            {msg.body}
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} className="flex gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          aria-label="Message input"
        />
        <Button type="submit" disabled={sendMut.isPending || !body.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
