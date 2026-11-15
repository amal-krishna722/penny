// The Penny logo: the back of an iPhone's camera module where one lens is a
// copper penny ("snap a receipt, see every cent"), plus an optional "Penny"
// wordmark. Flat shapes only, so it stays crisp from a 16px favicon up to a
// slide. Colors come from the tokens in app/globals.css. app/icon.svg and
// public/brand/ are the same mark with the colors written out, because image
// files can't read CSS variables.

/** One dark camera lens with a cream ring and a small glare dot. */
function Lens({ x, y }: { x: number; y: number }) {
  return (
    <>
      <circle cx={x} cy={y} r="9.5" fill="var(--text)" stroke="var(--accent-soft)" strokeWidth="2.5" />
      <circle cx={x - 3.2} cy={y - 3.2} r="1.9" fill="var(--accent-soft)" opacity="0.55" />
    </>
  );
}

/**
 * The mark on its own (no wordmark). Also used faded in empty states and
 * pulsing while something loads.
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      {/* The camera bump */}
      <rect x="6" y="6" width="52" height="52" rx="14" fill="var(--primary)" />
      {/* Two ordinary lenses on the left */}
      <Lens x={21} y={20} />
      <Lens x={21} y={44} />
      {/* The third lens is a penny */}
      <circle cx="43" cy="32" r="9.5" fill="var(--accent)" stroke="var(--accent-soft)" strokeWidth="2.5" />
      {/* Cent sign drawn as two strokes (an open circle and a bar), so no font is needed */}
      <path
        d="M46.25 28.75A4.6 4.6 0 1 0 46.25 35.25"
        fill="none"
        stroke="var(--on-primary)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M43.6 25V39" stroke="var(--on-primary)" strokeWidth="2.4" strokeLinecap="round" />
      {/* Flash and sensor */}
      <circle cx="43" cy="15" r="3.2" fill="var(--accent-soft)" />
      <circle cx="43" cy="49" r="2.6" fill="var(--text)" />
    </svg>
  );
}

export default function Logo({ size = 32, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      {showWordmark && (
        <span className="font-display font-semibold leading-none text-text" style={{ fontSize: size * 0.62 }}>
          Penny
        </span>
      )}
    </span>
  );
}
