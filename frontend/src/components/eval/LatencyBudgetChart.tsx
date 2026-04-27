import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Stage {
  label: string;
  ms: number;
  color: string;
}

interface Row {
  pct: "p50" | "p95" | "p99";
  total: number;
  stages: Stage[];
}

const BUDGET = 3000;

const ROWS: Row[] = [
  {
    pct: "p50",
    total: 2600,
    stages: [
      { label: "Pre-flight", ms: 200, color: "bg-signal-causal" },
      { label: "Retrieval", ms: 100, color: "bg-signal-info" },
      { label: "Generation", ms: 1500, color: "bg-signal-safe" },
      { label: "Post-flight", ms: 800, color: "bg-signal-watch" },
    ],
  },
  {
    pct: "p95",
    total: 4100,
    stages: [
      { label: "Pre-flight", ms: 320, color: "bg-signal-causal" },
      { label: "Retrieval", ms: 180, color: "bg-signal-info" },
      { label: "Generation", ms: 2400, color: "bg-signal-safe" },
      { label: "Post-flight", ms: 1200, color: "bg-signal-watch" },
    ],
  },
  {
    pct: "p99",
    total: 5800,
    stages: [
      { label: "Pre-flight", ms: 460, color: "bg-signal-causal" },
      { label: "Retrieval", ms: 240, color: "bg-signal-info" },
      { label: "Generation", ms: 3500, color: "bg-signal-safe" },
      { label: "Post-flight", ms: 1600, color: "bg-signal-watch" },
    ],
  },
];

export function LatencyBudgetChart() {
  const max = Math.max(BUDGET, ...ROWS.map((r) => r.total));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latency budget</CardTitle>
        <CardDescription>
          Per-stage breakdown vs. {BUDGET} ms target. Bar width is proportional
          to total latency.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ROWS.map((row) => (
          <div key={row.pct}>
            <div className="mb-1 flex items-center justify-between font-mono text-xs">
              <span className="text-[var(--text-secondary)]">{row.pct}</span>
              <span
                className={
                  row.total > BUDGET
                    ? "text-signal-block"
                    : "text-[var(--text-primary)]"
                }
              >
                {row.total} ms / {BUDGET} ms
              </span>
            </div>
            <div className="relative flex h-6 w-full overflow-hidden rounded-md border border-border-subtle bg-bg-deep">
              {row.stages.map((s) => (
                <div
                  key={s.label}
                  className={`${s.color} flex items-center justify-center text-[10px] text-bg-deep transition-all`}
                  style={{ width: `${(s.ms / max) * 100}%` }}
                  title={`${s.label}: ${s.ms} ms`}
                >
                  {(s.ms / row.total) * 100 > 12 ? `${s.ms}ms` : ""}
                </div>
              ))}
              <div
                className="absolute top-0 bottom-0 w-px bg-signal-block"
                style={{ left: `${(BUDGET / max) * 100}%` }}
                title={`Budget: ${BUDGET} ms`}
              />
            </div>
          </div>
        ))}

        <div className="flex flex-wrap gap-3 border-t border-border-subtle pt-3 font-mono text-[11px]">
          {ROWS[0].stages.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              <span className={`h-2.5 w-2.5 rounded-sm ${s.color}`} />
              {s.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <span className="h-2.5 w-px bg-signal-block" /> budget
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
