import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RankedCausesList } from "@/components/causal/RankedCausesList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { counterfactualCauses } from "@/lib/mockDag";

const MODELS = ["gpt-4o-mini", "claude-3-haiku", "llama-3.1-8b"];

export function CounterfactualPlayground() {
  const [k, setK] = useState(5);
  const [temp, setTemp] = useState(0.7);
  const [model, setModel] = useState(MODELS[0]);
  const [running, setRunning] = useState(false);
  const [appliedKey, setAppliedKey] = useState(`${k}|${temp}|${model}`);

  // Debounced re-run on slider/select change.
  useEffect(() => {
    const key = `${k}|${temp}|${model}`;
    if (key === appliedKey) return;
    setRunning(true);
    const t = setTimeout(() => {
      setAppliedKey(key);
      setRunning(false);
    }, 400);
    return () => clearTimeout(t);
  }, [k, temp, model, appliedKey]);

  const causes = useMemo(() => {
    const [pk, pt, pm] = appliedKey.split("|");
    return counterfactualCauses(Number(pk), Number(pt), pm);
  }, [appliedKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Counterfactual playground</CardTitle>
        <CardDescription>
          Change a knob to simulate "what if". Mock-only — uses a deterministic
          shuffle of the ranked causes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-[var(--text-secondary)]">Top-K</span>
            <span className="text-[var(--text-primary)]">{k}</span>
          </div>
          <input
            type="range"
            min={1}
            max={15}
            step={1}
            value={k}
            onChange={(e) => setK(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-bg-elevated accent-signal-causal"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-[var(--text-secondary)]">Temperature</span>
            <span className="text-[var(--text-primary)]">{temp.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={temp}
            onChange={(e) => setTemp(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-bg-elevated accent-signal-causal"
          />
        </div>

        <div className="space-y-2">
          <div className="font-mono text-xs text-[var(--text-secondary)]">
            Model
          </div>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-bg-elevated px-3 py-1.5 font-mono text-xs text-[var(--text-primary)]"
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 border-t border-border-subtle pt-3 font-mono text-[11px] text-[var(--text-tertiary)]">
          {running ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Re-running diagnosis…
            </>
          ) : (
            <span className="text-signal-safe">● synced</span>
          )}
        </div>

        <RankedCausesList causes={causes} compact />
      </CardContent>
    </Card>
  );
}
