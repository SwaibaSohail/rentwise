import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { propertiesApi, type Property, type PropertyInput } from "../lib/properties";
import PropertyCard from "../components/PropertyCard";
import PropertyForm from "../components/PropertyForm";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export default function LandlordDashboard() {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Property | null>(null);
  const [open, setOpen] = useState(false);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ["properties", "mine"],
    queryFn: propertiesApi.listMine,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["properties"] });

  const createMut = useMutation({ mutationFn: propertiesApi.create, onSuccess: invalidate });
  const updateMut = useMutation({
    mutationFn: (vars: { id: string; data: PropertyInput }) => propertiesApi.update(vars.id, vars.data),
    onSuccess: invalidate,
  });
  const removeMut = useMutation({ mutationFn: propertiesApi.remove, onSuccess: invalidate });
  const statusMut = useMutation({
    mutationFn: (vars: { id: string; status: Property["status"] }) => propertiesApi.setStatus(vars.id, vars.status),
    onSuccess: invalidate,
  });
  const seedMut = useMutation({ mutationFn: propertiesApi.seedSamples, onSuccess: invalidate });

  async function handleSubmit(data: PropertyInput) {
    if (editing) await updateMut.mutateAsync({ id: editing.id, data });
    else await createMut.mutateAsync(data);
    setOpen(false);
    setEditing(null);
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
          {properties.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              actions={
                <>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(p); setOpen(true); }}>Edit</Button>
                  <Button size="sm" variant="outline"
                    onClick={() => statusMut.mutate({ id: p.id, status: p.status === "AVAILABLE" ? "RENTED" : "AVAILABLE" })}>
                    Mark {p.status === "AVAILABLE" ? "Rented" : "Available"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => removeMut.mutate(p.id)}>Delete</Button>
                </>
              }
            />
          ))}
        </div>
      )}
    </main>
  );
}
