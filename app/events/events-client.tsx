"use client"

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { EventGrid, EventGridSkeleton } from "@/components/events/event-grid"
import { EventsSearchHero } from "@/components/events/events-search-hero"
import { SiteFooter } from "@/components/site-footer"
import { toEventCardData, getEventPhase } from "@/lib/event-helpers"
import { eventMatchesCategoryGroup } from "@/lib/event-categories"
import { apiRequest } from "@/lib/api/client"
import type { EventSummary } from "@/types/api"

const PHASE_ORDER: Record<string, number> = { ongoing: 0, upcoming: 1, recent: 2 }

// Partial, case-insensitive search across the fields a person would type —
// no need to fill every field; any matching token is enough.
function matchesQuery(event: EventSummary, query: string): boolean {
  if (!query.trim()) return true
  const needle = query.trim().toLowerCase()
  return [event.title, event.venue, event.category, event.tagline].some(
    (value) => typeof value === "string" && value.toLowerCase().includes(needle),
  )
}

function matchesCategory(event: EventSummary, category: string): boolean {
  if (!category || category.toLowerCase() === "all") return true
  return eventMatchesCategoryGroup(event.category, category)
}

function matchesWhen(event: EventSummary, when: string): boolean {
  if (!when || when === "anytime") return true
  const date = new Date(event.date)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  if (when === "today") return date.toDateString() === now.toDateString()
  if (when === "month")
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  if (when === "weekend") {
    const day = date.getDay()
    const withinWeek = date.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000 && date.getTime() >= now.setHours(0, 0, 0, 0)
    return (day === 0 || day === 6) && withinWeek
  }
  return true
}

function matchesBudget(event: EventSummary, budget: string): boolean {
  if (!budget || budget === "any") return true
  const price = event.startingPrice ?? 0
  if (budget === "free") return price === 0
  if (budget === "pocket") return price > 0 && price <= 500
  if (budget === "premium") return price > 500
  return true
}

// "Where" filter — matches against the structured location (when the
// organizer picked one via the event-creation location search) OR falls
// back to a plain substring match on the venue text, so events created
// before that field existed still filter correctly.
function matchesLocation(event: EventSummary, where: string): boolean {
  if (!where.trim()) return true
  const needle = where.trim().toLowerCase()
  if (event.locationCity && event.locationCity.toLowerCase() === needle) return true
  return typeof event.venue === "string" && event.venue.toLowerCase().includes(needle)
}

const STATUS_FILTERS = [
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Completed" },
] as const

type StatusFilterKey = (typeof STATUS_FILTERS)[number]["key"]

function EventsPageContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") ?? ""
  const category = searchParams.get("category") ?? ""
  const when = searchParams.get("when") ?? ""
  const budget = searchParams.get("budget") ?? ""
  const where = searchParams.get("where") ?? ""

  const eventsQuery = useQuery({
    queryKey: ["public-events"],
    queryFn: () =>
      apiRequest<{ data: { events: EventSummary[] } }>("/events").then((r) => r.data.events),
    staleTime: 60_000,
  })

  const data = eventsQuery.data
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("live")

  // Only ever lists cities that have at least one real published event —
  // never a hardcoded/aspirational list.
  const cities = useMemo(() => {
    const set = new Set(
      (data ?? [])
        .map((event) => event.locationCity?.trim())
        .filter((city): city is string => Boolean(city)),
    )
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [data])

  const sortedCards = useMemo(() => {
    const filtered = (data ?? []).filter(
      (event) =>
        matchesQuery(event, query) &&
        matchesCategory(event, category) &&
        matchesWhen(event, when) &&
        matchesBudget(event, budget) &&
        matchesLocation(event, where),
    )

    // Live/ongoing first, then upcoming (soonest first), then completed
    // (most recent first). We keep ALL completed events — old ones included —
    // so the Completed filter shows the full history, not just the last 2 days.
    return filtered
      .map((event) => ({ event, ...getEventPhase(event) }))
      .sort((a, b) => {
        const order = (PHASE_ORDER[a.phase] ?? 9) - (PHASE_ORDER[b.phase] ?? 9)
        if (order !== 0) return order
        const isPast = a.phase === "recent" || a.phase === "hidden"
        return isPast ? b.sort - a.sort : a.sort - b.sort
      })
      .map((item) => toEventCardData(item.event))
  }, [data, query, category, when, budget, where])

  const visibleCards = sortedCards.filter((c) => c.status === statusFilter)
  const gridTitle = `${STATUS_FILTERS.find((f) => f.key === statusFilter)?.label ?? "Live"} Events`

  return (
    <main className="min-h-screen bg-background">
      <div>
        {eventsQuery.isError ? (
          <section className="flex flex-col items-center justify-center py-32 text-center">
            <h2 className="text-2xl font-semibold text-(--brand-blue)">Unable to load events</h2>
            <p className="mt-3 text-gray-500">Please try again in a moment.</p>
          </section>
        ) : (
          <>
            <EventsSearchHero cities={cities} />

            {/* Header row: title + count (left), status filters (right) */}
            <section className="page-x-wide pt-10 md:pt-12">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-bricolage text-3xl font-bold text-(--brand-blue) md:text-4xl">
                    {gridTitle}
                  </h2>
                  <p className="mt-1 text-sm text-(--gray-500)">
                    {eventsQuery.isPending
                      ? "Loading events…"
                      : `${visibleCards.length} event${visibleCards.length === 1 ? "" : "s"} to explore`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((f) => {
                    const active = statusFilter === f.key
                    return (
                      <button
                        key={f.key}
                        onClick={() => setStatusFilter(f.key)}
                        className={`rounded-full border px-5 py-2 font-poppins text-sm font-semibold transition ${
                          active
                            ? "border-(--brand-navy) bg-(--brand-navy) text-white shadow-md"
                            : "border-(--gray-200) bg-white text-(--gray-700) hover:border-(--brand-blue) hover:text-(--brand-blue)"
                        }`}
                      >
                        {f.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            {eventsQuery.isPending ? (
              <EventGridSkeleton />
            ) : visibleCards.length > 0 ? (
              <EventGrid events={visibleCards} title={gridTitle} hideHeader />
            ) : (
              <section className="flex flex-col items-center justify-center py-24 text-center">
                <h2 className="text-2xl font-semibold text-(--brand-blue)">No events here yet</h2>
                <p className="mt-3 text-gray-500">Try a different filter or check back later.</p>
              </section>
            )}
          </>
        )}
      </div>

      <SiteFooter />
    </main>
  )
}

export default function EventsClient() {
  return (
    <Suspense fallback={null}>
      <EventsPageContent />
    </Suspense>
  )
}
