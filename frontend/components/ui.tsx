// Small shared display pieces used on several pages.
import { LogoMark } from "@/components/Logo";
import { money } from "@/lib/format";

/**
 * A money amount with even-width digits (tabular-nums) so columns line up.
 * With `big`, the "$" is copper, for headline stat numbers.
 */
export function Amount({ value, big = false, className = "" }: { value: number; big?: boolean; className?: string }) {
  const text = money(value); // "$1,234.56"
  if (!big) return <span className={`tabular-nums ${className}`}>{text}</span>;
  return (
    <span className={`tabular-nums text-text ${className}`}>
      <span className="mr-0.5 text-accent">{text.charAt(0)}</span>
      {text.slice(1)}
    </span>
  );
}

/** Friendly message with the logo faded behind it. */
export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <LogoMark size={44} className="opacity-30" />
      <p className="mt-3 text-sm font-semibold text-text">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-text-muted">{children}</p>}
    </div>
  );
}

/** Banner for "sample data" notes and errors. */
export function Notice({ tone, children }: { tone: "info" | "error"; children: React.ReactNode }) {
  const styles = tone === "error" ? "bg-danger/10 text-danger" : "bg-accent-soft text-text";
  return (
    <p role={tone === "error" ? "alert" : undefined} className={`reeded-md mb-6 px-4 py-2.5 text-sm ${styles}`}>
      {children}
    </p>
  );
}
