import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  DollarSign,
  Eye,
  EyeOff,
  Lock,
  ScanText,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  generateMockEvents,
  timeAgo,
  type AgentName,
  type GovEvent,
  type Severity,
} from "@/lib/mockEvents";
import { cn } from "@/lib/utils";

const AGENT_ICON: Record<AgentName, LucideIcon> = {
  prompt_injection: AlertTriangle,
  pii_in: Lock,
  policy: ShieldCheck,
  hallucination: Sparkles,
  bias: ScanText,
  pii_out: EyeOff,
  cost: DollarSign,
};

const SEVERITY_VARIANT: Record<Severity, "safe" | "watch" | "warn" | "block"> = {
  SAFE: "safe",
  WATCH: "watch",
  WARN: "warn",
  BLOCK: "block",
};

interface EventFeedProps {
  events: GovEvent[];
  liveMode: boolean;
  onToggleLive: () => void;
  onSelect: (event: GovEvent) => void;
  onPrependEvents: (newEvents: GovEvent[]) => void;
}

export function EventFeed({
  events,
  liveMode,
  onToggleLive,
  onSelect,
  onPrependEvents,
}: EventFeedProps) {
  const seedRef = useRef(1000);
  const [, force] = useState(0);

  // Re-render every 30s so timeAgo() values stay fresh.
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Live mode: prepend a new event every 4s.
  useEffect(() => {
    if (!liveMode) return;
    const id = setInterval(() => {
      seedRef.current += 1;
      const [next] = generateMockEvents(1, seedRef.current);
      // Stamp it as "now" so it sorts to the top with a fresh timestamp.
      next.timestamp = new Date().toISOString();
      onPrependEvents([next]);
    }, 4000);
    return () => clearInterval(id);
  }, [liveMode, onPrependEvents]);

  const total = events.length;

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
        <div>
          <h3 className="font-display text-base text-[var(--text-primary)]">
            Live event feed
          </h3>
          <p className="font-mono text-[11px] text-[var(--text-tertiary)]">
            {total} events
          </p>
        </div>
        <Button
          variant={liveMode ? "default" : "outline"}
          size="sm"
          onClick={onToggleLive}
          className="gap-2"
        >
          {liveMode ? (
            <Eye className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <EyeOff className="h-3.5 w-3.5" aria-hidden />
          )}
          {liveMode ? "Live" : "Paused"}
        </Button>
      </div>
      <ScrollArea className="h-[520px]">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Eye
              className="mb-3 h-8 w-8 text-[var(--text-tertiary)]"
              aria-hidden="true"
            />
            <p className="font-display text-base text-[var(--text-primary)]">
              No events match these filters
            </p>
            <p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">
              Try widening your time window or removing an agent / severity
              filter.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col">
            <AnimatePresence initial={false}>
              {events.map((ev) => (
                <EventRow key={ev.id} event={ev} onSelect={onSelect} />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

interface EventRowProps {
  event: GovEvent;
  onSelect: (event: GovEvent) => void;
}

const EventRow = memo(function EventRow({ event, onSelect }: EventRowProps) {
  const Icon = AGENT_ICON[event.agent];
  const ago = useMemo(() => timeAgo(event.timestamp), [event.timestamp]);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <button
        type="button"
        onClick={() => onSelect(event)}
        aria-label={`Open trace for ${event.agent} verdict ${event.severity}`}
        className={cn(
          "grid w-full grid-cols-[64px_140px_60px_1fr_120px] items-center gap-3 border-b border-border-subtle/60 px-5 py-3 text-left transition-colors",
          "hover:border-l-2 hover:border-l-signal-causal hover:bg-bg-elevated/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal-causal",
        )}
      >
        <Badge variant={SEVERITY_VARIANT[event.severity]}>{event.severity}</Badge>
        <span className="flex items-center gap-2 font-mono text-xs text-[var(--text-secondary)]">
          <Icon className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden />
          {event.agent}
        </span>
        <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
          {ago}
        </span>
        <span className="truncate text-sm text-[var(--text-primary)]">
          {event.query_preview}
        </span>
        <span className="justify-self-end rounded-md border border-border-subtle bg-bg-elevated px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
          {event.action}
        </span>
      </button>
    </motion.li>
  );
});
