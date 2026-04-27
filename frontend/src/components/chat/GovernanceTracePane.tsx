import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AgentVerdictRow,
  type AgentSeverity,
} from "@/components/chat/AgentVerdictRow";
import type { SSEEvent } from "@/hooks/useSSEChat";

interface GovernanceTracePaneProps {
  events: SSEEvent[];
  loading: boolean;
}

const PRE_FLIGHT_AGENTS: { key: string; label: string }[] = [
  { key: "prompt_injection", label: "Prompt Injection" },
  { key: "pii_in", label: "PII-In" },
  { key: "policy", label: "Policy" },
];

const POST_FLIGHT_AGENTS: { key: string; label: string }[] = [
  { key: "hallucination", label: "Hallucination" },
  { key: "bias", label: "Bias" },
  { key: "pii_out", label: "PII-Out" },
  { key: "cost", label: "Cost" },
];

interface VerdictShape {
  agent?: string | { value?: string };
  severity?: string;
  confidence?: number;
  latency_ms?: number;
}

interface DecisionShape {
  action?: string;
  rationale?: string;
}

function agentValue(agent: VerdictShape["agent"]): string | null {
  if (typeof agent === "string") return agent;
  if (agent && typeof agent === "object" && "value" in agent) {
    return typeof agent.value === "string" ? agent.value : null;
  }
  return null;
}

function normalizeSeverity(raw: string | undefined): AgentSeverity {
  if (!raw) return "pending";
  const upper = raw.toUpperCase();
  if (
    upper === "SAFE" ||
    upper === "WATCH" ||
    upper === "WARN" ||
    upper === "BLOCK"
  ) {
    return upper;
  }
  return "pending";
}

export function GovernanceTracePane({
  events,
  loading,
}: GovernanceTracePaneProps) {
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const traceId = useMemo(() => {
    const ev = events.find((e) => e.event === "trace");
    if (!ev) return null;
    const data = ev.data as { trace_id?: string };
    return data?.trace_id ?? null;
  }, [events]);

  const verdictsByAgent = useMemo(() => {
    const map = new Map<string, VerdictShape>();

    // The `verdicts` event carries the canonical roll-up.
    const verdictsEv = events.find((e) => e.event === "verdicts");
    if (verdictsEv) {
      const list = (verdictsEv.data as VerdictShape[]) ?? [];
      for (const v of list) {
        const k = agentValue(v.agent);
        if (k) map.set(k, v);
      }
    }

    // Pre-flight BLOCK path: backend emits `blocked` with verdicts only.
    const blockedEv = events.find((e) => e.event === "blocked");
    if (blockedEv) {
      const data = blockedEv.data as { verdicts?: VerdictShape[] };
      for (const v of data?.verdicts ?? []) {
        const k = agentValue(v.agent);
        if (k && !map.has(k)) map.set(k, v);
      }
    }
    return map;
  }, [events]);

  const decision = useMemo<DecisionShape | null>(() => {
    const ev = events.find((e) => e.event === "decision");
    return ev ? ((ev.data as DecisionShape) ?? null) : null;
  }, [events]);

  function rowFor(key: string, label: string, index: number) {
    const v = verdictsByAgent.get(key);
    const severity = v ? normalizeSeverity(v.severity) : "pending";
    const phaseKey = severity === "pending" ? "pending" : "filled";
    return (
      <motion.div
        key={key}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.04 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={phaseKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AgentVerdictRow
              agent={label}
              severity={severity}
              confidence={v?.confidence}
              latency_ms={v?.latency_ms}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    );
  }

  async function copyTraceId() {
    if (!traceId) return;
    try {
      await navigator.clipboard.writeText(traceId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy trace ID");
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border-subtle bg-bg-deep">
      <div className="border-b border-border-subtle px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
          Governance Trace
        </p>
        <div className="mt-1 flex items-center gap-2">
          <code className="truncate font-mono text-sm text-[var(--text-primary)]">
            {traceId ? `${traceId.slice(0, 8)}…${traceId.slice(-4)}` : "—"}
          </code>
          {traceId && (
            <button
              type="button"
              onClick={copyTraceId}
              title="Copy trace ID"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-[var(--text-secondary)] transition-colors hover:bg-bg-elevated hover:text-[var(--text-primary)]"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="sr-only">Copy trace ID</span>
            </button>
          )}
          {loading && (
            <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-causal">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-causal animate-pulse" />
              streaming
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 px-5 py-4">
          <section>
            <h4 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Pre-flight
            </h4>
            <div className="space-y-1.5">
              {PRE_FLIGHT_AGENTS.map((a, i) => rowFor(a.key, a.label, i))}
            </div>
          </section>

          <Separator />

          <section>
            <h4 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
              Post-flight
            </h4>
            <div className="space-y-1.5">
              {POST_FLIGHT_AGENTS.map((a, i) => rowFor(a.key, a.label, i))}
            </div>
          </section>

          {decision && (
            <>
              <Separator />
              <section>
                <h4 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                  Decision
                </h4>
                <div className="rounded-md border border-signal-causal/30 bg-signal-causal/10 p-3">
                  {decision.action && (
                    <p className="font-mono text-sm text-signal-causal">
                      {decision.action}
                    </p>
                  )}
                  {decision.rationale && (
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {decision.rationale}
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-border-subtle px-5 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowJson((v) => !v)}
          className="w-full justify-start"
        >
          {showJson ? "Hide" : "Show"} Trace JSON
        </Button>
        {showJson && (
          <details open className="mt-2">
            <summary className="cursor-pointer text-xs text-[var(--text-secondary)]">
              {events.length} events
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-border-subtle bg-bg-surface p-3 font-mono text-[10px] text-[var(--text-secondary)]">
              {JSON.stringify(events, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </aside>
  );
}
