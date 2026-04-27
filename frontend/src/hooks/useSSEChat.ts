import { useCallback, useState } from "react";

export type SSEEvent =
  | { event: "trace"; data: { trace_id: string } }
  | { event: "retrieval"; data: { doc_ids: string[]; scores: number[] } }
  | { event: "token"; data: string }
  | { event: "blocked"; data: { verdicts: unknown[] } }
  | { event: "verdicts"; data: unknown[] }
  | { event: "decision"; data: unknown }
  | { event: "error"; data: { message: string } }
  | { event: "done"; data: "" };

export interface ChatRequestBody {
  user_input: string;
  session_id: string;
  domain?: string;
  k?: number;
  model?: string;
}

export interface UseSSEChatResult {
  events: SSEEvent[];
  loading: boolean;
  error: string | null;
  send: (body: ChatRequestBody) => Promise<void>;
  reset: () => void;
}

interface ViteEnv {
  VITE_API_BASE?: string;
}
const VITE_ENV: ViteEnv =
  (import.meta as unknown as { env?: ViteEnv }).env ?? {};
const API_BASE = VITE_ENV.VITE_API_BASE ?? "http://localhost:8000";

export function useSSEChat(): UseSSEChatResult {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setEvents([]);
    setError(null);
  }, []);

  const send = useCallback(async (body: ChatRequestBody) => {
    setLoading(true);
    setError(null);
    setEvents([]);

    try {
      const resp = await fetch(`${API_BASE}/api/medrag/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(body),
      });
      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // SSE blocks separated by blank line. Each block has lines like:
      //   event: <name>
      //   data: <payload>
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let blockEnd = buffer.indexOf("\n\n");
        while (blockEnd !== -1) {
          const block = buffer.slice(0, blockEnd);
          buffer = buffer.slice(blockEnd + 2);
          const parsed = parseSSEBlock(block);
          if (parsed) setEvents((prev) => [...prev, parsed]);
          blockEnd = buffer.indexOf("\n\n");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  return { events, loading, error, send, reset };
}

function parseSSEBlock(block: string): SSEEvent | null {
  let event = "message";
  let dataRaw = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event: ")) event = line.slice(7).trim();
    else if (line.startsWith("data: ")) dataRaw += line.slice(6);
  }
  if (!event) return null;

  // `token` events emit raw delta strings (NOT json). `done` is empty.
  if (event === "token") return { event: "token", data: dataRaw } as SSEEvent;
  if (event === "done") return { event: "done", data: "" } as SSEEvent;
  try {
    const data = dataRaw.length > 0 ? JSON.parse(dataRaw) : null;
    return { event, data } as SSEEvent;
  } catch {
    return null;
  }
}
