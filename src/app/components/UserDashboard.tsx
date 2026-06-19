import { useAuth } from "./AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { ProfileButton } from "./ProfileButton";
import { SalesPanel } from "./SalesPanel";

export function UserDashboard() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 border-b-2 border-amber-500 sticky top-0 z-10 shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-800 p-1.5 ring-1 ring-amber-500/30">
              <Logo className="h-10 object-contain" />
            </div>
            <div className="leading-tight">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Panel del Vendedor
              </h1>
              <p className="text-xs text-amber-400/90">Catálogo y presupuestos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ProfileButton />
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <SalesPanel />
      </main>
    </div>
  );
}
