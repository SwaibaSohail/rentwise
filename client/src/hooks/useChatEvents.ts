import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSocket } from "../lib/socket";

export function useChatEvents() {
  const qc = useQueryClient();
  useEffect(() => {
    let active = true;
    let cleanup = () => {};
    getSocket().then((sock) => {
      if (!active || !sock) return;
      const onMessage = () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
        qc.invalidateQueries({ queryKey: ["messages"] });
        toast("New message");
      };
      sock.on("message:new", onMessage);
      cleanup = () => {
        sock.off("message:new", onMessage);
      };
    });
    return () => {
      active = false;
      cleanup();
    };
  }, [qc]);
}
