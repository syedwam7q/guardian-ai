import { Download } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FRAMEWORKS = [
  { id: "all", label: "All frameworks" },
  { id: "eu_ai_act", label: "EU AI Act" },
  { id: "dpdp", label: "India DPDP" },
  { id: "hipaa", label: "HIPAA" },
  { id: "soc2", label: "SOC 2 Type II" },
];

export function AuditFilters() {
  const [framework, setFramework] = useState("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const fromId = useId();
  const toId = useId();
  const fwId = useId();

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4">
      <div className="space-y-1">
        <label
          htmlFor={fromId}
          className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]"
        >
          From
        </label>
        <Input
          id={fromId}
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="w-44"
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor={toId}
          className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]"
        >
          To
        </label>
        <Input
          id={toId}
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="w-44"
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor={fwId}
          className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]"
        >
          Framework
        </label>
        <select
          id={fwId}
          value={framework}
          onChange={(e) => setFramework(e.target.value)}
          className="h-9 rounded-md border border-border-subtle bg-bg-elevated px-3 font-mono text-xs text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-causal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep"
        >
          {FRAMEWORKS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div className="ml-auto">
        <Button
          type="button"
          onClick={() => toast.success("Report queued for generation")}
          className="gap-2"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          Generate report
        </Button>
      </div>
    </div>
  );
}
