/** Przystań logo – a harbour: calm water lines under a sheltering arc. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Przystań">
      <rect width="64" height="64" rx="16" fill="var(--primary)" />
      <path d="M14 34a18 18 0 0 1 36 0" fill="none" stroke="var(--primary-fg)" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="32" cy="24" r="4" fill="var(--accent-soft)" />
      <path
        d="M12 42c3.3 0 3.3 3 6.7 3s3.3-3 6.6-3 3.4 3 6.7 3 3.3-3 6.7-3 3.3 3 6.6 3 3.4-3 6.7-3"
        fill="none"
        stroke="var(--primary-fg)"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M18 50c2.3 0 2.3 2 4.7 2s2.3-2 4.6-2 2.4 2 4.7 2 2.3-2 4.7-2 2.3 2 4.6 2"
        fill="none"
        stroke="var(--primary-fg)"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );
}
