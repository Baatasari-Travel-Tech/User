"use client"

import * as React from "react"
import { Pie, PieChart, Cell } from "recharts"
import { useQuery } from "@tanstack/react-query"
import { ArrowUp, ShoppingBag, Users, Clock, BookmarkCheck } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { apiRequest } from "@/lib/api/client"
import { useHydrated } from "@/hooks/use-hydrated"

import type { EventDetail, EventFunnel } from "@/types/api"

// Prevent hydration mismatch — recharts measures the DOM, so it must not run
// during SSR.
function ClientOnlyPieChart({ radialData }: { radialData: { name: string; value: number; fill?: string }[] }) {
  const isMounted = useHydrated()

  if (!isMounted) {
    return <div className="h-22.5 w-22.5 rounded-full border-4 border-muted" />
  }

  return (
    <PieChart width={90} height={90}>
      <Pie
        data={radialData}
        cx={40}
        cy={40}
        innerRadius={32}
        outerRadius={40}
        startAngle={90}
        endAngle={-270}
        dataKey="value"
        stroke="none"
      >
        <Cell key="cell-0" fill="var(--upcoming-primary-800)" />
        <Cell key="cell-1" fill="#FFFFFF" />
      </Pie>
    </PieChart>
  )
}

interface AnalyticsChartBlockProps {
  amount: string
  label: string
}

const AnalyticsChartBlock = ({ amount, label }: AnalyticsChartBlockProps) => (
  <div className="overflow-x-auto scrollbar-hide pb-2">
    <div className="relative h-80 w-full rounded-2xl bg-muted/10 p-4 border border-border/50">
      <div className="absolute top-6 left-6 z-10">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold">{amount}</span>
          <div className="rounded-full border border-(--blue-200) bg-white p-0.5">
            <ArrowUp className="h-4 w-4 text-(--blue-500)" />
          </div>
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {label}
        </p>
      </div>

      {/* The big number above is real (from sold tickets). Day-by-day trends
          live in the real "Visitors vs Purchases" chart on this page — we no
          longer show a placeholder trend line here. */}
      <div className="flex h-full w-full items-end justify-end p-2">
        <p className="text-xs text-muted-foreground">
          Daily trends: see the Visitors vs Purchases chart above.
        </p>
      </div>
    </div>
  </div>
)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value)

type Props = {
  event: EventDetail | null
  isLoading: boolean
}

