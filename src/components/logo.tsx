/** TenderScale mark. Placeholder until the designed logo lands: swap the <svg> body, keep the props. `active` animates it (used as the loading indicator). */
export function Logo({ size = 22, active = false, className = "" }: { size?: number; active?: boolean; className?: string }) {
  return (
    <span className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 48 48" width={size} height={size} className={active ? "logo-spin" : ""} style={{ color: "var(--color-accent)" }}>
        <circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" strokeWidth="3.5" strokeDasharray={active ? "30 14" : "0"} strokeLinecap="round" opacity={active ? 0.9 : 1} />
        {!active && <circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" strokeWidth="3.5" opacity="0.25" />}
        <path d="M14 21 L24 14 L34 21" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="21.5" y="14" width="5" height="21" rx="2.5" fill="currentColor" />
      </svg>
      {active && <span className="absolute inset-0 rounded-full logo-glow" />}
    </span>
  );
}
