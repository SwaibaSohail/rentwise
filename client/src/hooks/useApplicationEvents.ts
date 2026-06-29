import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSocket } from "../lib/socket";

export function useApplicationEvents() {
  const qc = useQueryClient();
  useEffect(() => {
    let active = true;
    let cleanup = () => {};
    getSocket().then((sock) => {
      if (!active || !sock) return;
      const onNew = () => {
        qc.invalidateQueries({ queryKey: ["applications"] });
        qc.invalidateQueries({ queryKey: ["stats"] });
        toast("New application received");
      };
      const onApproved = () => {
        qc.invalidateQueries({ queryKey: ["applications"] });
        qc.invalidateQueries({ queryKey: ["tenancies"] });
        qc.invalidateQueries({ queryKey: ["properties"] });
        qc.invalidateQueries({ queryKey: ["stats"] });
        toast("Your application was approved!");
      };
      const onRejected = () => {
        qc.invalidateQueries({ queryKey: ["applications"] });
        qc.invalidateQueries({ queryKey: ["tenancies"] });
        qc.invalidateQueries({ queryKey: ["properties"] });
        qc.invalidateQueries({ queryKey: ["stats"] });
        toast("Your application was rejected.");
      };
      sock.on("application:new", onNew);
      sock.on("application:approved", onApproved);
      sock.on("application:rejected", onRejected);
      cleanup = () => {
        sock.off("application:new", onNew);
        sock.off("application:approved", onApproved);
        sock.off("application:rejected", onRejected);
      };
    });
    return () => {
      active = false;
      cleanup();
    };
  }, [qc]);
}
