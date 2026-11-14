import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

// next/font downloads the fonts at build time and serves them from our own
// site, so opening the page makes no request to Google. Each font is exposed
// as a CSS variable that app/globals.css plugs into Tailwind.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Fraunces is a "soft" serif for headings and the wordmark. It's a variable
// font, so weights 500 and 600 both come from one file.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT"],
});

export const metadata: Metadata = {
  title: "Penny · Every cent, itemized.",
  description: "Every cent, itemized. Penny reads your receipts and matches them to your bank, so you see what you actually bought.",
};

// The root layout wraps every page. `children` is whichever page.tsx matches
// the URL, so the sidebar stays put while the main area swaps pages.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col md:flex-row">
        <Sidebar />
        {/* max-w keeps lines and charts from stretching too wide on big monitors */}
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8 xl:px-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </body>
    </html>
  );
}
