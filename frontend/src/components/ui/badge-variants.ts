import { cva } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-signal-causal focus:ring-offset-2 focus:ring-offset-bg-deep",
  {
    variants: {
      variant: {
        default:
          "border-border-subtle bg-bg-elevated text-[var(--text-primary)]",
        safe: "border-signal-safe/30 bg-signal-safe/15 text-signal-safe",
        watch: "border-signal-watch/30 bg-signal-watch/15 text-signal-watch",
        warn: "border-signal-watch/40 bg-signal-watch/25 text-signal-watch",
        block: "border-signal-block/30 bg-signal-block/15 text-signal-block",
        causal:
          "border-signal-causal/30 bg-signal-causal/15 text-signal-causal",
        outline:
          "border-border-strong bg-transparent text-[var(--text-primary)]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
