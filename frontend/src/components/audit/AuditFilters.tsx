import { Download } from "lucide-react";
import { useState } from "react";
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

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4">
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
          From
        </p>
        <Input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="w-44"
        />
      </div>
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
          To
        </p>
        <Input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="w-44"
        />
      </div>
      <div className="space-y-1">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
          Framework
        </p>
        <select
          value={framework}
          onChange={(e) => setFramework(e.target.value)}
          className="h-9 rounded-md border border-border-subtle bg-bg-elevated px-3 font-mono text-xs text-[var(--text-primary)]"
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
          onClick={() => toast.success("Report queued for generation")}
          className="gap-2"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Generate report
        </Button>
      </div>
    </div>
  );
}
