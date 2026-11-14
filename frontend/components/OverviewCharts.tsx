// The two Overview charts (task C4). Recharts draws with SVG in the browser,
// so this file is a Client Component.
"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORY_STYLES, categoryLabel, money, shortDate } from "@/lib/format";
import type { CategoryAmount, DailyAmount } from "@/lib/types";

/** Spending per day. An area chart is a line chart with the space under it filled. */
export function DailyChart({ daily }: { daily: DailyAmount[] }) {
  return (
    // ResponsiveContainer makes the chart as wide as its parent div.
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {/* Soft fade from the line color to transparent under the line */}
          <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={{ fontSize: 12, fill: "#737373" }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={(v: number) => `$${v}`}
          tick={{ fontSize: 12, fill: "#737373" }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          labelFormatter={(label) => shortDate(String(label))}
          formatter={(value) => [money(Number(value)), "Spent"]}
          contentStyle={{ borderRadius: 8, borderColor: "#e5e5e5", fontSize: 13 }}
        />
        <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fill="url(#dailyFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Donut of spending by category, with a legend listing amount and percent. */
export function CategoryDonut({ byCategory, total }: { byCategory: CategoryAmount[]; total: number }) {
  if (byCategory.length === 0) {
    return <p className="py-10 text-center text-sm text-neutral-500">No spending yet.</p>;
  }

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      {/* The total sits in the donut's hole, layered on top with absolute positioning */}
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={byCategory}
              dataKey="amount"
              nameKey="category"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={1}
              stroke="none"
            >
              {/* One <Cell> per slice so each category gets its own color */}
              {byCategory.map((c) => (
                <Cell key={c.category} fill={CATEGORY_STYLES[c.category].hex} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [money(Number(value)), categoryLabel(name as CategoryAmount["category"])]}
              contentStyle={{ borderRadius: 8, borderColor: "#e5e5e5", fontSize: 13 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-neutral-500">Total</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-neutral-900">{money(total)}</span>
        </div>
      </div>

      <ul className="w-full space-y-2 text-sm">
        {byCategory.map((c) => (
          <li key={c.category} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_STYLES[c.category].hex }} />
            <span className="flex-1 text-neutral-700">{categoryLabel(c.category)}</span>
            <span className="font-mono tabular-nums text-neutral-900">{money(c.amount)}</span>
            <span className="w-12 text-right text-xs tabular-nums text-neutral-500">{c.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
