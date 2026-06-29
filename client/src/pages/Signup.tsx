import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";

type Role = "LANDLORD" | "TENANT";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("TENANT");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup(email, password, name, role);
      navigate(role === "LANDLORD" ? "/landlord" : "/tenant");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen">
      {/* Left branded panel — hidden on small screens */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center bg-gradient-to-br from-primary to-[oklch(0.68_0.13_183)] p-12 text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -right-16 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-8 h-40 w-40 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center text-center gap-6 max-w-sm">
          <div className="flex items-center gap-3">
            <Building2 className="h-10 w-10" strokeWidth={1.5} />
            <span className="text-3xl font-extrabold tracking-tight">RentWise</span>
          </div>
          <div>
            <p className="text-2xl font-bold leading-snug">Rentals made simple</p>
            <p className="mt-2 text-white/80 text-base">
              Whether you own or rent, RentWise puts you in control. Join thousands of landlords and tenants today.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-left w-full mt-2">
            {["List in minutes", "Screen applicants", "Collect rent online", "Track maintenance"].map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-sm text-white/90">
                <span className="h-1.5 w-1.5 rounded-full bg-white/70 shrink-0" />
                {feat}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center p-6 bg-background">
        <Card className="w-full max-w-sm shadow-lg border-border/50 rounded-xl">
          <CardHeader className="pb-2">
            {/* Mobile wordmark */}
            <div className="flex items-center gap-2 mb-4 lg:hidden">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="text-lg font-extrabold text-primary">RentWise</span>
            </div>
            <CardTitle className="text-2xl font-bold">Create your RentWise account</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Get started — it only takes a minute.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">I am a</legend>
                <label className="flex items-center gap-2">
                  <input type="radio" name="role" value="TENANT" checked={role === "TENANT"} onChange={() => setRole("TENANT")} />
                  Tenant
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="role" value="LANDLORD" checked={role === "LANDLORD"} onChange={() => setRole("LANDLORD")} />
                  Landlord
                </label>
              </fieldset>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={submitting} className="w-full font-semibold">
                {submitting ? "Creating…" : "Create account"}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link to="/login" className="text-primary underline font-medium hover:text-primary/80 transition-colors duration-200">
                  Log in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
