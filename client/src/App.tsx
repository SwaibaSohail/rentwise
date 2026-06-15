import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await api.get<{ status: string }>("/health");
      return res.data;
    },
  });
}

function App() {
  const { data, isLoading, isError } = useHealth();
  const apiStatus = isLoading
    ? "checking…"
    : isError
    ? "offline"
    : data?.status ?? "unknown";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">RentWise</h1>
      <p className="text-muted-foreground">API: {apiStatus}</p>
      <Button>Get started</Button>
    </main>
  );
}

export default App;
