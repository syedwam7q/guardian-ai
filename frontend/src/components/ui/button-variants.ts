import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-causal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-deep disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-signal-causal text-white hover:bg-signal-causal/90",
        secondary:
          "bg-bg-elevated text-[var(--text-primary)] hover:bg-bg-elevated/80 border border-border-subtle",
        ghost:
          "text-[var(--text-secondary)] hover:bg-bg-elevated hover:text-[var(--text-primary)]",
        outline:
          "border border-border-strong bg-transparent text-[var(--text-primary)] hover:bg-bg-elevated",
        destructive: "bg-signal-block text-white hover:bg-signal-block/90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
