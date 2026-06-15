import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";

export default function LandlordDashboard() {
  const { user, logout } = useAuth();
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold">Landlord dashboard</h1>
      <p className="text-muted-foreground">Welcome, {user?.name}. Properties and tickets land here in later phases.</p>
      <Button className="mt-4" variant="outline" onClick={() => logout()}>Log out</Button>
    </main>
  );
}
