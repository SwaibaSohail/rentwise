import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { propertiesApi, type Property } from "../lib/properties";
import { tenanciesApi } from "../lib/tenancies";
import { ticketsApi, type CreateTicketInput } from "../lib/tickets";
import { applicationsApi } from "../lib/applications";
import { chatApi } from "../lib/chat";
import { useTicketEvents } from "../hooks/useTicketEvents";
import { useApplicationEvents } from "../hooks/useApplicationEvents";
import { useChatEvents } from "../hooks/useChatEvents";
import StatCard from "../components/StatCard";
import { statsApi } from "../lib/stats";
import PropertyCard from "../components/PropertyCard";
import TicketForm from "../components/TicketForm";
import TicketList from "../components/TicketList";
import ChatThread from "../components/ChatThread";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export default function TenantDashboard() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Property | null>(null);
  const [chatConvId, setChatConvId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useTicketEvents();
  useApplicationEvents();
  useChatEvents();

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties", "available"],
    queryFn: propertiesApi.listAvailable,
  });
  const { data: tenancy } = useQuery({
    queryKey: ["tenancies", "active"],
    queryFn: tenanciesApi.active,
  });
  const { data: myTickets = [] } = useQuery({
    queryKey: ["tickets", "mine"],
    queryFn: ticketsApi.listMine,
    enabled: !!tenancy?.property,
  });
  const { data: stats } = useQuery({ queryKey: ["stats", "tenant"], queryFn: statsApi.tenant });
  const { data: myApplications = [] } = useQuery({
    queryKey: ["applications", "mine"],
    queryFn: applicationsApi.listMine,
  });

  const createTicketMut = useMutation({
    mutationFn: (data: CreateTicketInput) => ticketsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets", "mine"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const applyMut = useMutation({
    mutationFn: (propertyId: string) => applicationsApi.apply(propertyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const appliedPropertyIds = new Set(
    myApplications
      .filter((a) => a.status === "PENDING" || a.status === "APPROVED")
      .map((a) => a.propertyId)
  );
  const hasHome = !!tenancy;

  const statusBadgeClass = (status: string) => {
    if (status === "APPROVED") return "text-green-700 bg-green-100";
    if (status === "REJECTED") return "text-red-700 bg-red-100";
    return "text-yellow-700 bg-yellow-100";
  };

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Browse rentals</h1>
          <p className="text-muted-foreground">Welcome, {user?.name}.</p>
        </div>
        <Button variant="outline" onClick={() => logout()}>Log out</Button>
      </div>

      {stats && (
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Your unit" value={stats.hasHome ? stats.home!.title : "None yet"} sub={stats.hasHome ? `${stats.home!.city} · $${stats.home!.rentAmount.toLocaleString()}/mo` : undefined} />
          <StatCard label="Open tickets" value={stats.openTickets} />
          <StatCard label="Total tickets" value={stats.totalTickets} />
        </section>
      )}

      {tenancy?.property && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Your home</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PropertyCard property={tenancy.property} onClick={() => setSelected(tenancy.property!)} />
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Maintenance</h2>
        {tenancy?.property ? (
          <div className="grid gap-6">
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">File a new ticket</h3>
              <div className="max-w-lg">
                <TicketForm
                  onSubmit={async (data) => { await createTicketMut.mutateAsync(data); }}
                />
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Your tickets</h3>
              <TicketList tickets={myTickets} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You need an active tenancy to file maintenance tickets. Browse available rentals below.
          </p>
        )}
      </section>

      {tenancy?.property && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Message your landlord</h2>
          <Button
            onClick={async () => {
              const landlordId = tenancy.property!.landlordId;
              const conv = await chatApi.start(landlordId);
              setChatConvId(conv.id);
              setChatOpen(true);
            }}
          >
            Open chat
          </Button>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Available rentals</h2>
        {isLoading ? (
          <p>Loading…</p>
        ) : properties.length === 0 ? (
          <p className="text-muted-foreground">No properties available right now.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <PropertyCard
                key={p.id}
                property={p}
                onClick={() => setSelected(p)}
                actions={
                  p.status === "AVAILABLE" && !hasHome ? (
                    appliedPropertyIds.has(p.id) ? (
                      <Button size="sm" variant="outline" disabled>Applied</Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={applyMut.isPending}
                        onClick={(e) => { e.stopPropagation(); applyMut.mutate(p.id); }}
                      >
                        Apply
                      </Button>
                    )
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
      </section>

      {myApplications.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">My applications</h2>
          <ul className="grid gap-3">
            {myApplications.map((app) => (
              <li key={app.id} className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">{app.property?.title ?? app.propertyId}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(app.status)}`}>
                  {app.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
              </DialogHeader>
              {selected.imageUrls[0] && (
                <img src={selected.imageUrls[0]} alt={selected.title} className="h-48 w-full rounded object-cover" />
              )}
              <p className="text-sm text-muted-foreground">{selected.address}, {selected.city}</p>
              <p>{selected.description}</p>
              <p className="font-semibold">${selected.rentAmount.toLocaleString()}/mo · {selected.bedrooms} bed · {selected.bathrooms} bath</p>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={chatOpen} onOpenChange={(o) => { if (!o) { setChatOpen(false); setChatConvId(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chat with your landlord</DialogTitle>
          </DialogHeader>
          {chatConvId && user && (
            <ChatThread conversationId={chatConvId} meId={user.id} />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
