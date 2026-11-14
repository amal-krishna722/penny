// "use client" makes this a Client Component: it runs in the browser, which
// it needs to because usePathname() reads the current URL to highlight the
// active link. Components without it render on the server (the default).
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/transactions", label: "Transactions" },
  { href: "/insights", label: "Insights" },
  { href: "/ask", label: "Ask AI" },
  { href: "/upload", label: "Upload" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 flex-col gap-1 border-b border-neutral-200 bg-white px-4 py-4 md:w-56 md:border-r md:border-b-0 md:py-6">
      <Link href="/" className="mb-1 px-3 md:mb-6">
        <span className="text-lg font-semibold tracking-tight text-neutral-900">Itemize</span>
        <span className="block text-xs text-neutral-500">see where it went</span>
      </Link>

      {/* Horizontal scrolling row on phones, vertical list from md screens up */}
      <ul className="flex gap-1 overflow-x-auto md:flex-col">
        {LINKS.map(({ href, label }) => {
          // "/" must match exactly, or it would be "active" on every page.
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
