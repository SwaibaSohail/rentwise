import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSocket } from "../lib/socket";
import type { Ticket } from "../lib/tickets";

export function useTicketEvents() {
  const qc = useQueryClient();
  useEffect(() => {
    let active = true;
    let cleanup = () => {};
    getSocket().then((sock) => {
      if (!active || !sock) return;
      const onNew = (t: Ticket) => { qc.invalidateQueries({ queryKey: ["tickets"] }); qc.invalidateQueries({ queryKey: ["stats"] }); toast(`New ticket: ${t.title}`); };
      const onUpd = () => { qc.invalidateQueries({ queryKey: ["tickets"] }); qc.invalidateQueries({ queryKey: ["stats"] }); toast("A ticket was updated"); };
      sock.on("ticket:new", onNew);
      sock.on("ticket:update", onUpd);
      cleanup = () => { sock.off("ticket:new", onNew); sock.off("ticket:update", onUpd); };
    });
    return () => { active = false; cleanup(); };
  }, [qc]);
}
