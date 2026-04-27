import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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

const METRICS = [
  "7 agents",
  "sub-300ms p50",
  "91% test coverage",
  "open source MIT",
] as const;

export function Hero() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const id = window.setInterval(() => {
      setPhraseIndex((i) => (i + 1) % ROTATING_PHRASES.length);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section
      className="relative isolate overflow-hidden px-6 py-20 sm:px-8 sm:py-24"
      aria-labelledby="hero-headline"
    >
      {/* Radial accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 0%, color-mix(in oklab, var(--signal-causal) 18%, transparent) 0%, transparent 70%)",
        }}
      />
      {/* Grid overlay */}
      <div
        aria-hidden="true"
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
          <span className="h-1.5 w-1.5 rounded-full bg-signal-causal motion-safe:animate-pulse" />
          GuardianAI v0.1 — runtime governance
        </span>

        <h1
          id="hero-headline"
          className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl md:text-6xl"
        >
          Causal multi-agent runtime governance for LLM apps.
        </h1>

        <p className="mt-6 max-w-3xl text-xl text-[var(--text-secondary)] sm:text-2xl">
          One pipeline. Seven agents. Verifiable verdicts with{" "}
          <span className="relative inline-flex h-9 align-middle md:h-10">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={ROTATING_PHRASES[phraseIndex]}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.35,
                  ease: "easeOut",
                }}
                className="bg-gradient-to-r from-signal-causal to-signal-info bg-clip-text font-display text-transparent"
              >
                {ROTATING_PHRASES[phraseIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
          .
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Button
            asChild
            size="lg"
            className="group relative transition-transform hover:-translate-y-px"
          >
            <Link to="/chat">
              <span className="relative">
                Try the live demo
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 left-0 h-px w-0 bg-current transition-all duration-300 group-hover:w-full"
                />
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="transition-transform hover:-translate-y-px"
          >
            <a
              href="https://github.com/syedwam7q/guardian-ai"
              target="_blank"
              rel="noreferrer noopener"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              View on GitHub
            </a>
          </Button>
        </div>

        <p className="mt-6 font-mono text-xs text-[var(--text-tertiary)]">
          POST /api/medrag/chat &middot; SSE streamed verdicts &middot; sub-second
          pre-flight
        </p>

        {/* Credibility metrics strip */}
        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[11px] text-[var(--text-secondary)]">
          {METRICS.map((m, i) => (
            <li key={m} className="flex items-center gap-3">
              {i > 0 && (
                <span aria-hidden="true" className="text-[var(--text-tertiary)]">
                  ·
                </span>
              )}
              <span>{m}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
