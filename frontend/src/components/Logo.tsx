interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 24, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="GuardianAI"
    >
      <defs>
        <radialGradient id="gai-node" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--signal-causal)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--signal-causal)" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      {/* Outer governance boundary */}
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="currentColor"
        strokeWidth="1.75"
        opacity="0.85"
      />
      {/* Thin inner ring for depth */}
      <circle
        cx="12"
        cy="12"
        r="7.25"
        stroke="currentColor"
        strokeWidth="0.6"
        opacity="0.35"
      />
      {/* Stylised "G" — opening at the right with horizontal stub flowing inward,
          evoking a directed edge in a causal DAG. */}
      <path
        d="M16.5 8.25 A5.5 5.5 0 1 0 17 15.5 H12.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner causal node with radial gradient depth */}
      <circle cx="12.5" cy="12" r="1.6" fill="url(#gai-node)" />
    </svg>
  );
}
