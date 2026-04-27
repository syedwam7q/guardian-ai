import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { EventDrawer } from "@/components/console/EventDrawer";
import { EventFeed } from "@/components/console/EventFeed";
import { EventTicker } from "@/components/console/EventTicker";
import { FilterPanel } from "@/components/console/FilterPanel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  generateMockEvents,
  type AgentName,
  type GovEvent,
  type Severity,
} from "@/lib/mockEvents";

const INITIAL_EVENTS = generateMockEvents(60, 42);

export default function Console() {
  const [params] = useSearchParams();
  const [events, setEvents] = useState<GovEvent[]>(INITIAL_EVENTS);
  const [liveMode, setLiveMode] = useState(false);
  const [selected, setSelected] = useState<GovEvent | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 300);
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
      <header className="flex items-center justify-between border-b border-border-subtle bg-bg-surface px-8 py-5">
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

      <div className="flex-1 space-y-6 overflow-y-auto p-8">
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

function ConsoleSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}
