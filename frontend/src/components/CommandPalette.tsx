import { Command } from "cmdk";
import {
  BookOpen,
  Clock,
  Moon,
  Search,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { navItems } from "@/lib/nav";
import { useUIStore } from "@/lib/store";

interface ActionItem {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
  shortcut?: string;
}

export function CommandPalette() {
  const navigate = useNavigate();
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const recent = useUIStore((s) => s.recentNavPaths);

  function close() {
    setOpen(false);
  }

  const navByPath = new Map(navItems.map((n) => [n.path, n] as const));
  // Skip "/" and de-dup; cap at 4.
  const recentEntries = recent
    .filter((p) => p !== "/" && navByPath.has(p))
    .slice(0, 4)
    .map((p) => navByPath.get(p)!);

  const recentActions: ActionItem[] = recentEntries.map((n) => ({
    id: `recent:${n.path}`,
    label: `Go to ${n.label}`,
    icon: Clock,
    run: () => {
      navigate(n.path);
      close();
    },
  }));

  const navActions: ActionItem[] = navItems.map((n) => ({
    id: `nav:${n.path}`,
    label: `Go to ${n.label}`,
    icon: n.icon,
    run: () => {
      navigate(n.path);
      close();
    },
  }));

  const generalActions: ActionItem[] = [
    {
      id: "theme:toggle",
      label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
      icon: theme === "dark" ? Sun : Moon,
      run: () => {
        toggleTheme();
        close();
      },
    },
    {
      id: "open:docs",
      label: "Open docs",
      icon: BookOpen,
      shortcut: "↗",
      run: () => {
        window.open(
          "https://github.com/syedwam7q/guardian-ai",
          "_blank",
          "noopener,noreferrer",
        );
        close();
      },
    },
  ];

  function renderItem(a: ActionItem) {
    const Icon = a.icon;
    return (
      <Command.Item
        key={a.id}
        value={a.label}
        onSelect={a.run}
        className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm text-[var(--text-primary)] outline-none data-[selected=true]:bg-bg-elevated"
      >
        <Icon
          className="h-4 w-4 text-[var(--text-secondary)]"
          aria-hidden="true"
        />
        <span className="flex-1">{a.label}</span>
        {a.shortcut && (
          <kbd className="ml-2 inline-flex h-5 items-center gap-1 rounded border border-border-subtle bg-bg-elevated px-1.5 font-mono text-[10px] text-[var(--text-tertiary)]">
            {a.shortcut}
          </kbd>
        )}
      </Command.Item>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Navigate or run quick actions. Type to search, arrow keys to move,
          Enter to select, Escape to close.
        </DialogDescription>
        <Command label="Command palette" className="flex flex-col" loop>
          <div className="flex items-center border-b border-border-subtle px-3">
            <Search
              className="mr-2 h-4 w-4 shrink-0 text-[var(--text-tertiary)]"
              aria-hidden="true"
            />
            <Command.Input
              placeholder="Type to search…"
              className="flex h-11 w-full bg-transparent py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-[var(--text-secondary)]">
              No results found. Try a page name or "theme".
            </Command.Empty>
            {recentActions.length > 0 && (
              <Command.Group
                heading="Recent"
                className="px-2 py-1.5 text-xs font-medium text-[var(--text-tertiary)] [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
              >
                {recentActions.map(renderItem)}
              </Command.Group>
            )}
            <Command.Group
              heading="Navigation"
              className="px-2 py-1.5 text-xs font-medium text-[var(--text-tertiary)] [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
            >
              {navActions.map(renderItem)}
            </Command.Group>
            <Command.Group
              heading="Actions"
              className="px-2 py-1.5 text-xs font-medium text-[var(--text-tertiary)] [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
            >
              {generalActions.map(renderItem)}
            </Command.Group>
          </Command.List>
          <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-3 py-2 font-mono text-[10px] text-[var(--text-tertiary)]">
            <span>↑↓ navigate · ↵ select · esc close</span>
            <span>cmd+k</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
