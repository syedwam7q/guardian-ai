import { Download, FileJson } from "lucide-react";
import { Suspense, lazy, useState } from "react";
import { toast } from "sonner";
import { CausalGraph2D } from "@/components/causal/CausalGraph2D";
import { CounterfactualPlayground } from "@/components/causal/CounterfactualPlayground";
import { RankedCausesList } from "@/components/causal/RankedCausesList";
import { Button } from "@/components/ui/button";
import { RANKED_CAUSES } from "@/lib/mockDag";
import { cn } from "@/lib/utils";

const CausalGraph3D = lazy(() =>
  import("@/components/causal/CausalGraph3D").then((m) => ({
    default: m.CausalGraph3D,
  })),
);

type Mode = "2d" | "3d";

export default function CausalExplorer() {
  const [mode, setMode] = useState<Mode>("2d");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-border-subtle bg-bg-surface px-8 py-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
            Causal explainability
          </p>
          <h1 className="font-display text-2xl text-[var(--text-primary)]">
            Causal Explorer
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Inspect the LLM pipeline DAG, rank actual causes of violations, and
            simulate interventions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border-subtle bg-bg-elevated p-0.5">
            {(["2d", "3d"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-sm px-3 py-1 text-xs font-medium transition-colors",
                  mode === m
                    ? "bg-bg-surface text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                )}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="relative h-[560px] rounded-lg border border-border-subtle bg-bg-surface p-1 lg:col-span-2">
            {mode === "2d" ? (
              <CausalGraph2D onSelectNode={setSelectedNode} />
            ) : (
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center font-mono text-xs text-[var(--text-tertiary)]">
                    Loading 3D scene…
                  </div>
                }
              >
                <CausalGraph3D />
              </Suspense>
            )}
            {selectedNode && (
              <div className="pointer-events-none absolute bottom-4 left-4 rounded-md border border-signal-causal/40 bg-bg-deep/90 px-3 py-2 font-mono text-xs text-signal-causal backdrop-blur">
                selected · {selectedNode}
              </div>
            )}
          </div>

          <div className="space-y-6 lg:col-span-1">
            <div className="rounded-lg border border-border-subtle bg-bg-surface p-5">
              <h3 className="mb-3 font-display text-base text-[var(--text-primary)]">
                Ranked actual causes
              </h3>
              <RankedCausesList
                causes={RANKED_CAUSES}
                onWhatIf={(node) =>
                  toast.info(`Open the playground below to vary ${node}.`)
                }
              />
            </div>

            <CounterfactualPlayground />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("Export queued (PNG)")}
            className="gap-2"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Export PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success("Export queued (JSON)")}
            className="gap-2"
          >
            <FileJson className="h-3.5 w-3.5" aria-hidden />
            Export JSON
          </Button>
        </div>
      </div>
    </div>
  );
}
