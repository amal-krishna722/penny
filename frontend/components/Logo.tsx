// The Penny logo: a copper coin with a small receipt inside, plus an
// optional "penny" wordmark. Colors come from the tokens in app/globals.css.
// app/icon.svg is the same coin with the colors written out, because a
// favicon file can't read CSS variables.

export function Coin({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      {/* Rim (darker) and face: the face circle is ~8% smaller than the rim */}
      <circle cx="24" cy="24" r="24" fill="var(--accent-deep)" />
      <circle cx="24" cy="24" r="20.2" fill="var(--accent)" />
      {/* Receipt: rounded top, zigzag torn bottom edge */}
      <path
        d="M17 13.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2V34l-2.33-1.75L26.33 34 24 32.25 21.67 34l-2.34-1.75L17 34z"
        fill="var(--surface)"
      />
      {/* Lines of text on the receipt */}
      <path d="M20.5 17.5h7M20.5 21.5h7M20.5 25.5h4.5" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ size = 32, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Coin size={size} />
      {showWordmark && (
        <span className="font-display font-semibold leading-none text-text" style={{ fontSize: size * 0.8 }}>
          penny
        </span>
      )}
    </span>
  );
}
