import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AgentSeverity =
  | "SAFE"
  | "WATCH"
  | "WARN"
  | "BLOCK"
  | "pending";

interface AgentVerdictRowProps {
  agent: string;
  severity: AgentSeverity;
  confidence?: number;
  latency_ms?: number;
}

function severityToVariant(s: AgentSeverity): "safe" | "watch" | "warn" | "block" | "outline" {
  switch (s) {
    case "SAFE":
      return "safe";
    case "WATCH":
      return "watch";
    case "WARN":
      return "warn";
    case "BLOCK":
      return "block";
    default:
      return "outline";
  }
}

export function AgentVerdictRow({
  agent,
  severity,
  confidence,
  latency_ms,
}: AgentVerdictRowProps) {
  const isPending = severity === "pending";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-elevated px-3 py-2",
        isPending && "animate-pulse opacity-70",
      )}
    >
      <span className="text-sm font-medium text-[var(--text-primary)]">
        {agent}
      </span>
      <div className="flex items-center gap-3">
        {!isPending && typeof confidence === "number" && (
          <span className="font-mono text-xs text-[var(--text-tertiary)]">
            {(confidence * 100).toFixed(0)}%
          </span>
        )}
        {!isPending && typeof latency_ms === "number" && (
          <span className="font-mono text-xs text-[var(--text-tertiary)]">
            {latency_ms.toFixed(0)}ms
          </span>
        )}
        <Badge variant={severityToVariant(severity)}>
          {isPending ? "pending" : severity}
        </Badge>
      </div>
    </div>
  );
}
