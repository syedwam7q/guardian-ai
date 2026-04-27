import { AgentToggleMatrix } from "@/components/deploy/AgentToggleMatrix";
import { InstallTabs } from "@/components/deploy/InstallTabs";
import { PolicyEditor } from "@/components/deploy/PolicyEditor";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function Deploy() {
  usePageTitle("Deploy & Settings");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border-subtle bg-bg-surface px-6 py-5 sm:px-8">
        <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
          Operator
        </p>
        <h1 className="font-display text-2xl text-[var(--text-primary)]">
          Deploy &amp; Settings
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Install GuardianAI, manage per-environment agent toggles, and edit the
          active policy.
        </p>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-6 sm:p-8">
        <InstallTabs />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AgentToggleMatrix />
          <PolicyEditor />
        </div>
      </div>
    </div>
  );
}
