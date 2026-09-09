"use client"

import { useMemo, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChevronDown, IndianRupee, RotateCcw, ShoppingBag, ShoppingCart, TrendingUp } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/format"
import type { EventDetail, OrganizerAnalytics } from "@/types/api"

type Period = "weekly" | "monthly" | "yearly"

type ChartPoint = {
  label: string
  revenue: number
  tickets: number
}

const formatDayKey = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

const getEventRevenueAndTickets = (event: EventDetail) => {
  return (event.ticketTiers ?? []).reduce(
    (acc, tier) => {
      const soldCount = Number(tier.soldCount ?? 0)
      const price = Number(tier.price ?? 0)
      return {
        tickets: acc.tickets + (Number.isFinite(soldCount) ? soldCount : 0),
        revenue: acc.revenue + (Number.isFinite(price) ? soldCount * price : 0),
      }
    },
    { tickets: 0, revenue: 0 },
  )
}

const buildWeeklyData = (events: EventDetail[]): ChartPoint[] => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const formatter = new Intl.DateTimeFormat("en-IN", { weekday: "short" })

  const buckets = new Map<string, ChartPoint>()
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - offset)
    buckets.set(formatDayKey(date), { label: formatter.format(date), revenue: 0, tickets: 0 })
  }

  for (const event of events) {
    const eventDate = new Date(event.date)
    if (Number.isNaN(eventDate.getTime())) continue
    const bucket = buckets.get(formatDayKey(eventDate))
    if (!bucket) continue
    const totals = getEventRevenueAndTickets(event)
    bucket.revenue += totals.revenue
    bucket.tickets += totals.tickets
  }

  return Array.from(buckets.values())
}

const buildMonthlyData = (events: EventDetail[]): ChartPoint[] => {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat("en-IN", { month: "short" })

  const buckets = new Map<string, ChartPoint>()
  for (let offset = 11; offset >= 0; offset -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const key = `${monthDate.getFullYear()}-${monthDate.getMonth() + 1}`
    buckets.set(key, { label: formatter.format(monthDate), revenue: 0, tickets: 0 })
  }

  for (const event of events) {
    const eventDate = new Date(event.date)
    if (Number.isNaN(eventDate.getTime())) continue
    const key = `${eventDate.getFullYear()}-${eventDate.getMonth() + 1}`
    const bucket = buckets.get(key)
    if (!bucket) continue
    const totals = getEventRevenueAndTickets(event)
    bucket.revenue += totals.revenue
    bucket.tickets += totals.tickets
  }

  return Array.from(buckets.values())
}

const buildYearlyData = (events: EventDetail[]): ChartPoint[] => {
  const currentYear = new Date().getFullYear()

  const buckets = new Map<string, ChartPoint>()
  for (let offset = 4; offset >= 0; offset -= 1) {
    const year = `${currentYear - offset}`
    buckets.set(year, { label: year, revenue: 0, tickets: 0 })
  }

  for (const event of events) {
    const eventDate = new Date(event.date)
    if (Number.isNaN(eventDate.getTime())) continue
    const bucket = buckets.get(`${eventDate.getFullYear()}`)
    if (!bucket) continue
    const totals = getEventRevenueAndTickets(event)
    bucket.revenue += totals.revenue
    bucket.tickets += totals.tickets
  }

  return Array.from(buckets.values())
}

const buildChartData = (events: EventDetail[], period: Period): ChartPoint[] => {
  if (period === "weekly") return buildWeeklyData(events)
  if (period === "yearly") return buildYearlyData(events)
  return buildMonthlyData(events)
}

const compactInr = (value: number) =>
  value >= 1000 ? `₹${new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value)}` : `₹${value}`

type InsightsAnalyticsProps = {
  analytics?: OrganizerAnalytics | null
  events?: EventDetail[]
  isLoading?: boolean
  errorMessage?: string | null
}

