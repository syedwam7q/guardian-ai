import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ALL_AGENTS, type AgentName } from "@/lib/mockEvents";
import { cn } from "@/lib/utils";

const ENVS = ["Dev", "Staging", "Prod"] as const;
type Env = (typeof ENVS)[number];

type State = Record<AgentName, Record<Env, boolean>>;

function initial(): State {
  const s: State = {} as State;
  for (const a of ALL_AGENTS) {
    s[a] = { Dev: true, Staging: true, Prod: true };
  }
  return s;
}

interface SwitchProps {
  on: boolean;
  onClick: () => void;
  label: string;
}

function Switch({ on, onClick, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full border transition-colors",
        on
          ? "border-signal-causal/60 bg-signal-causal/40"
          : "border-border-subtle bg-bg-elevated",
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-bg-surface shadow-sm transition-transform",
          on ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function AgentToggleMatrix() {
  const [state, setState] = useState<State>(initial);

  const toggle = (agent: AgentName, env: Env) => {
    setState((prev) => ({
      ...prev,
      [agent]: { ...prev[agent], [env]: !prev[agent][env] },
    }));
    toast.success(`${agent} on ${env} — setting saved (mock)`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent / environment matrix</CardTitle>
        <CardDescription>
          Enable or disable individual agents per environment. Disabling all of
          a category is permitted but not recommended.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="border-b border-border-subtle">
            <tr className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              <th className="py-2 pr-3 text-left">Agent</th>
              {ENVS.map((e) => (
                <th key={e} className="py-2 pr-3 text-center">
                  {e}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_AGENTS.map((agent) => (
              <tr
                key={agent}
                className="border-b border-border-subtle/60 last:border-0"
              >
                <td className="py-2 pr-3 font-mono text-xs text-[var(--text-primary)]">
                  {agent}
                </td>
                {ENVS.map((env) => (
                  <td key={env} className="py-2 text-center">
                    <Switch
                      on={state[agent][env]}
                      onClick={() => toggle(agent, env)}
                      label={`${agent} on ${env}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
