import { motion } from "framer-motion";
import { useCallback, useMemo, useRef } from "react";
import type { Severity } from "@/lib/mockEvents";
import { cn } from "@/lib/utils";

export interface ReplayDot {
  id: string;
  severity: Severity;
  // 0..1 position on the timeline
  t: number;
}

interface TimelineScrubberProps {
  dots: ReplayDot[];
  index: number;
  onScrub: (index: number) => void;
  range: "24h" | "7d" | "30d";
  onRangeChange: (r: "24h" | "7d" | "30d") => void;
}

const SEVERITY_DOT: Record<Severity, string> = {
  SAFE: "bg-signal-safe",
  WATCH: "bg-signal-watch",
  WARN: "bg-signal-watch",
  BLOCK: "bg-signal-block",
};

export function TimelineScrubber({
  dots,
  index,
  onScrub,
  range,
  onRangeChange,
}: TimelineScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const playhead = useMemo(() => {
    if (dots.length === 0) return 0;
    return dots[Math.max(0, Math.min(index, dots.length - 1))].t;
  }, [dots, index]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      // pick nearest dot
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < dots.length; i++) {
        const d = Math.abs(dots[i].t - t);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      onScrub(best);
    },
    [dots, onScrub],
  );

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-base text-[var(--text-primary)]">
            Timeline
          </h3>
          <p className="font-mono text-[11px] text-[var(--text-tertiary)]">
            {dots.length} decisions · drag the playhead to inspect any one
          </p>
        </div>
        <div className="flex rounded-md border border-border-subtle bg-bg-elevated p-0.5">
          {(["24h", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={cn(
                "rounded-sm px-3 py-1 text-xs font-medium transition-colors",
                range === r
                  ? "bg-bg-surface text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={trackRef}
        onClick={handleClick}
        className="relative h-12 cursor-crosshair rounded-md border border-border-subtle bg-bg-deep px-2"
      >
        {/* axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <div
            key={t}
            className="absolute top-0 bottom-0 w-px bg-border-subtle/60"
            style={{ left: `${t * 100}%` }}
          />
        ))}

        {/* dots */}
        {dots.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onScrub(dots.indexOf(d));
            }}
            className={cn(
              "absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-bg-deep transition-transform hover:scale-150",
              SEVERITY_DOT[d.severity],
            )}
            style={{ left: `${d.t * 100}%` }}
            aria-label={`Decision ${d.id}`}
          />
        ))}

        {/* playhead */}
        <motion.div
          className="absolute top-0 bottom-0 w-0.5 bg-signal-causal shadow-[0_0_8px_var(--signal-causal)]"
          style={{ left: `${playhead * 100}%` }}
          layout
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
        />
      </div>

      <div className="mt-2 flex justify-between font-mono text-[10px] text-[var(--text-tertiary)]">
        <span>oldest</span>
        <span>now</span>
      </div>
    </div>
  );
}
