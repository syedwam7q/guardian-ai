import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ROTATING_PHRASES = [
  "causal root-cause analysis",
  "7 autonomous agents",
  "real-time remediation",
  "explainable decisions",
] as const;

const ROTATION_INTERVAL_MS = 3500;

export function Hero() {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPhraseIndex((i) => (i + 1) % ROTATING_PHRASES.length);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section
      className="relative isolate overflow-hidden px-8 py-24"
      aria-labelledby="hero-headline"
    >
      {/* Radial accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 0%, color-mix(in oklab, var(--signal-causal) 18%, transparent) 0%, transparent 70%)",
        }}
      />
      {/* Grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--border-subtle) 1px, transparent 1px), linear-gradient(to bottom, var(--border-subtle) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 50%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 50%, transparent 100%)",
        }}
      />

      <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-signal-causal/30 bg-signal-causal/10 px-3 py-1 text-xs font-mono text-signal-causal">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-causal animate-pulse" />
          GuardianAI v0.1 — runtime governance
        </span>

        <h1
          id="hero-headline"
          className="font-display text-5xl leading-[1.05] tracking-tight md:text-6xl"
        >
          Causal multi-agent runtime governance for LLM apps.
        </h1>

        <p className="mt-6 max-w-3xl text-2xl text-[var(--text-secondary)]">
          One pipeline. Seven agents. Verifiable verdicts with{" "}
          <span className="relative inline-flex h-9 align-middle md:h-10">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={ROTATING_PHRASES[phraseIndex]}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="font-display text-signal-causal"
              >
                {ROTATING_PHRASES[phraseIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
          .
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/chat">
              Try the live demo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a
              href="https://github.com/syedwam7q/guardian-ai"
              target="_blank"
              rel="noreferrer noopener"
            >
              <Github className="h-4 w-4" aria-hidden />
              View on GitHub
            </a>
          </Button>
        </div>

        <p className="mt-6 font-mono text-xs text-[var(--text-tertiary)]">
          POST /api/medrag/chat &middot; SSE streamed verdicts &middot; sub-second
          pre-flight
        </p>
      </div>
    </section>
  );
}
