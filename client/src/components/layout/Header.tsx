import { Building2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../../context/AuthContext";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Wordmark */}
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" strokeWidth={2} />
          <span className="text-xl font-extrabold tracking-tight text-primary">
            RentWise
          </span>
        </div>

        {/* Right side: user info + logout */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-sm font-semibold text-foreground">{user.name}</span>
              <Badge
                variant="outline"
                className="mt-0.5 text-[10px] px-1.5 py-0 font-medium border-primary/40 text-primary"
              >
                {user.role === "LANDLORD" ? "Landlord" : "Tenant"}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              className="flex items-center gap-1.5 border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors duration-200"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log out</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
