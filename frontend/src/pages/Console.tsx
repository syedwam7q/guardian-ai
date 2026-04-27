import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { EventDrawer } from "@/components/console/EventDrawer";
import { EventFeed } from "@/components/console/EventFeed";
import { EventTicker } from "@/components/console/EventTicker";
import { FilterPanel } from "@/components/console/FilterPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  generateMockEvents,
  type AgentName,
  type GovEvent,
  type Severity,
} from "@/lib/mockEvents";

const INITIAL_EVENTS = generateMockEvents(60, 42);

export default function Console() {
  usePageTitle("Governance Console");
  const [params] = useSearchParams();
  const [events, setEvents] = useState<GovEvent[]>(INITIAL_EVENTS);
  const [liveMode, setLiveMode] = useState(false);
  const [selected, setSelected] = useState<GovEvent | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 250);
    return () => window.clearTimeout(id);
  }, []);

  const filtered = useMemo(() => {
    const agents = (params.get("agents") ?? "")
      .split(",")
      .filter(Boolean) as AgentName[];
    const severities = (params.get("severities") ?? "")
      .split(",")
      .filter(Boolean) as Severity[];
    const action = (params.get("action") ?? "").toLowerCase();
    return events.filter((e) => {
      if (agents.length > 0 && !agents.includes(e.agent)) return false;
      if (severities.length > 0 && !severities.includes(e.severity))
        return false;
      if (action && !e.action.toLowerCase().includes(action)) return false;
      return true;
    });
  }, [events, params]);

  const onPrependEvents = useCallback((next: GovEvent[]) => {
    setEvents((prev) => [...next, ...prev].slice(0, 200));
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-col gap-3 border-b border-border-subtle bg-bg-surface px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
            Operator
          </p>
          <h1 className="font-display text-2xl text-[var(--text-primary)]">
            Governance Console
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Live stream of every governed inference, with filters, drill-down,
            and full trace inspection.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FilterPanel />
        </div>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
        {!mounted ? (
          <ConsoleSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <EventTicker />
            <EventFeed
              events={filtered}
              liveMode={liveMode}
              onToggleLive={() => setLiveMode((v) => !v)}
              onSelect={setSelected}
              onPrependEvents={onPrependEvents}
            />
          </motion.div>
        )}
      </div>

      <EventDrawer
        event={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}

/**
 * Skeleton mirrors the shape of the loaded console: 4 ticker cards across the
 * top, then a feed of rows so the layout doesn't jump on hydration.
 */
function ConsoleSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex h-24 items-center gap-4 rounded-lg border border-border-subtle bg-bg-surface px-5"
          >
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-12 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border-subtle bg-bg-surface">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-1 p-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
