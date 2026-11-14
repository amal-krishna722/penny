// The Overview charts. Recharts draws with SVG in the browser, so this file
// is a Client Component.
//
// Colors are CSS variables from app/globals.css. SVG fill/stroke accept
// var(--token), so the charts change with the theme like everything else.
"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CATEGORY_STYLES, categoryLabel, money, shortDate } from "@/lib/format";
import type { CategoryAmount, DailyAmount } from "@/lib/types";

const AXIS_TICK = { fontSize: 12, fill: "var(--text-faint)" };

// Tooltip box: a small card.
const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  boxShadow: "0 1px 2px rgb(59 42 32 / 0.06)",
  fontSize: 13,
};

/**
 * Spending per day as copper bars. `background` draws a 15% copper "track"
 * behind each bar, so every day has a full-height column.
 */
export function DailyBars({ daily }: { daily: DailyAmount[] }) {
  return (
    // ResponsiveContainer makes the chart as wide as its parent div.
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={daily} margin={{ top: 8, right: 0, left: 0, bottom: 0 }} barCategoryGap="18%">
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          tickMargin={10}
        />
        <YAxis tickFormatter={(v: number) => `$${v}`} tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} />
        <Tooltip
          cursor={false}
          labelFormatter={(label) => shortDate(String(label))}
          formatter={(value) => [money(Number(value)), "Spent"]}
          contentStyle={TOOLTIP_STYLE}
        />
        <Bar
          dataKey="amount"
          fill="var(--accent)"
          radius={[4, 4, 0, 0]}
          background={{ fill: "color-mix(in srgb, var(--accent) 15%, transparent)", radius: 4 }}
          // The hovered bar darkens to cocoa
          activeBar={{ fill: "var(--primary)" }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** A tiny copper line with no axes, drawn inside a stat card. */
export function Sparkline({ values }: { values: number[] }) {
  const data = values.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={44}>
      <LineChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 4 }}>
        {/* domain "dataMin" makes the line use the full height even if all values are large */}
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line type="monotone" dataKey="v" stroke="var(--accent)" strokeWidth={2} dot={false} isAnimationActive={false} />
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
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={2}
            cornerRadius={4}
            stroke="none"
          >
            {/* One <Cell> per slice so each category gets its own color */}
            {byCategory.map((c) => (
              <Cell key={c.category} fill={CATEGORY_STYLES[c.category].color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [money(Number(value)), categoryLabel(name as CategoryAmount["category"])]}
            contentStyle={TOOLTIP_STYLE}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-text-muted">Total</span>
        <span className="text-lg font-semibold tabular-nums text-text">{money(total)}</span>
      </div>
    </div>
  );
}

/** Receipt coverage as a ring: copper arc on a beige track. */
export function CoverageRing({ pct, size = 76 }: { pct: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${clamped.toFixed(0)}% itemized`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-alt)" strokeWidth={stroke} />
      {/* The arc is a dashed circle: dash length = the filled share. Rotate so it starts at 12 o'clock. */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="16" fontWeight="600" fill="var(--text)">
        {clamped.toFixed(0)}%
      </text>
    </svg>
  );
}
