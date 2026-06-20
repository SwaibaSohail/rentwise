import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { Ticket, TicketStatus } from "../lib/tickets";

const STATUS_VARIANT: Record<TicketStatus, "default" | "secondary" | "outline" | "destructive"> = {
  OPEN: "default",
  IN_PROGRESS: "secondary",
  RESOLVED: "outline",
  CLOSED: "outline",
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

interface TicketListProps {
  tickets: Ticket[];
  actions?: (ticket: Ticket) => ReactNode;
}

export default function TicketList({ tickets, actions }: TicketListProps) {
  if (tickets.length === 0) {
    return <p className="text-sm text-muted-foreground">No tickets yet.</p>;
  }

  return (
    <ul className="grid gap-4">
      {tickets.map((ticket) => (
        <li key={ticket.id} className="rounded-lg border p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium">{ticket.title}</h3>
                <Badge variant={STATUS_VARIANT[ticket.status]}>
                  {STATUS_LABEL[ticket.status]}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {ticket.category} · {ticket.priority}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
              {ticket.property && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Property: {ticket.property.title}
                </p>
              )}
              {ticket.tenant && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Tenant: {ticket.tenant.name} ({ticket.tenant.email})
                </p>
              )}
            </div>
          </div>

          {ticket.updates && ticket.updates.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Updates</p>
              <ul className="grid gap-2">
                {ticket.updates.map((upd) => (
                  <li key={upd.id} className="text-sm">
                    {upd.author && (
                      <span className="font-medium">{upd.author.name}: </span>
                    )}
                    {upd.message && <span>{upd.message}</span>}
                    {upd.newStatus && (
                      <span className="ml-1 text-muted-foreground">
                        → {STATUS_LABEL[upd.newStatus]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {actions && <div className="mt-3">{actions(ticket)}</div>}
        </li>
      ))}
    </ul>
  );
}
