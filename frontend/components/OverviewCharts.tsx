// The Overview charts. Recharts draws with SVG in the browser, so this file
// is a Client Component.
"use client";

import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CATEGORY_STYLES, categoryLabel, money, shortDate } from "@/lib/format";
import type { CategoryAmount, DailyAmount } from "@/lib/types";

// Recharts needs real color values, not Tailwind classes. These match the
// tokens in app/globals.css.
const INK = "#2b2b2b";
const TRACK = "#efebe1";
const MUTED = "#8f8b82";

// Tooltip box style: white, rounded, soft shadow, like the cards.
const TOOLTIP_STYLE = {
  borderRadius: 12,
  border: "none",
  boxShadow: "0 8px 24px -8px rgb(35 35 35 / 0.2)",
  fontSize: 13,
  fontWeight: 600,
};

/**
 * Spending per day as dark rounded bars. `background` draws the beige
 * "track" behind each bar, so every day has a full-height pill and the
 * dark part shows how much of it was spent.
 */
export function DailyBars({ daily }: { daily: DailyAmount[] }) {
  return (
    // ResponsiveContainer makes the chart as wide as its parent div.
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={daily} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barCategoryGap="12%">
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          tickMargin={10}
        />
        <YAxis
          tickFormatter={(v: number) => `$${v}`}
          tick={{ fontSize: 12, fill: MUTED }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          cursor={false}
          labelFormatter={(label) => shortDate(String(label))}
          formatter={(value) => [money(Number(value)), "Spent"]}
          contentStyle={TOOLTIP_STYLE}
        />
        <Bar
          dataKey="amount"
          fill={INK}
          radius={6}
          background={{ fill: TRACK, radius: 6 }}
          // The hovered bar turns lavender
          activeBar={{ fill: "#a9a7f5" }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** A tiny line with no axes, drawn inside the pastel stat cards. */
export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const data = values.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
        {/* domain "dataMin" makes the line use the full height even if all values are large */}
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Donut of spending by category with the total in the middle. */
export function CategoryDonut({ byCategory, total }: { byCategory: CategoryAmount[]; total: number }) {
  return (
    // The total sits in the donut's hole, layered on top with absolute positioning
    <div className="relative mx-auto h-44 w-44 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={byCategory}
            dataKey="amount"
            nameKey="category"
            innerRadius="66%"
            outerRadius="100%"
            paddingAngle={2}
            cornerRadius={6}
            stroke="none"
          >
            {/* One <Cell> per slice so each category gets its own color */}
            {byCategory.map((c) => (
              <Cell key={c.category} fill={CATEGORY_STYLES[c.category].hex} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [money(Number(value)), categoryLabel(name as CategoryAmount["category"])]}
            contentStyle={TOOLTIP_STYLE}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-muted">Total</span>
        <span className="text-lg font-bold tabular-nums text-foreground">{money(total)}</span>
      </div>
    </div>
  );
}
