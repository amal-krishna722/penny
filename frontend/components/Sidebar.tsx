// "use client" makes this a Client Component: it runs in the browser, which
// it needs to because usePathname() reads the current URL to highlight the
// active link. Components without it render on the server (the default).
"use client";

import { ArrowLeftRight, ChartColumn, LayoutDashboard, Sparkles, Upload, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

const LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/insights", label: "Insights", icon: ChartColumn },
  { href: "/ask", label: "Ask AI", icon: Sparkles },
  { href: "/upload", label: "Upload", icon: Upload },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 flex-col reeded-b bg-surface px-4 py-4 md:sticky md:top-0 md:h-screen md:w-60 md:reeded-r md:py-7">
      <Link href="/" className="mb-3 block px-2 md:mb-1" aria-label="Penny home">
        <Logo size={44} />
      </Link>
      {/* What P.E.N.N.Y. stands for: the first letter of each word in copper ink */}
      {/* Two fixed lines so "Yours" never wraps onto a line by itself */}
      <p className="mt-1 hidden px-2 text-[11px] leading-snug text-text-muted md:block">
        {[
          ["Photo", "Enabled", "Network"],
          ["Neatly", "Yours"],
        ].map((line) => (
          <span key={line[0]} className="block">
            {line.map((word, i) => (
              <span key={word}>
                {i > 0 && " "}
                <span className="font-semibold text-accent-ink">{word.charAt(0)}</span>
                {word.slice(1)}
              </span>
            ))}
          </span>
        ))}
      </p>
      <p className="mt-2 mb-8 hidden px-2 text-xs text-text-muted md:block">Every cent, itemized.</p>

      {/* Horizontal scrolling row on phones, vertical list from md screens up */}
      <ul className="flex gap-1 overflow-x-auto md:flex-col">
        {LINKS.map(({ href, label, icon: Icon }) => {
          // "/" must match exactly, or it would be "active" on every page.
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 whitespace-nowrap rounded-[10px] px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-accent-soft text-primary" : "text-text-muted hover:bg-surface-alt hover:text-text"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>

      <p className="mt-auto hidden px-2 text-xs text-text-muted md:block">Signed in as Demo Student</p>
    </nav>
  );
}
