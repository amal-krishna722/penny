// "use client" makes this a Client Component: it runs in the browser, which
// it needs to because usePathname() reads the current URL to highlight the
// active link. Components without it render on the server (the default).
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Icons are inline SVG paths (24x24, drawn with strokes), so we don't need an
// icon package. Each string is the `d` attribute of a <path>.
const ICONS = {
  overview: "M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z",
  transactions: "M7 7h13m0 0l-3-3m3 3l-3 3M17 17H4m0 0l3-3m-3 3l3 3",
  insights: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  ask: "M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.4zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z",
  upload: "M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3",
};

const LINKS = [
  { href: "/", label: "Overview", icon: ICONS.overview },
  { href: "/transactions", label: "Transactions", icon: ICONS.transactions },
  { href: "/insights", label: "Insights", icon: ICONS.insights },
  { href: "/ask", label: "Ask AI", icon: ICONS.ask },
  { href: "/upload", label: "Upload", icon: ICONS.upload },
];

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 flex-col bg-ink px-4 py-4 text-white md:sticky md:top-0 md:h-screen md:w-64 md:px-0 md:py-10">
      <Link href="/" className="mb-3 flex items-center gap-3 px-2 md:mb-10 md:justify-center md:px-0">
        {/* Logo mark: a receipt with a zigzag bottom edge */}
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden="true">
            <path d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21zM9 8h6M9 12h6" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </span>
        <span className="text-2xl font-bold tracking-tight">Itemize</span>
      </Link>

      <div className="mb-10 hidden text-center md:block">
        <p className="text-sm text-white/70">Welcome back,</p>
        <p className="mt-1 text-lg font-medium">Demo Student</p>
      </div>

      {/* Horizontal scrolling row on phones, vertical list from md screens up */}
      <ul className="flex gap-1 overflow-x-auto md:flex-col md:gap-2">
        {LINKS.map(({ href, label, icon }) => {
          // "/" must match exactly, or it would be "active" on every page.
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="relative">
              {/* Yellow bar on the left edge marks the current page (desktop only) */}
              {active && <span className="absolute inset-y-1 left-0 hidden w-1 rounded-r bg-highlight md:block" />}
              <Link
                href={href}
                className={`flex items-center gap-4 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:px-14 ${
                  active ? "text-highlight" : "text-white/75 hover:text-white"
                }`}
              >
                <Icon d={icon} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
