import { Moon, Sun, User } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/CommandPalette";
import { navItems } from "@/lib/nav";
import { useUIStore } from "@/lib/store";

function useBreadcrumbs(): string[] {
  const { pathname } = useLocation();
  if (pathname === "/") return ["Home"];
  const match = navItems.find(
    (i) => i.path !== "/" && pathname.startsWith(i.path),
  );
  return match ? [match.label] : ["Unknown"];
}

export function TopBar() {
  const crumbs = useBreadcrumbs();
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-surface px-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        {crumbs.map((c, i) => (
          <span key={c} className="flex items-center gap-2">
            {i > 0 && (
              <span className="text-[var(--text-tertiary)]" aria-hidden>
                /
              </span>
            )}
            <span
              className={
                i === crumbs.length - 1
                  ? "text-[var(--text-primary)] font-medium"
                  : "text-[var(--text-secondary)]"
              }
            >
              {c}
            </span>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-2 font-mono text-xs"
        >
          <span>Search</span>
          <kbd className="ml-2 inline-flex h-5 select-none items-center gap-1 rounded border border-border-subtle bg-bg-elevated px-1.5 font-mono text-[10px] font-medium text-[var(--text-secondary)]">
            <span aria-hidden>{"⌘"}</span>K
          </kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" aria-hidden />
          ) : (
            <Moon className="h-4 w-4" aria-hidden />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
        <Button variant="ghost" size="icon" title="Account">
          <User className="h-4 w-4" aria-hidden />
          <span className="sr-only">Account</span>
        </Button>
      </div>

      <CommandPalette />
    </header>
  );
}