export function RevenueStats({ event, isLoading }: Props) {
  const tiers = event?.ticketTiers ?? []

  // Same queryKey as ViewsVsPurchases's funnel fetch on this page — React
  // Query dedupes identical keys, so this doesn't cause a second request.
  const { data: funnel } = useQuery<EventFunnel, Error>({
    queryKey: ["organizer-event-funnel", event?.id],
    queryFn: async () => {
      const response = await apiRequest<{ data: { funnel: EventFunnel } }>(
        `/organizer/events/${event?.id}/funnel`,
        { auth: true }
      )
      return response.data.funnel
    },
    enabled: Boolean(event?.id),
  })

  const totalRevenue = tiers.reduce(
    (sum, tier) => sum + Number(tier.soldCount || 0) * Number(tier.price || 0),
    0
  )
  const totalSold = tiers.reduce((sum, tier) => sum + Number(tier.soldCount || 0), 0)
  const totalCapacity = tiers.reduce((sum, tier) => sum + Number(tier.quantity || 0), 0)
  const bookedPercent = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0

  const sponsors = event?.sponsors as Record<string, unknown[]> | null | undefined
  const sponsorCount = sponsors
    ? (Array.isArray(sponsors.titleSponsors) ? sponsors.titleSponsors.filter((s: unknown) => (s as { name?: string }).name?.trim()).length : 0) +
      (Array.isArray(sponsors.coPartners) ? sponsors.coPartners.filter((s: unknown) => (s as { name?: string }).name?.trim()).length : 0) +
      (Array.isArray(sponsors.mediaPartners) ? sponsors.mediaPartners.filter((s: unknown) => (s as { name?: string }).name?.trim()).length : 0)
    : 0

  const addOns = event?.addOns as Record<string, unknown> | null | undefined
  const addOnsCount = addOns
    ? Object.values(addOns).filter((v) => v === true).length
    : 0

  const radialData = [
    { name: "Booked", value: bookedPercent, fill: "hsl(215, 60%, 50%)" },
    { name: "Remaining", value: 100 - bookedPercent, fill: "transparent" },
  ]

  const [viewMode, setViewMode] = React.useState<"revenue" | "tickets">("revenue")
  const [ticketsTab, setTicketsTab] = React.useState(tiers[0]?.name ?? "")

  // No "Add-Ons Revenue" sub-tab: add-ons are boolean amenity flags on the
  // event (parking, food, etc.), not priced line items — there's no sales
  // data to show, so we don't pretend there is. Ticket Revenue is the only
  // real revenue figure.
  const tierTabs = tiers.map((tier) => ({ value: tier.name, label: tier.name }))

  const currentSubTab = ticketsTab
  const setCurrentSubTab = setTicketsTab
  const subTabs = viewMode === "tickets" ? tierTabs : []

  const activeTier = tiers.find((t) => t.name === ticketsTab) ?? tiers[0]
  const tierSold = activeTier ? Number(activeTier.soldCount || 0) : 0

  const chartProps =
    viewMode === "revenue"
      ? { amount: formatCurrency(totalRevenue), label: "Ticket Revenue" }
      : { amount: String(tierSold), label: `${activeTier?.name ?? ""} Tickets Sold` }

  if (isLoading) {
    return <div className="rounded-xl border bg-card h-96 animate-pulse" />
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-0 flex flex-row justify-between items-center mt-2">
        <div>
          <CardTitle className="text-xl font-semibold mb-0">
            {viewMode === "revenue" ? "Revenue" : "Tickets"}
          </CardTitle>
          {viewMode === "revenue" && (
            <p className="text-lg font-bold mt-1" style={{ color: "var(--upcoming-primary-800)" }}>
              Total Revenue: {formatCurrency(totalRevenue)}
            </p>
          )}
        </div>
        <div className="flex bg-muted/50 p-1 rounded-full">
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${viewMode === "revenue"
              ? "bg-white text-black shadow-sm"
              : "text-muted-foreground"
              }`}
            onClick={() => setViewMode("revenue")}
          >
            Revenue
          </button>
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${viewMode === "tickets"
              ? "bg-white text-black shadow-sm"
              : "text-muted-foreground"
              }`}
            onClick={() => setViewMode("tickets")}
          >
            Tickets
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Sub-category tabs - text-only highlight (ticket-tier switcher only;
            revenue mode has just one real figure, so no tabs to show) */}
        <div className={`flex gap-4 sm:gap-6 border-b border-border mt-4 mb-6 ${subTabs.length === 0 ? "hidden" : ""}`}>
          {subTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setCurrentSubTab(tab.value)}
              className={`pb-3 text-xs sm:text-sm font-semibold transition-colors border-b-2 ${currentSubTab === tab.value
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Chart - always visible */}
        <AnalyticsChartBlock {...chartProps} />

        {/* Bottom Cards (shared) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
          <Card className="bg-(--zinc-950) text-white border-none flex flex-col items-center justify-center p-4 shadow-lg">
            <div className="relative h-24 w-24 flex items-center justify-center">
              <ClientOnlyPieChart radialData={radialData} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold">{bookedPercent}%</span>
                <span className="text-[10px] text-(--zinc-400)">Booked</span>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col items-center justify-center p-4 border-none shadow-sm bg-(--zinc-50)">
            <ShoppingBag className="h-6 w-6 text-(--blue-600) mb-2" />
            <span className="text-2xl font-bold">{addOnsCount}</span>
            <span className="text-xs font-semibold text-muted-foreground">Add-Ons</span>
          </Card>

          <Card className="flex flex-col items-center justify-center p-4 border-none shadow-sm bg-(--zinc-50)">
            <Users className="h-6 w-6 text-(--blue-600) mb-2" />
            <span className="text-2xl font-bold">{sponsorCount}</span>
            <span className="text-xs font-semibold text-muted-foreground">Sponsors</span>
          </Card>

          <Card className="flex flex-col items-center justify-center p-4 border-none shadow-sm bg-(--zinc-50)">
            <Clock className="h-6 w-6 text-(--blue-600) mb-2" />
            <span className="text-2xl font-bold">{funnel ? funnel.lastMinuteCount : "—"}</span>
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Last-Minute tickets
            </span>
          </Card>

          <Card className="flex flex-col items-center justify-center p-4 border-none shadow-sm bg-(--zinc-50)">
            <BookmarkCheck className="h-6 w-6 text-(--blue-600) mb-2" />
            <span className="text-2xl font-bold">{funnel ? funnel.earlyBirdCount : "—"}</span>
            <span className="text-xs font-semibold text-muted-foreground">Early Birds</span>
          </Card>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          Last-minute = bought within 24h of the event. Early bird = bought 7+ days ahead.
        </p>
      </CardContent>
    </Card>
  )
}
