import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";

export default function TenantDashboard() {
  const { user, logout } = useAuth();
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Tenant dashboard</h1>
      <p className="text-muted-foreground">Welcome, {user?.name}. Your unit and tickets land here in later phases.</p>
      <Button className="mt-4" variant="outline" onClick={() => logout()}>Log out</Button>
    </main>
  );
}
