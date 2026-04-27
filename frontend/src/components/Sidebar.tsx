import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/nav";
import { useUIStore } from "@/lib/store";

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border-subtle bg-bg-surface transition-[width] duration-200 ease-in-out",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-14 items-center gap-3 border-b border-border-subtle px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-signal-causal/15 text-signal-causal font-display text-lg">
          G
        </div>
        {!collapsed && (
          <span className="font-display text-base text-[var(--text-primary)]">
            GuardianAI
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      collapsed && "justify-center px-2",
                      isActive
                        ? "bg-signal-causal/15 text-signal-causal"
                        : "text-[var(--text-secondary)] hover:bg-bg-elevated hover:text-[var(--text-primary)]",
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        className={cn(
          "flex items-center border-t border-border-subtle px-2 py-3",
          collapsed ? "flex-col gap-2" : "justify-between gap-2",
        )}
      >
        <button
          type="button"
          title="Settings"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-bg-elevated hover:text-[var(--text-primary)]"
        >
          <Settings className="h-4 w-4" aria-hidden />
          <span className="sr-only">Settings</span>
        </button>
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-bg-elevated hover:text-[var(--text-primary)]"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden />
          )}
          <span className="sr-only">
            {collapsed ? "Expand sidebar" : "Collapse sidebar"}
          </span>
        </button>
      </div>
    </aside>
  );
}
