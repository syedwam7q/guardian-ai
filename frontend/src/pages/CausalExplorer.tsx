import { Download, FileJson, X } from "lucide-react";
import { Suspense, lazy, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CausalGraph2D } from "@/components/causal/CausalGraph2D";
import { CounterfactualPlayground } from "@/components/causal/CounterfactualPlayground";
import { RankedCausesList } from "@/components/causal/RankedCausesList";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/hooks/usePageTitle";
import { RANKED_CAUSES } from "@/lib/mockDag";
import { cn } from "@/lib/utils";

const CausalGraph3D = lazy(() =>
  import("@/components/causal/CausalGraph3D").then((m) => ({
    default: m.CausalGraph3D,
  })),
);

type Mode = "2d" | "3d";

const ONBOARDING_KEY = "guardianai:causal-onboard-dismissed";

export default function CausalExplorer() {
  usePageTitle("Causal Explorer");
  const [mode, setMode] = useState<Mode>("2d");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setMounted(true), 250);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(ONBOARDING_KEY)) {
      setShowOnboarding(true);
    }
  }, []);

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setShowOnboarding(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-col gap-3 border-b border-border-subtle bg-bg-surface px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
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
          {/* Mode toggle: 3D hidden below md to avoid an unusable view on phones. */}
          <div
            role="toolbar"
            aria-label="Graph render mode"
            className="hidden rounded-md border border-border-subtle bg-bg-elevated p-0.5 md:flex"
          >
            {(["2d", "3d"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={cn(
                  "rounded-sm px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-causal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep",
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

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        {!mounted ? (
          <CausalSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="relative h-[420px] rounded-lg border border-border-subtle bg-bg-surface p-1 sm:h-[560px] lg:col-span-2">
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

                {showOnboarding && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="dialog"
                    aria-label="Causal Explorer onboarding"
                    className="absolute right-4 top-4 max-w-xs rounded-md border border-signal-causal/40 bg-bg-deep/95 p-3 text-left text-xs shadow-lg backdrop-blur"
                  >
                    <button
                      type="button"
                      onClick={dismissOnboarding}
                      aria-label="Dismiss onboarding"
                      className="absolute right-1.5 top-1.5 rounded p-1 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-causal"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-signal-causal">
                      What am I looking at?
                    </p>
                    <p className="mt-1 text-[var(--text-primary)]">
                      11 nodes form the LLM pipeline DAG — from query and
                      retrieval through generation to verdicts. Highlighted
                      paths are the top-ranked actual causes of the most recent
                      violation.
                    </p>
                    <button
                      type="button"
                      onClick={dismissOnboarding}
                      className="mt-2 text-[var(--text-secondary)] underline-offset-2 hover:text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-causal"
                    >
                      Got it
                    </button>
                  </motion.div>
                )}
              </div>

              <div className="space-y-6 lg:col-span-1">
                <div className="rounded-lg border border-border-subtle bg-bg-surface p-5">
                  <h2 className="mb-3 font-display text-base text-[var(--text-primary)]">
                    Ranked actual causes
                  </h2>
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
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toast.success("Export queued (PNG)")}
                className="gap-2"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Export PNG
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toast.success("Export queued (JSON)")}
                className="gap-2"
              >
                <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
                Export JSON
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function CausalSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" aria-hidden="true">
      <div className="space-y-3 lg:col-span-2">
        <Skeleton className="h-[420px] w-full sm:h-[560px]" />
      </div>
      <div className="space-y-6 lg:col-span-1">
        <div className="space-y-3 rounded-lg border border-border-subtle bg-bg-surface p-5">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
