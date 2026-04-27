import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CitationDrawer } from "@/components/chat/CitationDrawer";
import {
  ConversationPane,
  type ConversationMessage,
} from "@/components/chat/ConversationPane";
import { GovernanceTracePane } from "@/components/chat/GovernanceTracePane";
import { useSSEChat, type SSEEvent } from "@/hooks/useSSEChat";

interface TraceHistoryRecord {
  trace_id: string | null;
  events: SSEEvent[];
}

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function pickRetrieval(events: SSEEvent[]): {
  doc_ids: string[];
  scores: number[];
} {
  const ev = events.find((e) => e.event === "retrieval");
  if (!ev) return { doc_ids: [], scores: [] };
  const data = ev.data as { doc_ids?: string[]; scores?: number[] };
  return {
    doc_ids: data?.doc_ids ?? [],
    scores: data?.scores ?? [],
  };
}

export default function Chat() {
  const sessionIdRef = useRef<string>(newSessionId());
  const { events, loading, error, send } = useSSEChat();

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [history, setHistory] = useState<TraceHistoryRecord[]>([]);
  const [selectedCitation, setSelectedCitation] = useState<number | null>(null);

  // When a stream completes (loading flips false after we had events),
  // archive the assistant message and the events under their trace_id.
  const archivedRef = useRef(false);
  useEffect(() => {
    if (loading) {
      archivedRef.current = false;
      return;
    }
    if (events.length === 0 || archivedRef.current) return;
    archivedRef.current = true;

    const wasBlocked = events.some((e) => e.event === "blocked");
    const tokens = events
      .filter((e) => e.event === "token")
      .map((e) => e.data as string)
      .join("");
    const traceEv = events.find((e) => e.event === "trace");
    const traceId =
      (traceEv?.data as { trace_id?: string } | undefined)?.trace_id ?? null;

    if (wasBlocked) {
      setMessages((prev) => [
        ...prev,
        {
          id: newId("a"),
          role: "blocked",
          content:
            "This request was blocked at pre-flight. See the governance trace for the responsible agent and severity.",
        },
      ]);
    } else if (tokens.length > 0) {
      setMessages((prev) => [
        ...prev,
        { id: newId("a"), role: "assistant", content: tokens },
      ]);
    }

    setHistory((prev) => [...prev, { trace_id: traceId, events }]);

    const errEv = events.find((e) => e.event === "error");
    if (errEv) {
      const data = errEv.data as { message?: string };
      toast.error(data?.message ?? "Generation error");
    }
  }, [loading, events]);

  // Surface fetch-level errors via toast.
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleSubmit = useCallback(
    (text: string) => {
      setMessages((prev) => [
        ...prev,
        { id: newId("u"), role: "user", content: text },
      ]);
      void send({
        user_input: text,
        session_id: sessionIdRef.current,
      });
    },
    [send],
  );

  // Choose which retrieval to use for the citation drawer:
  // prefer the live stream, else the last archived record.
  const retrievalForDrawer = useMemo(() => {
    if (events.length > 0) return pickRetrieval(events);
    const last = history[history.length - 1];
    if (last) return pickRetrieval(last.events);
    return { doc_ids: [], scores: [] };
  }, [events, history]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border-subtle bg-bg-surface px-8 py-5">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
          MedRAG
        </p>
        <h1 className="font-display text-2xl text-[var(--text-primary)]">
          MedRAG Chat
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Live governance pipeline running on every response.
        </p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[3fr_2fr]">
        <ConversationPane
          messages={messages}
          liveEvents={events}
          loading={loading}
          error={error}
          onSubmit={handleSubmit}
          onCitationClick={(n) => setSelectedCitation(n)}
          activeCitation={selectedCitation}
        />
        <GovernanceTracePane events={events} loading={loading} />
      </div>

      <CitationDrawer
        selectedCitation={selectedCitation}
        docIds={retrievalForDrawer.doc_ids}
        scores={retrievalForDrawer.scores}
        onOpenChange={(open) => {
          if (!open) setSelectedCitation(null);
        }}
      />
    </div>
  );
}
