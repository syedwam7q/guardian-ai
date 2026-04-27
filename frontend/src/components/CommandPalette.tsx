import { Command } from "cmdk";
import {
  BookOpen,
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
}

export function CommandPalette() {
  const navigate = useNavigate();
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  function close() {
    setOpen(false);
  }

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
      run: () => {
        window.open("https://github.com/syedwam7q/guardian-ai", "_blank", "noopener,noreferrer");
        close();
      },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Navigate or run quick actions.
        </DialogDescription>
        <Command
          label="Command palette"
          className="flex flex-col"
          loop
        >
          <div className="flex items-center border-b border-border-subtle px-3">
            <Search
              className="mr-2 h-4 w-4 shrink-0 text-[var(--text-tertiary)]"
              aria-hidden
            />
            <Command.Input
              placeholder="Type a command or search..."
              className="flex h-11 w-full bg-transparent py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-[var(--text-secondary)]">
              No results found.
            </Command.Empty>
            <Command.Group
              heading="Navigation"
              className="px-2 py-1.5 text-xs font-medium text-[var(--text-tertiary)] [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
            >
              {navActions.map((a) => {
                const Icon = a.icon;
                return (
                  <Command.Item
                    key={a.id}
                    value={a.label}
                    onSelect={a.run}
                    className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm text-[var(--text-primary)] outline-none data-[selected=true]:bg-bg-elevated"
                  >
                    <Icon className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden />
                    <span>{a.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
            <Command.Group
              heading="Actions"
              className="px-2 py-1.5 text-xs font-medium text-[var(--text-tertiary)] [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
            >
              {generalActions.map((a) => {
                const Icon = a.icon;
                return (
                  <Command.Item
                    key={a.id}
                    value={a.label}
                    onSelect={a.run}
                    className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm text-[var(--text-primary)] outline-none data-[selected=true]:bg-bg-elevated"
                  >
                    <Icon className="h-4 w-4 text-[var(--text-secondary)]" aria-hidden />
                    <span>{a.label}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