export function InsightsAnalytics({
  analytics = null,
  events = [],
  isLoading = false,
  errorMessage = null,
}: InsightsAnalyticsProps) {
  const [metric, setMetric] = useState<"tickets" | "revenue">("revenue")
  const [period, setPeriod] = useState<Period>("monthly")

  const data = useMemo(() => buildChartData(events, period), [events, period])
  const hasAnyActivity = data.some((point) => point.revenue > 0 || point.tickets > 0)

  const grossRevenue = Number(analytics?.grossRevenue ?? 0)
  const paidOrders = Number(analytics?.paidOrders ?? 0)
  const refundedAmount = Number(analytics?.refundedAmount ?? 0)
  const thisMonth = Number(analytics?.revenueThisMonth ?? 0)
  const lastMonth = Number(analytics?.revenueLastMonth ?? 0)
  const monthChangePct =
    lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : thisMonth > 0 ? 100 : 0
  const avgOrderValue = paidOrders > 0 ? grossRevenue / paidOrders : 0

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">Insights &amp; Analytics</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
            {(["tickets", "revenue"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setMetric(key)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
                  metric === key
                    ? "bg-(--brand-navy) text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold capitalize text-slate-600 transition hover:border-slate-400"
              >
                {period} <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["weekly", "monthly", "yearly"] as Period[]).map((option) => (
                <DropdownMenuItem
                  key={option}
                  onClick={() => setPeriod(option)}
                  className="capitalize"
                >
                  {option}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">Loading analytics…</p>
      ) : errorMessage ? (
        <p className="mt-4 text-sm text-rose-600">{errorMessage}</p>
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
          {/* Stat tiles */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200/80 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                  <IndianRupee className="h-4 w-4" />
                </span>
                <p className="mt-2.5 text-xs font-medium text-slate-500">Total Revenue</p>
                <p className="text-xl font-bold tabular-nums text-slate-900">
                  {formatCurrency(grossRevenue)}
                </p>
                <p className="text-[11px] text-slate-400">From paid orders</p>
              </div>
              <div className="rounded-xl border border-slate-200/80 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <p className="mt-2.5 text-xs font-medium text-slate-500">This Month</p>
                <p className="text-xl font-bold tabular-nums text-slate-900">
                  {formatCurrency(thisMonth)}{" "}
                  <span
                    className={`text-xs font-semibold ${
                      monthChangePct >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {monthChangePct >= 0 ? "↑" : "↓"} {Math.abs(monthChangePct)}%
                  </span>
                </p>
                <p className="text-[11px] text-slate-400">vs last month</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "Avg. Order Value",
                  value: formatCurrency(avgOrderValue),
                  icon: ShoppingCart,
                  cls: "bg-sky-100 text-sky-600",
                },
                {
                  label: "Total Orders",
                  value: paidOrders.toLocaleString("en-IN"),
                  icon: ShoppingBag,
                  cls: "bg-amber-100 text-amber-600",
                },
                {
                  label: "Refunded Amount",
                  value: formatCurrency(refundedAmount),
                  icon: RotateCcw,
                  cls: "bg-rose-100 text-rose-500",
                },
              ].map(({ label, value, icon: Icon, cls }) => (
                <div key={label} className="rounded-xl border border-slate-200/80 p-3.5">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${cls}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-2 text-[11px] font-medium leading-tight text-slate-500">{label}</p>
                  <p className="text-lg font-bold tabular-nums text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700">
              {metric === "revenue" ? "Revenue over time" : "Tickets over time"}
            </p>
            <div className="mt-2 h-56 w-full sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="insights-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    dy={6}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    tickFormatter={(v: number) => (metric === "revenue" ? compactInr(v) : String(v))}
                    width={52}
                  />
                  <Tooltip
                    formatter={(value: number | string) => [
                      metric === "revenue" ? formatCurrency(Number(value)) : `${value} tickets`,
                      metric === "revenue" ? "Revenue" : "Tickets",
                    ]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey={metric}
                    stroke="#7c3aed"
                    strokeWidth={2}
                    fill="url(#insights-fill)"
                    dot={{ r: 3.5, fill: "#7c3aed", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {!hasAnyActivity ? (
              <p className="mt-2 text-center text-xs text-slate-400">
                Data will appear once your events start receiving bookings.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
