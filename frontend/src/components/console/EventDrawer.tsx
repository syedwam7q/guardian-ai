import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ErrorBar,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { AgentVerdictRow } from "@/components/chat/AgentVerdictRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ALL_AGENTS, type GovEvent } from "@/lib/mockEvents";

interface EventDrawerProps {
  event: GovEvent | null;
  onOpenChange: (open: boolean) => void;
}

function buildTraceJson(event: GovEvent) {
  return {
    trace_id: event.trace_id,
    timestamp: event.timestamp,
    user_input: event.query_preview,
    pipeline: {
      preflight: {
        prompt_injection: { severity: "SAFE", confidence: 0.92, latency_ms: 64 },
        pii_in: { severity: "SAFE", confidence: 0.87, latency_ms: 38 },
        policy: { severity: "WATCH", confidence: 0.71, latency_ms: 22 },
      },
      generation: { latency_ms: 1820, tokens: 142 },
      postflight: {
        hallucination: { severity: "WATCH", confidence: 0.66, latency_ms: 254 },
        bias: { severity: "SAFE", confidence: 0.82, latency_ms: 109 },
        pii_out: { severity: "SAFE", confidence: 0.94, latency_ms: 41 },
        cost: { severity: "SAFE", confidence: 0.99, latency_ms: 11 },
      },
    },
    decision: {
      action: event.action,
      rationale: "Policy disclaimer attached due to dosage-adjacent terminology.",
      severity: event.severity,
    },
  };
}

function buildVerdicts(event: GovEvent) {
  // Pin the click target's agent to its actual severity; randomise others.
  const seed = event.id
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ALL_AGENTS.map((agent, i) => {
    if (agent === event.agent) {
      return {
        agent,
        severity: event.severity,
        confidence: event.confidence,
        latency_ms: event.latency_ms,
      };
    }
    const r = ((seed + i * 31) % 100) / 100;
    let sev: "SAFE" | "WATCH" | "WARN" | "BLOCK" = "SAFE";
    if (r > 0.94) sev = "BLOCK";
    else if (r > 0.82) sev = "WARN";
    else if (r > 0.65) sev = "WATCH";
    return {
      agent,
      severity: sev,
      confidence: 0.7 + r * 0.25,
      latency_ms: 30 + Math.floor(r * 200),
    };
  });
}

const CAUSAL_DATA = [
  { node: "retrieval_k", effect: 0.62, lo: 0.51, hi: 0.73 },
  { node: "temperature", effect: 0.18, lo: 0.05, hi: 0.31 },
  { node: "model_choice", effect: 0.09, lo: -0.02, hi: 0.21 },
];

export function EventDrawer({ event, onOpenChange }: EventDrawerProps) {
  const [copied, setCopied] = useState(false);

  const traceJson = useMemo(
    () => (event ? buildTraceJson(event) : null),
    [event],
  );
  const verdicts = useMemo(
    () => (event ? buildVerdicts(event) : []),
    [event],
  );

  const copy = async () => {
    if (!traceJson) return;
    await navigator.clipboard.writeText(JSON.stringify(traceJson, null, 2));
    setCopied(true);
    toast.success("Trace JSON copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Sheet open={event !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-y-auto sm:max-w-3xl"
      >
        {event && traceJson && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">
                  {event.trace_id}
                </Badge>
                <Badge
                  variant={
                    event.severity === "SAFE"
                      ? "safe"
                      : event.severity === "WATCH"
                        ? "watch"
                        : event.severity === "WARN"
                          ? "warn"
                          : "block"
                  }
                >
                  {event.severity}
                </Badge>
              </div>
              <SheetTitle className="text-xl">
                {event.query_preview}
              </SheetTitle>
              <p className="font-mono text-xs text-[var(--text-tertiary)]">
                {new Date(event.timestamp).toLocaleString()} · {event.agent}
              </p>
            </SheetHeader>

            <Tabs defaultValue="trace" className="mt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="trace">Trace JSON</TabsTrigger>
                <TabsTrigger value="verdicts">Verdicts</TabsTrigger>
                <TabsTrigger value="causal">Causal</TabsTrigger>
                <TabsTrigger value="decision">Decision</TabsTrigger>
              </TabsList>

              <TabsContent value="trace" className="space-y-2">
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copy}
                    className="gap-2"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <pre className="max-h-[480px] overflow-auto rounded-md border border-border-subtle bg-bg-deep p-4 font-mono text-xs leading-relaxed text-[var(--text-secondary)]">
                  {JSON.stringify(traceJson, null, 2)}
                </pre>
              </TabsContent>

              <TabsContent value="verdicts" className="space-y-2">
                {verdicts.map((v) => (
                  <AgentVerdictRow key={v.agent} {...v} />
                ))}
              </TabsContent>

              <TabsContent value="causal" className="space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  Top contributing nodes for this trace, ranked by estimated
                  causal effect with 95% bootstrap CI.
                </p>
                <div className="h-[260px] rounded-md border border-border-subtle bg-bg-deep p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={CAUSAL_DATA}
                      layout="vertical"
                      margin={{ top: 8, right: 24, left: 24, bottom: 8 }}
                    >
                      <CartesianGrid
                        stroke="var(--border-subtle)"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        domain={[0, 1]}
                        stroke="var(--text-tertiary)"
                        fontSize={10}
                      />
                      <YAxis
                        type="category"
                        dataKey="node"
                        stroke="var(--text-tertiary)"
                        fontSize={10}
                        width={100}
                      />
                      <Bar dataKey="effect" fill="var(--signal-causal)">
                        <ErrorBar
                          dataKey={(d: (typeof CAUSAL_DATA)[number]) => [
                            d.effect - d.lo,
                            d.hi - d.effect,
                          ]}
                          width={6}
                          stroke="var(--text-secondary)"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-1 font-mono text-xs">
                  {CAUSAL_DATA.map((c) => (
                    <li
                      key={c.node}
                      className="flex justify-between rounded-md border border-border-subtle bg-bg-elevated px-3 py-1.5"
                    >
                      <span className="text-[var(--text-primary)]">
                        {c.node}
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        +{c.effect.toFixed(2)} [{c.lo.toFixed(2)},{" "}
                        {c.hi.toFixed(2)}]
                      </span>
                    </li>
                  ))}
                </ul>
              </TabsContent>

              <TabsContent value="decision" className="space-y-4">
                <div className="rounded-md border border-border-subtle bg-bg-elevated p-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                    Action chosen
                  </p>
                  <p className="mt-1 font-display text-lg text-[var(--text-primary)]">
                    {event.action}
                  </p>
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">
                    Disclaimer attached: dosing terminology in the input
                    triggered the medical policy rule. Generation proceeded with
                    automatic disclaimer prefix.
                  </p>
                </div>

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                    Alternatives considered
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
                    <li className="rounded-md border border-border-subtle bg-bg-elevated px-3 py-2">
                      <span className="font-mono text-xs text-[var(--text-primary)]">
                        block
                      </span>{" "}
                      — rejected: policy severity was WATCH, not BLOCK.
                    </li>
                    <li className="rounded-md border border-border-subtle bg-bg-elevated px-3 py-2">
                      <span className="font-mono text-xs text-[var(--text-primary)]">
                        passthrough
                      </span>{" "}
                      — rejected: policy required user-facing disclaimer.
                    </li>
                  </ul>
                </div>

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                    Expected outcome
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    User receives a medically-grounded answer with a clear
                    disclaimer that they must consult a clinician before acting.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
