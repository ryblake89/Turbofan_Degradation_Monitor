import { NavLink, Outlet } from "react-router-dom";
import { Activity, Cpu, MessageSquare, FileText } from "lucide-react";

const navItems = [
  { to: "/", label: "Fleet Overview", icon: Activity },
  { to: "/units/1", label: "Unit Detail", icon: Cpu },
  { to: "/chat", label: "Agent Chat", icon: MessageSquare },
  { to: "/traces", label: "Decision Traces", icon: FileText },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-background">
      <aside className="w-56 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">
            Turbofan Monitor
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fleet Health Dashboard
          </p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border text-xs text-muted-foreground">
          C-MAPSS FD001 &middot; 100 units
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
