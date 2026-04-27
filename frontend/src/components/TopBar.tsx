import { Menu, Moon, Sun, User } from "lucide-react";
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
  const setMobileSidebar = useUIStore((s) => s.setMobileSidebarOpen);

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
    <header
      role="banner"
      className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border-subtle bg-bg-surface px-4 sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileSidebar(true)}
          aria-label="Open navigation menu"
          type="button"
        >
          <Menu className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-2 text-sm"
        >
          {crumbs.map((c, i) => (
            <span key={c} className="flex min-w-0 items-center gap-2">
              {i > 0 && (
                <span className="text-[var(--text-tertiary)]" aria-hidden="true">
                  /
                </span>
              )}
              <span
                className={
                  i === crumbs.length - 1
                    ? "truncate text-[var(--text-primary)] font-medium"
                    : "truncate text-[var(--text-secondary)]"
                }
              >
                {c}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="hidden gap-2 font-mono text-xs sm:inline-flex"
          aria-label="Open command palette"
          aria-keyshortcuts="Meta+K Control+K"
        >
          <span>Search</span>
          <kbd className="ml-2 inline-flex h-5 select-none items-center gap-1 rounded border border-border-subtle bg-bg-elevated px-1.5 font-mono text-[10px] font-medium text-[var(--text-secondary)]">
            <span aria-hidden="true">{"⌘"}</span>K
          </kbd>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          className="sm:hidden"
          aria-label="Open command palette"
        >
          <span className="font-mono text-xs">⌘K</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
          title={
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Moon className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Account"
          title="Account"
        >
          <User className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Account</span>
        </Button>
      </div>

      <CommandPalette />
    </header>
  );
}
