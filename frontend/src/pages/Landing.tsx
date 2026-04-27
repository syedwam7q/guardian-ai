import { AgentConstellation } from "@/components/landing/AgentConstellation";
import { ArchDiagram } from "@/components/landing/ArchDiagram";
import { Hero } from "@/components/landing/Hero";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function Landing() {
  usePageTitle("Causal Runtime Governance for LLM Apps");
  return (
    <div className="min-h-full">
      <Hero />

      <section className="mx-auto max-w-7xl px-6 py-12 sm:px-8 sm:py-16">
        <header className="mb-8">
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
            Live demo
          </p>
          <h2 className="mt-1 font-display text-2xl text-[var(--text-primary)] sm:text-3xl">
            Watch governance happen, live
          </h2>
          <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">
            Four representative scenarios, cycling. Each one drives the same
            pipeline a real request would.
          </p>
        </header>
        <AgentConstellation />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 sm:px-8 sm:py-16">
        <header className="mb-8">
          <p className="font-mono text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
            Architecture
          </p>
          <h2 className="mt-1 font-display text-2xl text-[var(--text-primary)] sm:text-3xl">
            Seven specialized agents, three pipeline stages
          </h2>
          <p className="mt-2 max-w-2xl text-[var(--text-secondary)]">
            Hover any agent for guarantees and detection strategy. Generation
            sits between pre-flight and post-flight, instrumented end-to-end.
          </p>
        </header>
        <ArchDiagram />
      </section>
    </div>
  );
}
