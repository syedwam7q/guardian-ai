import { Filter, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ALL_AGENTS, ALL_SEVERITIES, type AgentName, type Severity } from "@/lib/mockEvents";
import { cn } from "@/lib/utils";

const TIME_RANGES = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "custom", label: "Custom" },
];

export function FilterPanel() {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);

  const selectedAgents = (params.get("agents") ?? "")
    .split(",")
    .filter(Boolean) as AgentName[];
  const selectedSeverities = (params.get("severities") ?? "")
    .split(",")
    .filter(Boolean) as Severity[];
  const range = params.get("range") ?? "24h";
  const action = params.get("action") ?? "";
  const startDate = params.get("start") ?? "";
  const endDate = params.get("end") ?? "";

  const update = (next: Record<string, string | null>) => {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") merged.delete(k);
      else merged.set(k, v);
    }
    setParams(merged, { replace: true });
  };

  const toggleAgent = (a: AgentName) => {
    const set = new Set(selectedAgents);
    if (set.has(a)) set.delete(a);
    else set.add(a);
    update({ agents: Array.from(set).join(",") });
  };

  const toggleSeverity = (s: Severity) => {
    const set = new Set(selectedSeverities);
    if (set.has(s)) set.delete(s);
    else set.add(s);
    update({ severities: Array.from(set).join(",") });
  };

  const reset = () => {
    setParams(new URLSearchParams(), { replace: true });
  };

  const apply = () => {
    setOpen(false);
    toast.success("Filters applied");
  };

  const activeCount =
    selectedAgents.length +
    selectedSeverities.length +
    (action ? 1 : 0) +
    (range !== "24h" ? 1 : 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-3.5 w-3.5" aria-hidden />
          Filter
          {activeCount > 0 && (
            <span className="ml-1 rounded-sm bg-signal-causal/20 px-1.5 font-mono text-[10px] text-signal-causal">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filter events</SheetTitle>
          <SheetDescription>
            Narrow the feed by agent, severity, time, or action.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 overflow-y-auto pr-1">
          <section>
            <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Agent
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {ALL_AGENTS.map((a) => {
                const active = selectedAgents.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAgent(a)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-md border px-2.5 py-1 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-causal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep",
                      active
                        ? "border-signal-causal bg-signal-causal/15 text-signal-causal"
                        : "border-border-subtle bg-bg-elevated text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </section>

          <Separator />

          <section>
            <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Severity
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SEVERITIES.map((s) => {
                const active = selectedSeverities.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSeverity(s)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-md border px-2.5 py-1 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-causal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep",
                      active
                        ? "border-signal-causal bg-signal-causal/15 text-signal-causal"
                        : "border-border-subtle bg-bg-elevated text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </section>

          <Separator />

          <section>
            <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Time range
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {TIME_RANGES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => update({ range: r.value })}
                  aria-pressed={range === r.value}
                  className={cn(
                    "rounded-md border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-causal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep",
                    range === r.value
                      ? "border-signal-causal bg-signal-causal/15 text-signal-causal"
                      : "border-border-subtle bg-bg-elevated text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {range === "custom" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => update({ start: e.target.value })}
                />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => update({ end: e.target.value })}
                />
              </div>
            )}
          </section>

          <Separator />

          <section>
            <h4 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Action contains
            </h4>
            <Input
              placeholder="e.g. add_disclaimer"
              value={action}
              onChange={(e) => update({ action: e.target.value })}
            />
          </section>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border-subtle pt-4">
          <Button variant="ghost" size="sm" onClick={reset} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </Button>
          <Button size="sm" onClick={apply}>
            Apply filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
