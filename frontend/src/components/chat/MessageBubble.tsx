import { Fragment, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant" | "blocked";
  content: string;
  streaming?: boolean;
  onCitationClick?: (n: number) => void;
  activeCitation?: number | null;
}

const CITATION_SPLIT_RE = /(\[\d+\])/g;
const CITATION_MATCH_RE = /^\[(\d+)\]$/;

export function MessageBubble({
  role,
  content,
  streaming = false,
  onCitationClick,
  activeCitation = null,
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
          {renderContentWithCitations(content, onCitationClick, activeCitation)}
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
  activeCitation: number | null = null,
) {
  const parts = content.split(CITATION_SPLIT_RE);
  return parts.map((part, idx) => {
    const matched = CITATION_MATCH_RE.exec(part);
    if (matched) {
      const n = Number(matched[1]);
      return (
        <CitationBadge
          key={idx}
          n={n}
          active={activeCitation === n}
          onClick={onCitationClick}
        />
      );
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

interface CitationBadgeProps {
  n: number;
  active: boolean;
  onClick?: (n: number) => void;
}

function CitationBadge({ n, active, onClick }: CitationBadgeProps) {
  const [pulse, setPulse] = useState(false);
  const initial = useRef(true);

  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    if (!active) return;
    setPulse(true);
    const id = window.setTimeout(() => setPulse(false), 350);
    return () => window.clearTimeout(id);
  }, [active]);

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onClick?.(n)}
      className={cn(
        "mx-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 align-baseline font-mono text-xs",
        "bg-signal-causal/20 text-signal-causal",
        "transition-transform hover:scale-110 hover:bg-signal-causal/30",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-causal",
        active && "ring-1 ring-signal-causal/60 bg-signal-causal/30",
        pulse && "scale-110",
      )}
    >
      <sup className="leading-none">{n}</sup>
    </button>
  );
}
