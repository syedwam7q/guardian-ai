import { Fragment } from "react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant" | "blocked";
  content: string;
  streaming?: boolean;
  onCitationClick?: (n: number) => void;
}

const CITATION_SPLIT_RE = /(\[\d+\])/g;
const CITATION_MATCH_RE = /^\[(\d+)\]$/;

export function MessageBubble({
  role,
  content,
  streaming = false,
  onCitationClick,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const isBlocked = role === "blocked";

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser &&
            "max-w-2xl bg-bg-elevated text-[var(--text-primary)] border border-border-subtle",
          !isUser &&
            !isBlocked &&
            "max-w-3xl bg-bg-surface text-[var(--text-primary)] border border-border-subtle",
          isBlocked &&
            "max-w-3xl bg-signal-block/10 text-[var(--text-primary)] border border-signal-block/40",
        )}
      >
        {isBlocked && (
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-signal-block">
            Blocked at pre-flight
          </p>
        )}
        <div className="whitespace-pre-wrap break-words">
          {renderContentWithCitations(content, onCitationClick)}
          {streaming && (
            <span
              aria-hidden
              className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-signal-causal"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function renderContentWithCitations(
  content: string,
  onCitationClick?: (n: number) => void,
) {
  const parts = content.split(CITATION_SPLIT_RE);
  return parts.map((part, idx) => {
    const matched = CITATION_MATCH_RE.exec(part);
    if (matched) {
      const n = Number(matched[1]);
      return (
        <button
          key={idx}
          type="button"
          onClick={() => onCitationClick?.(n)}
          className="mx-0.5 inline-flex h-5 items-center rounded border border-signal-causal/30 bg-signal-causal/15 px-1.5 align-baseline font-mono text-[11px] text-signal-causal transition-colors hover:bg-signal-causal/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-causal"
        >
          [{n}]
        </button>
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}
