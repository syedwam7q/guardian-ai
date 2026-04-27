import { Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DATASETS = [
  { id: "medhalt-2k", label: "MedHalt-2k", n: 2000 },
  { id: "govharm-1k", label: "GovHarm-1k", n: 1000 },
  { id: "medrag-inj", label: "MedRAG-Inj", n: 850 },
  { id: "pii-echo", label: "PII-Echo", n: 1200 },
  { id: "drift-med", label: "Drift-Med", n: 600 },
];

export function RunPanel() {
  const [dataset, setDataset] = useState(DATASETS[0].id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Run benchmark</CardTitle>
        <CardDescription>
          Pick a dataset, kick off a run, and watch results stream in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Dataset
          </p>
          <select
            value={dataset}
            onChange={(e) => setDataset(e.target.value)}
            className="w-full rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-mono text-xs text-[var(--text-primary)]"
          >
            {DATASETS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label} ({d.n.toLocaleString()} examples)
              </option>
            ))}
          </select>
        </div>

        <Button
          onClick={() => toast.success(`Run queued on ${dataset}`)}
          className="w-full gap-2"
        >
          <Play className="h-3.5 w-3.5" aria-hidden />
          Run benchmark
        </Button>

        <div className="border-t border-border-subtle pt-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
            Last run
          </p>
          <div className="mt-2 space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Dataset</span>
              <span className="text-[var(--text-primary)]">MedHalt-2k</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Top-1</span>
              <Badge variant="causal">0.74</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Top-3</span>
              <Badge variant="outline">0.91</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">p50 latency</span>
              <span className="text-[var(--text-primary)]">280 ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Wall time</span>
              <span className="text-[var(--text-primary)]">42 min</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
