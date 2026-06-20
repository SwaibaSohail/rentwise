import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { propertiesApi, type Property } from "../lib/properties";
import { tenanciesApi } from "../lib/tenancies";
import { ticketsApi, type CreateTicketInput } from "../lib/tickets";
import { useTicketEvents } from "../hooks/useTicketEvents";
import PropertyCard from "../components/PropertyCard";
import TicketForm from "../components/TicketForm";
import TicketList from "../components/TicketList";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export default function TenantDashboard() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Property | null>(null);

  useTicketEvents();

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

  const createTicketMut = useMutation({
    mutationFn: (data: CreateTicketInput) => ticketsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets", "mine"] }),
  });

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Browse rentals</h1>
          <p className="text-muted-foreground">Welcome, {user?.name}.</p>
        </div>
        <Button variant="outline" onClick={() => logout()}>Log out</Button>
      </div>

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

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Available rentals</h2>
        {isLoading ? (
          <p>Loading…</p>
        ) : properties.length === 0 ? (
          <p className="text-muted-foreground">No properties available right now.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((p) => (
              <PropertyCard key={p.id} property={p} onClick={() => setSelected(p)} />
            ))}
          </div>
        )}
      </section>

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
    </main>
  );
}
