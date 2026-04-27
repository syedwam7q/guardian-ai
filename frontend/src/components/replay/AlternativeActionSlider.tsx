import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReplayDecision } from "@/lib/mockReplay";

interface AlternativeActionSliderProps {
  decision: ReplayDecision;
}

export function AlternativeActionSlider({
  decision,
}: AlternativeActionSliderProps) {
  const [selected, setSelected] = useState<string>(
    decision.alternatives[0]?.action ?? "",
  );

  useEffect(() => {
    setSelected(decision.alternatives[0]?.action ?? "");
  }, [decision]);

  const alt = decision.alternatives.find((a) => a.action === selected);
  const outcome = decision.alt_outcomes[selected];

  return (
    <Card>
      <CardHeader>
        <CardTitle>What would the alternative have done?</CardTitle>
        <CardDescription>
          Pick a candidate action to see the predicted outcome.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {decision.alternatives.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No alternatives were considered for this decision.
          </p>
        ) : (
          <>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-mono text-sm text-[var(--text-primary)]"
            >
              {decision.alternatives.map((a) => (
                <option key={a.action} value={a.action}>
                  {a.action}
                </option>
              ))}
            </select>

            {alt && (
              <div className="rounded-md border border-border-subtle bg-bg-elevated p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                  Why it wasn't chosen
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {alt.why_not}
                </p>
                <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                  Expected outcome
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {outcome ?? "—"}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-2 font-mono text-[11px]">
                  <span className="text-[var(--text-tertiary)]">
                    Expected utility
                  </span>
                  <span className="text-[var(--text-primary)]">
                    {(alt.expected_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
