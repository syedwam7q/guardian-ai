import { ChevronRight } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import type { RankedCause } from "@/lib/mockDag";

interface RankedCausesListProps {
  causes: RankedCause[];
  onWhatIf?: (node: string) => void;
  compact?: boolean;
}

export function RankedCausesList({
  causes,
  onWhatIf,
  compact,
}: RankedCausesListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {causes.map((c) => {
        const histo = c.histogram.map((v, i) => ({ i, v }));
        return (
          <li
            key={c.node}
            className="rounded-md border border-border-subtle bg-bg-elevated p-3"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-signal-causal/15 font-mono text-xs text-signal-causal">
                #{c.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm text-[var(--text-primary)]">
                  {c.node}
                </p>
                <p className="font-mono text-[11px] text-[var(--text-secondary)]">
                  {c.effect >= 0 ? "+" : ""}
                  {c.effect.toFixed(2)} [{c.ci_lo.toFixed(2)},{" "}
                  {c.ci_hi.toFixed(2)}] · n={c.n}
                </p>
              </div>
              <div className="h-9 w-20">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histo}>
                    <Bar
                      dataKey="v"
                      fill="var(--signal-causal)"
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {!compact && onWhatIf && (
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onWhatIf(c.node)}
                  className="h-7 px-2 text-xs"
                >
                  What if I changed this?
                  <ChevronRight className="ml-1 h-3 w-3" aria-hidden />
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
