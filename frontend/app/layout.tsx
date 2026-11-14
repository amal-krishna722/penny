import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

// next/font downloads the font at build time and serves it from our own
// site, so there's no request to Google when someone opens the page.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Itemize",
  description: "See where it went: every receipt, itemized and matched to your bank.",
};

// The root layout wraps every page. `children` is whichever page.tsx matches
// the URL, so the sidebar stays put while the main area swaps pages.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}>
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
