// The Penny logo: a copper penny seen through a magnifying glass ("see where
// it went"), plus an optional "penny" wordmark. Colors come from the tokens
// in app/globals.css. app/icon.svg is the same mark with the colors written
// out, because a favicon file can't read CSS variables.

/**
 * The mark on its own (no wordmark). Also used faded in empty states and
 * pulsing while something loads.
 */
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      {/* Handle. The group's origin is the lens center, rotated so "down" points to the
          bottom-right; y is the distance from the lens center. A silver collar sits just
          outside the ring, then the wooden grip. */}
      <g transform="translate(20 20) rotate(-45)">
        <rect x="-2.6" y="16.5" width="5.2" height="5" rx="1" fill="var(--silver-deep)" />
        <rect x="-3.3" y="21" width="6.6" height="15.5" rx="3.3" fill="var(--primary)" />
        {/* Wood grain highlight */}
        <rect x="-1.8" y="23.5" width="1.2" height="10.5" rx="0.6" fill="var(--accent)" opacity="0.7" />
      </g>

      {/* Glass: a pale warm tint so the penny reads as "behind" the lens */}
      <circle cx="20" cy="20" r="15.5" fill="var(--surface)" />

      {/* The penny: dark rim, copper face, reeded edge, cent sign */}
      <circle cx="20" cy="20" r="9.6" fill="var(--rim-lip)" />
      <circle cx="20" cy="20" r="8.4" fill="var(--accent)" />
      <circle cx="20" cy="20" r="8.9" fill="none" stroke="var(--rim-shine)" strokeWidth="0.9" strokeDasharray="0.7 1.1" />
      <text
        x="20"
        y="20.5"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11"
        fontWeight="700"
        fill="var(--rim-lip)"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        ¢
      </text>

      {/* Lens ring: silver with a darker outer edge */}
      <circle cx="20" cy="20" r="15.5" fill="none" stroke="var(--silver-deep)" strokeWidth="4" />
      <circle cx="20" cy="20" r="15.5" fill="none" stroke="var(--silver)" strokeWidth="2.4" />

      {/* Glare on the glass: a short silver arc top-left, between the penny and the ring */}
      <path d="M8.3 15.7A12.5 12.5 0 0 1 15.7 8.3" fill="none" stroke="var(--silver)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ size = 32, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      {showWordmark && (
        // The lens only fills the top-left of the mark (the handle takes the rest),
        // so the wordmark is sized smaller relative to the mark to look balanced.
        <span className="font-display font-semibold leading-none text-text" style={{ fontSize: size * 0.62 }}>
          penny
        </span>
      )}
    </span>
  );
}
