import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { propertiesApi, type Property, type PropertyInput } from "../lib/properties";
import { tenanciesApi, type Tenancy } from "../lib/tenancies";
import { ticketsApi, type Ticket, type TicketStatus } from "../lib/tickets";
import { applicationsApi } from "../lib/applications";
import { useTicketEvents } from "../hooks/useTicketEvents";
import { useApplicationEvents } from "../hooks/useApplicationEvents";
import StatCard from "../components/StatCard";
import { statsApi } from "../lib/stats";
import PropertyCard from "../components/PropertyCard";
import PropertyForm from "../components/PropertyForm";
import TicketList from "../components/TicketList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export default function LandlordDashboard() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Property | null>(null);
  const [open, setOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<Property | null>(null);
  const [assignEmail, setAssignEmail] = useState("");
  const [assignError, setAssignError] = useState("");
  const [ticketComments, setTicketComments] = useState<Record<string, string>>({});

  useTicketEvents();
  useApplicationEvents();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties", "mine"],
    queryFn: propertiesApi.listMine,
  });
  const { data: tenancies = [] } = useQuery({
    queryKey: ["tenancies", "mine"],
    queryFn: tenanciesApi.listMine,
  });
  const { data: incomingTickets = [] } = useQuery({
    queryKey: ["tickets", "landlord"],
    queryFn: ticketsApi.listLandlord,
  });
  const { data: stats } = useQuery({ queryKey: ["stats", "landlord"], queryFn: statsApi.landlord });
  const { data: pendingApplications = [] } = useQuery({
    queryKey: ["applications", "landlord"],
    queryFn: applicationsApi.listLandlord,
  });

  const updateTicketMut = useMutation({
    mutationFn: (vars: { id: string; data: { message?: string; newStatus?: TicketStatus } }) =>
      ticketsApi.addUpdate(vars.id, vars.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const tenancyByProperty = new Map<string, Tenancy>(tenancies.map((t) => [t.propertyId, t]));
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["properties"] });
    qc.invalidateQueries({ queryKey: ["tenancies"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };

  const createMut = useMutation({ mutationFn: propertiesApi.create, onSuccess: invalidate });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; data: PropertyInput }) => propertiesApi.update(vars.id, vars.data),
    onSuccess: invalidate,
  });
  const removeMut = useMutation({ mutationFn: propertiesApi.remove, onSuccess: invalidate });
  const seedMut = useMutation({ mutationFn: propertiesApi.seedSamples, onSuccess: invalidate });
  const assignMut = useMutation({
    mutationFn: (vars: { propertyId: string; email: string }) => tenanciesApi.assign(vars.propertyId, vars.email),
    onSuccess: () => { invalidate(); setAssignFor(null); setAssignEmail(""); setAssignError(""); },
  });
  const endMut = useMutation({ mutationFn: tenanciesApi.end, onSuccess: invalidate });

  const invalidateApplications = () => {
    qc.invalidateQueries({ queryKey: ["applications"] });
    qc.invalidateQueries({ queryKey: ["properties"] });
    qc.invalidateQueries({ queryKey: ["tenancies"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };
  const approveMut = useMutation({
    mutationFn: (id: string) => applicationsApi.approve(id),
    onSuccess: invalidateApplications,
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => applicationsApi.reject(id),
    onSuccess: invalidateApplications,
  });

  async function handleSubmit(data: PropertyInput) {
    if (editing) await updateMut.mutateAsync({ id: editing.id, data });
    else await createMut.mutateAsync(data);
    setOpen(false);
    setEditing(null);
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignFor) return;
    setAssignError("");
    try {
      await assignMut.mutateAsync({ propertyId: assignFor.id, email: assignEmail });
    } catch (err: any) {
      setAssignError(err?.response?.data?.message ?? "Could not assign tenant");
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Landlord dashboard</h1>
          <p className="text-muted-foreground">Welcome, {user?.name}.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}>Add property</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit property" : "Add property"}</DialogTitle>
              </DialogHeader>
              <PropertyForm initial={editing ?? undefined} onSubmit={handleSubmit} />
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => logout()}>Log out</Button>
        </div>
      </div>

      {stats && (
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Properties" value={stats.totalProperties} sub={`${stats.available} available · ${stats.rented} rented`} />
          <StatCard label="Occupancy" value={`${stats.occupancyRate}%`} />
          <StatCard label="Active tenancies" value={stats.activeTenancies} />
          <StatCard label="Open tickets" value={stats.tickets.open + stats.tickets.inProgress} sub={`${stats.tickets.resolved} resolved`} />
        </section>
      )}

      {isLoading ? (
        <p className="mt-8">Loading…</p>
      ) : properties.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground">No properties yet.</p>
          <Button onClick={() => seedMut.mutate()} disabled={seedMut.isPending}>
            {seedMut.isPending ? "Adding…" : "Load sample properties"}
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => {
            const tenancy = tenancyByProperty.get(p.id);
            return (
              <PropertyCard
                key={p.id}
                property={p}
                actions={
                  <div className="flex w-full flex-col gap-2">
                    {p.status === "RENTED" && tenancy?.tenant && (
                      <p className="text-sm text-muted-foreground">Tenant: {tenancy.tenant.name}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setEditing(p); setOpen(true); }}>Edit</Button>
                      {p.status === "AVAILABLE" ? (
                        <Button size="sm" onClick={() => { setAssignFor(p); setAssignEmail(""); setAssignError(""); }}>
                          Assign tenant
                        </Button>
                      ) : (
                        tenancy && (
                          <Button size="sm" variant="outline" onClick={() => endMut.mutate(tenancy.id)} disabled={endMut.isPending}>
                            End tenancy
                          </Button>
                        )
                      )}
                      <Button size="sm" variant="destructive" onClick={() => removeMut.mutate(p.id)}>Delete</Button>
                    </div>
                  </div>
                }
              />
            );
          })}
        </div>
      )}

      <Dialog open={!!assignFor} onOpenChange={(o) => { if (!o) { setAssignFor(null); setAssignError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign tenant{assignFor ? ` — ${assignFor.title}` : ""}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssign} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="tenantEmail">Tenant email</Label>
              <Input
                id="tenantEmail"
                type="email"
                value={assignEmail}
                onChange={(e) => setAssignEmail(e.target.value)}
                placeholder="tenant@example.com"
                required
              />
            </div>
            {assignError && <p className="text-sm text-red-600">{assignError}</p>}
            <Button type="submit" disabled={assignMut.isPending}>
              {assignMut.isPending ? "Assigning…" : "Assign"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {pendingApplications.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Applications</h2>
          <ul className="grid gap-3">
            {pendingApplications.map((app) => (
              <li key={app.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="font-medium">{app.tenant?.name ?? "Tenant"}</p>
                  <p className="text-sm text-muted-foreground">{app.property?.title ?? app.propertyId}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={approveMut.isPending || rejectMut.isPending}
                    onClick={() => approveMut.mutate(app.id)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={approveMut.isPending || rejectMut.isPending}
                    onClick={() => rejectMut.mutate(app.id)}
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold">Maintenance tickets</h2>
        {incomingTickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No maintenance tickets yet.</p>
        ) : (
          <TicketList
            tickets={incomingTickets}
            actions={(ticket: Ticket) => (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor={`status-${ticket.id}`} className="text-xs">Change status</Label>
                  <select
                    id={`status-${ticket.id}`}
                    defaultValue={ticket.status}
                    onChange={(e) =>
                      updateTicketMut.mutate({ id: ticket.id, data: { newStatus: e.target.value as TicketStatus } })
                    }
                    className="h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-xs outline-none focus-visible:border-ring"
                    aria-label={`Change status for ${ticket.title}`}
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a comment…"
                    value={ticketComments[ticket.id] ?? ""}
                    onChange={(e) =>
                      setTicketComments((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                    }
                    className="h-8 text-xs"
                    aria-label={`Comment for ${ticket.title}`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!ticketComments[ticket.id]?.trim() || updateTicketMut.isPending}
                    onClick={() => {
                      const msg = ticketComments[ticket.id]?.trim();
                      if (!msg) return;
                      updateTicketMut.mutate(
                        { id: ticket.id, data: { message: msg } },
                        { onSuccess: () => setTicketComments((prev) => ({ ...prev, [ticket.id]: "" })) }
                      );
                    }}
                  >
                    Comment
                  </Button>
                </div>
              </div>
            )}
          />
        )}
      </section>
    </main>
  );
}
