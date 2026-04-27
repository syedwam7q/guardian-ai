import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Framework {
  name: string;
  score: number; // 0..1
  requirements: { label: string; ok: boolean }[];
  accent: string;
}

const FRAMEWORKS: Framework[] = [
  {
    name: "EU AI Act",
    score: 0.86,
    accent: "stroke-signal-causal",
    requirements: [
      { label: "Article 13: Transparency obligations", ok: true },
      { label: "Article 14: Human oversight", ok: true },
      { label: "Article 15: Accuracy & robustness logs", ok: false },
    ],
  },
  {
    name: "India DPDP",
    score: 0.92,
    accent: "stroke-signal-info",
    requirements: [
      { label: "S.7: Notice & consent", ok: true },
      { label: "S.8: Purpose limitation", ok: true },
      { label: "S.16: Data principal rights", ok: true },
    ],
  },
  {
    name: "HIPAA",
    score: 0.74,
    accent: "stroke-signal-safe",
    requirements: [
      { label: "164.502: Use & disclosure of PHI", ok: true },
      { label: "164.514: De-identification", ok: false },
      { label: "164.312: Audit controls", ok: true },
    ],
  },
  {
    name: "SOC 2 Type II",
    score: 0.81,
    accent: "stroke-signal-watch",
    requirements: [
      { label: "CC6: Logical access controls", ok: true },
      { label: "CC7: System operations", ok: true },
      { label: "CC8: Change management", ok: false },
    ],
  },
];

interface RingProps {
  pct: number;
  accent: string;
}

function Ring({ pct, accent }: RingProps) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - pct * c;
  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth="6"
        />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={accent}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-base text-[var(--text-primary)]">
        {Math.round(pct * 100)}%
      </span>
    </div>
  );
}

export function ComplianceScorecard() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {FRAMEWORKS.map((f) => (
        <Card key={f.name}>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">{f.name}</CardTitle>
              <Ring pct={f.score} accent={f.accent} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-1">
              {f.requirements.map((r) => (
                <li
                  key={r.label}
                  className="flex items-start gap-2 font-mono text-[11px] text-[var(--text-secondary)]"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full",
                      r.ok
                        ? "bg-signal-safe/20 text-signal-safe"
                        : "bg-signal-block/20 text-signal-block",
                    )}
                  >
                    {r.ok ? (
                      <Check className="h-2.5 w-2.5" aria-hidden />
                    ) : (
                      <X className="h-2.5 w-2.5" aria-hidden />
                    )}
                  </span>
                  <span>{r.label}</span>
                </li>
              ))}
            </ul>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast.info(`${f.name} details opening (mock)`)}
              className="h-7 px-2 text-xs"
            >
              View details →
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
