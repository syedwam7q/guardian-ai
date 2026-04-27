import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Row {
  config: string;
  top1: number;
  top3: number;
  p50: number;
  highlight?: boolean;
}

const ROWS: Row[] = [
  { config: "Full system", top1: 0.74, top3: 0.91, p50: 280, highlight: true },
  { config: "− DoWhy", top1: 0.69, top3: 0.88, p50: 240 },
  { config: "− Self-consistency", top1: 0.66, top3: 0.85, p50: 180 },
  { config: "− Causal scoring", top1: 0.59, top3: 0.78, p50: 165 },
  { config: "− Pre-flight", top1: 0.46, top3: 0.71, p50: 145 },
  { config: "Judge-only baseline", top1: 0.41, top3: 0.62, p50: 120 },
];

export function AblationCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ablation study</CardTitle>
        <CardDescription>
          Each row removes one component; full-system row is highlighted.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="border-b border-border-subtle text-left">
            <tr className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              <th className="py-2 pr-3">Configuration</th>
              <th className="py-2 pr-3 text-right">Top-1</th>
              <th className="py-2 pr-3 text-right">Top-3</th>
              <th className="py-2 text-right">p50 latency</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr
                key={r.config}
                className={cn(
                  "border-b border-border-subtle/60 last:border-0",
                  r.highlight && "bg-signal-causal/5",
                )}
              >
                <td
                  className={cn(
                    "py-2 pr-3 font-mono text-xs",
                    r.highlight
                      ? "text-signal-causal"
                      : "text-[var(--text-primary)]",
                  )}
                >
                  {r.config}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs text-[var(--text-primary)]">
                  {r.top1.toFixed(2)}
                </td>
                <td className="py-2 pr-3 text-right font-mono text-xs text-[var(--text-primary)]">
                  {r.top3.toFixed(2)}
                </td>
                <td className="py-2 text-right font-mono text-xs text-[var(--text-secondary)]">
                  {r.p50}ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
