import { useMemo } from "react";
import { AuditFilters } from "@/components/audit/AuditFilters";
import { ComplianceScorecard } from "@/components/audit/ComplianceScorecard";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePageTitle } from "@/hooks/usePageTitle";
import { generateMockEvents, timeAgo, type Severity } from "@/lib/mockEvents";

const SEV_VARIANT: Record<Severity, "safe" | "watch" | "warn" | "block"> = {
  SAFE: "safe",
  WATCH: "watch",
  WARN: "warn",
  BLOCK: "block",
};

export default function Audit() {
  usePageTitle("Audit & Compliance");
  // Filter to compliance-relevant events: anything from the PII / Policy
  // agents, or any non-SAFE outcome from the rest.
  const events = useMemo(
    () =>
      generateMockEvents(40, 7).filter(
        (e) =>
          e.agent === "pii_in" ||
          e.agent === "pii_out" ||
          e.agent === "policy" ||
          e.severity !== "SAFE",
      ),
    [],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border-subtle bg-bg-surface px-6 py-5 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
          Compliance
        </p>
        <h1 className="font-display text-2xl text-[var(--text-primary)]">
          Audit &amp; Compliance
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Continuous compliance posture across regulated frameworks, with a
          full audit feed.
        </p>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
        <AuditFilters />
        <ComplianceScorecard />

        <Card>
          <CardHeader>
            <CardTitle>Recent compliance-relevant events</CardTitle>
            <CardDescription>
              Events whose verdict touches a controlled-data agent or fired a
              policy rule.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              {events.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-[var(--text-secondary)]">
                  No compliance events in the selected window.
                </div>
              ) : (
                <ul>
                  {events.map((e) => (
                    <li
                      key={e.id}
                      className="grid grid-cols-[64px_140px_70px_1fr_120px] items-center gap-3 border-b border-border-subtle/60 px-5 py-2.5 text-left last:border-0"
                    >
                      <Badge variant={SEV_VARIANT[e.severity]}>
                        {e.severity}
                      </Badge>
                      <span className="font-mono text-xs text-[var(--text-secondary)]">
                        {e.agent}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
                        {timeAgo(e.timestamp)}
                      </span>
                      <span className="truncate text-sm text-[var(--text-primary)]">
                        {e.query_preview}
                      </span>
                      <span className="justify-self-end rounded-md border border-border-subtle bg-bg-elevated px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                        {e.action}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
