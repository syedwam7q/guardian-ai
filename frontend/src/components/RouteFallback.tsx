/**
 * Slim indeterminate progress bar shown while a lazy route chunk loads.
 * Sits absolutely at the top of <main> so the rest of the layout stays put.
 */
export function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className="relative h-1 w-full overflow-hidden bg-bg-elevated"
    >
      <div className="absolute inset-y-0 left-0 w-1/3 animate-[routeProgress_1s_ease-in-out_infinite] bg-signal-causal" />
      <span className="sr-only">Loading…</span>
      <style>{`
        @keyframes routeProgress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[routeProgress_1s_ease-in-out_infinite\\] {
            animation: none !important;
            transform: translateX(50%);
          }
        }
      `}</style>
    </div>
  );
}
