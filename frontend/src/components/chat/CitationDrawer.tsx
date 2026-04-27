import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface CitationDrawerProps {
  selectedCitation: number | null;
  docIds: string[];
  scores: number[];
  onOpenChange: (open: boolean) => void;
}

export function CitationDrawer({
  selectedCitation,
  docIds,
  scores,
  onOpenChange,
}: CitationDrawerProps) {
  const open = selectedCitation !== null;
  // Citations are 1-indexed in rendered text.
  const idx = selectedCitation !== null ? selectedCitation - 1 : -1;
  const docId = idx >= 0 ? (docIds[idx] ?? null) : null;
  const score = idx >= 0 ? (scores[idx] ?? null) : null;

  // NOTE: The SSE stream only emits doc_ids + scores at retrieval time.
  // Surfacing the full document body requires a dedicated endpoint
  // (e.g. GET /api/medrag/doc/:id) — Phase 4+ follow-up.
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col gap-4"
      >
        <SheetHeader>
          <SheetTitle>
            Citation [{selectedCitation ?? "—"}]
          </SheetTitle>
          <SheetDescription>
            Source document referenced by the assistant.
          </SheetDescription>
        </SheetHeader>

        {docId ? (
          <div className="space-y-4">
            <div className="rounded-md border border-border-subtle bg-bg-elevated p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                doc_id
              </p>
              <p className="mt-1 break-all font-mono text-sm text-[var(--text-primary)]">
                {docId}
              </p>
            </div>
            {typeof score === "number" && (
              <div className="rounded-md border border-border-subtle bg-bg-elevated p-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                  retrieval score
                </p>
                <p className="mt-1 font-mono text-sm text-[var(--text-primary)]">
                  {score.toFixed(4)}
                </p>
              </div>
            )}
            <div className="rounded-md border border-dashed border-border-strong p-3 text-xs text-[var(--text-secondary)]">
              Document details from corpus. Full-text fetch via a dedicated endpoint
              is a Phase 4+ follow-up.
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            No retrieval data for this citation yet.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
