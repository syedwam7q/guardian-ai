import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
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
const BOLD_SPLIT_RE = /(\*\*[^*]+\*\*)/g;
const BOLD_MATCH_RE = /^\*\*([^*]+)\*\*$/;

export function MessageBubble({
  role,
  content,
  streaming = false,
  onCitationClick,
  activeCitation = null,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const isBlocked = role === "blocked";

  // Streaming assistant tokens are mirrored into a live region so screen
  // readers announce them as they arrive.
  const liveProps =
    streaming && !isUser
      ? ({
          role: "status" as const,
          "aria-live": "polite" as const,
          "aria-atomic": "false" as const,
        })
      : {};

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        {...liveProps}
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
        <div className="break-words">
          {renderRichContent(content, onCitationClick, activeCitation)}
          {streaming && (
            <span
              aria-hidden="true"
              className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-signal-causal motion-safe:animate-pulse"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Splits content on double-newline into paragraphs, then within each paragraph
 * resolves [n] citations and **bold** runs. Single newlines are preserved as
 * line breaks. No markdown lib — keep it tiny.
 */
function renderRichContent(
  content: string,
  onCitationClick?: (n: number) => void,
  activeCitation: number | null = null,
): ReactNode {
  if (content.length === 0) return null;
  const paragraphs = content.split(/\n\n+/);
  return paragraphs.map((para, pIdx) => {
    const lines = para.split("\n");
    return (
      <p
        key={pIdx}
        className={cn(
          pIdx > 0 && "mt-3",
          "whitespace-pre-wrap",
        )}
      >
        {lines.map((line, lIdx) => (
          <Fragment key={lIdx}>
            {lIdx > 0 && <br />}
            {renderInline(line, onCitationClick, activeCitation, `${pIdx}-${lIdx}`)}
          </Fragment>
        ))}
      </p>
    );
  });
}

function renderInline(
  text: string,
  onCitationClick: ((n: number) => void) | undefined,
  activeCitation: number | null,
  baseKey: string,
): ReactNode[] {
  const out: ReactNode[] = [];
  // First pass: split on bold markers.
  const boldChunks = text.split(BOLD_SPLIT_RE);
  boldChunks.forEach((chunk, bIdx) => {
    const boldMatch = BOLD_MATCH_RE.exec(chunk);
    if (boldMatch) {
      out.push(
        <strong key={`${baseKey}-b-${bIdx}`} className="font-semibold">
          {renderCitations(boldMatch[1], onCitationClick, activeCitation, `${baseKey}-b-${bIdx}`)}
        </strong>,
      );
    } else {
      out.push(
        <Fragment key={`${baseKey}-t-${bIdx}`}>
          {renderCitations(chunk, onCitationClick, activeCitation, `${baseKey}-t-${bIdx}`)}
        </Fragment>,
      );
    }
  });
  return out;
}

function renderCitations(
  text: string,
  onCitationClick: ((n: number) => void) | undefined,
  activeCitation: number | null,
  baseKey: string,
): ReactNode[] {
  const parts = text.split(CITATION_SPLIT_RE);
  return parts.map((part, idx) => {
    const matched = CITATION_MATCH_RE.exec(part);
    if (matched) {
      const n = Number(matched[1]);
      return (
        <CitationBadge
          key={`${baseKey}-c-${idx}`}
          n={n}
          active={activeCitation === n}
          onClick={onCitationClick}
        />
      );
    }
    return <Fragment key={`${baseKey}-c-${idx}`}>{part}</Fragment>;
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
      aria-label={`Citation ${n}`}
      onClick={() => onClick?.(n)}
      className={cn(
        "mx-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 align-baseline font-mono text-xs",
        "bg-signal-causal/20 text-signal-causal",
        "transition-transform hover:scale-110 hover:bg-signal-causal/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-causal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep",
        active && "ring-1 ring-signal-causal/60 bg-signal-causal/30",
        pulse && "scale-110",
      )}
    >
      <sup className="leading-none">{n}</sup>
    </button>
  );
}
