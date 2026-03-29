import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Activity, BookOpen, Cpu, MessageSquare, FileText, Menu, X } from "lucide-react";

const navItems = [
  { to: "/", label: "Overview", icon: BookOpen },
  { to: "/fleet", label: "Fleet Overview", icon: Activity },
  { to: "/units/1", label: "Unit Detail", icon: Cpu },
  { to: "/chat", label: "Agent Chat", icon: MessageSquare },
  { to: "/traces", label: "Decision Traces", icon: FileText },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 border-b border-border bg-sidebar px-4 py-3 md:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-sidebar-foreground"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <h1 className="text-sm font-bold tracking-tight text-sidebar-foreground">
          Turbofan Monitor
        </h1>
      </div>

      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-56 border-r border-border bg-sidebar flex flex-col transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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
              onClick={() => setSidebarOpen(false)}
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

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6 pt-16 md:pt-6">
        <Outlet />
      </main>
    </div>
  );
}
