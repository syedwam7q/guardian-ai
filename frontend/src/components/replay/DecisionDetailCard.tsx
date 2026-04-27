import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ReplayDecision } from "@/lib/mockReplay";

interface DecisionDetailCardProps {
  decision: ReplayDecision;
}

const SEV_VARIANT = {
  SAFE: "safe",
  WATCH: "watch",
  WARN: "warn",
  BLOCK: "block",
} as const;

export function DecisionDetailCard({ decision }: DecisionDetailCardProps) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [feedback, setFeedback] = useState("");

  const submit = () => {
    toast.success(`Feedback recorded: ${vote ?? "neutral"}`);
    setVote(null);
    setFeedback("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>{decision.user_input}</CardTitle>
            <p className="mt-1 font-mono text-xs text-[var(--text-tertiary)]">
              {decision.trace_id} · {new Date(decision.timestamp).toLocaleString()}
            </p>
          </div>
          <Badge variant={SEV_VARIANT[decision.severity]}>
            {decision.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <section>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Output
          </p>
          <div className="rounded-md border border-border-subtle bg-bg-deep p-3 text-sm text-[var(--text-primary)]">
            {decision.output}
          </div>
        </section>

        <section>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Violations
          </p>
          <div className="flex flex-wrap gap-1.5">
            {decision.violations.length === 0 && (
              <Badge variant="safe">none</Badge>
            )}
            {decision.violations.map((v) => (
              <Badge key={v.agent} variant={SEV_VARIANT[v.severity]}>
                {v.agent} · {v.severity}
              </Badge>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Decision rationale
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            {decision.rationale}
          </p>
        </section>

        <section>
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Alternatives considered
          </p>
          <ul className="space-y-1">
            {decision.alternatives.map((a) => (
              <li
                key={a.action}
                className="flex items-start justify-between gap-3 rounded-md border border-border-subtle bg-bg-elevated px-3 py-2"
              >
                <div>
                  <p className="font-mono text-xs text-[var(--text-primary)]">
                    {a.action}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {a.why_not}
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {(a.expected_score * 100).toFixed(0)}%
                </Badge>
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        <section>
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Was this the right call?
          </p>
          <div className="mb-2 flex items-center gap-2">
            <Button
              variant={vote === "up" ? "default" : "outline"}
              size="sm"
              onClick={() => setVote("up")}
              className="gap-2"
            >
              <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
              Yes
            </Button>
            <Button
              variant={vote === "down" ? "default" : "outline"}
              size="sm"
              onClick={() => setVote("down")}
              className="gap-2"
            >
              <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
              No
            </Button>
          </div>
          <textarea
            placeholder="Optional: tell us what we should have done."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="h-20 w-full resize-none rounded-md border border-border-subtle bg-bg-deep p-2 font-mono text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-signal-causal"
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={vote === null}
              onClick={submit}
            >
              Submit feedback
            </Button>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
