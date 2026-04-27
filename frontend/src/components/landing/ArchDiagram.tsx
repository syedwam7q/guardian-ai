import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Stage = "pre" | "during" | "post";

interface AgentInfo {
  key: string;
  label: string;
  description: string;
  stage: Stage;
  severity: "safe" | "watch" | "block" | "causal";
  detail: string;
}

const AGENTS: AgentInfo[] = [
  {
    key: "prompt_injection",
    label: "Prompt Injection",
    description: "Detects jailbreaks and instruction overrides on input.",
    stage: "pre",
    severity: "block",
    detail:
      "Heuristics + classifier signals against known injection patterns. Hard-blocks on confirmed adversarial intent.",
  },
  {
    key: "pii_in",
    label: "PII-In",
    description: "Flags personally identifiable information on input.",
    stage: "pre",
    severity: "block",
    detail:
      "Regex + NER detection for names, emails, phone, MRN, SSN. Escalates to BLOCK when sensitive data is uncovered.",
  },
  {
    key: "policy",
    label: "Policy",
    description: "Enforces domain policy (e.g. no medical advice claims).",
    stage: "pre",
    severity: "watch",
    detail:
      "Configurable per-domain policy DSL. Default profile bundles medical safety, legal disclaimers, and abuse prevention.",
  },
  {
    key: "retrieval",
    label: "Retrieval",
    description: "Grounded RAG over the corpus.",
    stage: "during",
    severity: "causal",
    detail:
      "BM25 + dense retrieval, ranked. Documents are surfaced as citations and re-checked at post-flight.",
  },
  {
    key: "generation",
    label: "Generation",
    description: "Streamed model output via the configured provider.",
    stage: "during",
    severity: "causal",
    detail:
      "Currently routes to Groq llama-3.3-70b. Tokens are streamed back over SSE for sub-second TTFT.",
  },
  {
    key: "hallucination",
    label: "Hallucination",
    description: "Verifies output is grounded in retrieved context.",
    stage: "post",
    severity: "watch",
    detail:
      "Span-level entailment scoring against citations. Watch when claims drift, block when wholly unsupported.",
  },
  {
    key: "bias",
    label: "Bias",
    description: "Flags demographic or fairness concerns.",
    stage: "post",
    severity: "watch",
    detail:
      "Lexical + classifier-based bias signal. Raises WATCH and surfaces affected spans in the trace.",
  },
  {
    key: "pii_out",
    label: "PII-Out",
    description: "Catches PII that leaked through generation.",
    stage: "post",
    severity: "block",
    detail:
      "Mirrors the pre-flight detector across the rendered output. Triggers automatic redaction on hit.",
  },
  {
    key: "cost",
    label: "Cost",
    description: "Tracks tokens, latency, and budget.",
    stage: "post",
    severity: "watch",
    detail:
      "Per-trace cost roll-up. Suggests fallback models when budget thresholds are crossed.",
  },
];

const STAGE_CONFIG: Record<Stage, { title: string; subtitle: string }> = {
  pre: {
    title: "Pre-flight",
    subtitle: "Runs before generation. Can hard-block.",
  },
  during: {
    title: "Generation",
    subtitle: "Retrieval + streamed model output.",
  },
  post: {
    title: "Post-flight",
    subtitle: "Runs after generation. Verifies, redacts, scores.",
  },
};

const LEGEND: { label: string; severity: AgentInfo["severity"]; meaning: string }[] = [
  { label: "SAFE", severity: "safe", meaning: "No issues detected" },
  { label: "WATCH", severity: "watch", meaning: "Surface as warning" },
  { label: "BLOCK", severity: "block", meaning: "Hard stop or auto-redact" },
  { label: "CAUSAL", severity: "causal", meaning: "Pipeline component" },
];

const STAGE_DETAILS: { title: string; guarantee: string }[] = [
  {
    title: "Pre-flight",
    guarantee:
      "Latency budget ≤ 200ms. Runs in parallel with timeouts. Any BLOCK halts the trace.",
  },
  {
    title: "Generation",
    guarantee:
      "RAG context attached. Tokens streamed via SSE. Trace ID issued before first token.",
  },
  {
    title: "Post-flight",
    guarantee:
      "Independent verifiers. Redactions applied after the stream closes. Decisions optional, surfaced via the decision_engine.",
  },
];

export function ArchDiagram() {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-xl border border-border-subtle bg-bg-surface p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {(["pre", "during", "post"] as const).map((stage) => {
            const { title, subtitle } = STAGE_CONFIG[stage];
            const stageAgents = AGENTS.filter((a) => a.stage === stage);
            return (
              <div key={stage} className="flex flex-col">
                <div className="mb-3 border-b border-border-subtle pb-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                    Stage
                  </p>
                  <h3 className="font-display text-lg text-[var(--text-primary)]">
                    {title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {subtitle}
                  </p>
                </div>
                <ul className="flex flex-col gap-3">
                  {stageAgents.map((a) => (
                    <Tooltip key={a.key}>
                      <TooltipTrigger asChild>
                        <li
                          tabIndex={0}
                          className={cn(
                            "group cursor-default rounded-lg border border-border-subtle bg-bg-elevated p-4 transition-colors",
                            "hover:border-border-strong focus-visible:border-border-strong focus-visible:outline-none",
                          )}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="font-display text-sm text-[var(--text-primary)]">
                              {a.label}
                            </span>
                            <Badge variant={a.severity}>{a.severity}</Badge>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {a.description}
                          </p>
                        </li>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        {a.detail}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border-subtle pt-6">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Severity
          </span>
          {LEGEND.map((l) => (
            <span
              key={l.label}
              className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
            >
              <Badge variant={l.severity}>{l.label}</Badge>
              <span>{l.meaning}</span>
            </span>
          ))}
        </div>

        {/* Disclosure */}
        <details className="group mt-6 rounded-lg border border-border-subtle bg-bg-elevated p-4">
          <summary className="cursor-pointer list-none text-sm font-medium text-[var(--text-primary)] [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <span className="text-signal-causal transition-transform group-open:rotate-90">
                &rsaquo;
              </span>
              Architecture details
            </span>
          </summary>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {STAGE_DETAILS.map((d) => (
              <div key={d.title}>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                  {d.title}
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {d.guarantee}
                </p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </TooltipProvider>
  );
}
