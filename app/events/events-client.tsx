"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Calendar as CalendarIcon, ListFilter, Search } from "lucide-react"
import { EventCard, EventCardSkeleton } from "@/components/events/event-card"
import { EventsFooter } from "@/components/events/events-footer"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { eventTab, getEventPhase, type EventTab } from "@/lib/event-helpers"
import { EVENT_CATEGORY_NAMES, eventMatchesCategoryGroup } from "@/lib/event-categories"
import { fetchAllEvents } from "@/lib/api/events"
import { citySlug, groupCities } from "@/lib/cities"
import type { EventSummary } from "@/types/api"

// Partial, case-insensitive search across the fields a person would type —
// no need to fill every field; any matching token is enough.
function matchesQuery(event: EventSummary, query: string): boolean {
  if (!query.trim()) return true
  const needle = query.trim().toLowerCase()
  return [event.title, event.venue, event.category, event.tagline, ...(event.artists ?? []).map((a) => a.name)].some(
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
  if (when === "month") return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
  if (when === "weekend") {
    const day = date.getDay()
    const withinWeek =
      date.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000 && date.getTime() >= now.setHours(0, 0, 0, 0)
    return (day === 0 || day === 6) && withinWeek
  }
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
  // "Bangalore" and "Bengaluru" are the same city.
  if (event.locationCity && citySlug(event.locationCity) === citySlug(where)) return true
  return typeof event.venue === "string" && event.venue.toLowerCase().includes(needle)
}

const TABS: Array<{ key: EventTab; label: string; noun: string; order: string }> = [
  // Two tabs. "Upcoming" also holds events that are on today or running over several days.
  { key: "upcoming", label: "Upcoming", noun: "upcoming", order: "" },
  { key: "past", label: "Past events", noun: "past", order: "" },
]

const DATE_OPTIONS = [
  { value: "anytime", label: "Any date" },
  { value: "today", label: "Today" },
  { value: "weekend", label: "This weekend" },
  { value: "month", label: "This month" },
]

const pillTrigger =
  "h-11 w-auto min-w-0 gap-2 rounded-full border border-(--gray-200) bg-white px-4 text-sm font-semibold text-(--brand-navy) shadow-none focus:ring-0"

// How many cards to show to begin with; the button reveals more. On a phone only
// the first four of these show until "Show more" is pressed.
const FIRST_PAGE = 8
const PAGE_STEP = 8
const PHONE_FIRST = 4

function EventsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get("q") ?? ""
  const category = searchParams.get("category") ?? ""
  const when = searchParams.get("when") ?? ""
  const where = searchParams.get("where") ?? ""

  const eventsQuery = useQuery({ queryKey: ["public-events"], queryFn: fetchAllEvents, staleTime: 60_000 })
  const data = eventsQuery.data

  // The tab the visitor picked; until then, Upcoming.
  const [chosenTab, setChosenTab] = useState<EventTab | null>(null)
  const [shown, setShown] = useState(FIRST_PAGE)
  const [phoneExpanded, setPhoneExpanded] = useState(false)
  const [searchText, setSearchText] = useState(query)
  const [showEverywhere, setShowEverywhere] = useState(false)

  const updateParams = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === "all" || value === "anytime") params.delete(key)
      else params.set(key, value)
    }
    const qs = params.toString()
    router.replace(qs ? `/events?${qs}` : "/events", { scroll: false })
  }

  // Search as you type, a moment after the last key.
  useEffect(() => {
    if (searchText.trim() === query.trim()) return
    const id = setTimeout(() => updateParams({ q: searchText.trim() }), 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText])

  // Approximate city from the visitor’s connection (city level only, nothing
  // stored). Failure or an unknown location just means "show all events".
  const geoQuery = useQuery({
    queryKey: ["visitor-geo"],
    queryFn: async (): Promise<{ city: string | null }> => {
      const res = await fetch("/api/geo", { cache: "no-store" })
      return res.ok ? ((await res.json()) as { city: string | null }) : { city: null }
    },
    staleTime: Infinity,
    retry: false,
  })

  // The visitor’s city, as it is spelled on our events, but only when that
  // city has something on. An explicit "where" always wins.
  const nearCity = useMemo(() => {
    if (where.trim() || showEverywhere) return null
    const slug = citySlug(geoQuery.data?.city)
    if (!slug) return null
    return groupCities(data ?? []).find((c) => c.slug === slug)?.name ?? null
  }, [data, geoQuery.data, where, showEverywhere])
  const effectiveWhere = where.trim() || nearCity || ""
  const cityList = useMemo(() => groupCities(data ?? []), [data])

  const filtered = useMemo(
    () =>
      (data ?? []).filter(
        (event) =>
          matchesQuery(event, query) &&
          matchesCategory(event, category) &&
          matchesWhen(event, when) &&
          matchesLocation(event, effectiveWhere),
      ),
    [data, query, category, when, effectiveWhere],
  )

  const byTab = useMemo(() => {
    const groups: Record<EventTab, EventSummary[]> = { live: [], upcoming: [], past: [] }
    for (const event of filtered) {
      const tab = eventTab(event)
      groups[tab === "live" ? "upcoming" : tab].push(event)
    }
    // Soonest first; finished events with the most recent on top.
    const start = (e: EventSummary) => getEventPhase(e).sort
    groups.live.sort((a, b) => start(a) - start(b))
    groups.upcoming.sort((a, b) => start(a) - start(b))
    groups.past.sort((a, b) => start(b) - start(a))
    return groups
  }, [filtered])

  const tab: EventTab = chosenTab ?? "upcoming"

  const choose = (next: EventTab) => {
    setChosenTab(next)
    setShown(FIRST_PAGE)
    setPhoneExpanded(false)
  }

  const list = byTab[tab]
  const visible = list.slice(0, shown)
  const hiddenOnPhone = !phoneExpanded ? Math.max(0, Math.min(visible.length, FIRST_PAGE) - PHONE_FIRST) : 0
  const moreCount = Math.max(0, list.length - visible.length)
  const noun = TABS.find((t) => t.key === tab)?.noun ?? "upcoming"
  const cityName = effectiveWhere
  const heading = cityName ? `Events in ${cityName}` : "Events"
  const countLabel = eventsQuery.isPending
    ? "Loading events…"
    : `${list.length} ${noun} event${list.length === 1 ? "" : "s"}`

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-14 pt-8 md:px-6 md:pt-12 lg:px-10">
        {eventsQuery.isError ? (
          <section className="flex flex-col items-center justify-center py-32 text-center">
            <h1 className="text-2xl font-semibold text-(--brand-navy)">Unable to load events</h1>
            <p className="mt-3 text-(--gray-500)">Please try again in a moment.</p>
          </section>
        ) : (
          <>
            {/* Title + search */}
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="font-bricolage text-[2.1rem] font-bold leading-[1.1] tracking-tight text-(--brand-navy) md:text-5xl">
                  {heading}
                </h1>
                <p className="mt-2 text-[15px] text-(--gray-500)">
                  {countLabel}
                  <span className="hidden md:inline"> · concerts, comedy, workshops and more</span>
                </p>
                {nearCity ? (
                  <p className="mt-1 text-xs text-(--gray-500)">
                    Showing events near you.{" "}
                    <button
                      type="button"
                      onClick={() => setShowEverywhere(true)}
                      className="font-semibold underline underline-offset-2"
                    >
                      Show events everywhere
                    </button>
                  </p>
                ) : null}
              </div>
              <label className="relative block w-full md:w-[420px]">
                <span className="sr-only">Search events</span>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-(--gray-400)" />
                <input
                  type="search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search events, venues or artists"
                  className="h-12 w-full rounded-full border border-(--gray-200) bg-white pl-12 pr-4 text-[15px] text-(--brand-navy) outline-none placeholder:text-(--gray-400) focus:border-(--brand-navy)"
                />
              </label>
            </div>

            {/* Tabs + filters */}
            <div className="mt-6 flex flex-col gap-3 border-b border-(--gray-200) md:flex-row md:items-end md:justify-between md:gap-4">
              <div role="tablist" aria-label="Which events" className="flex gap-7">
                {TABS.map((t) => {
                  const active = tab === t.key
                  return (
                    <button
                      key={t.key}
                      role="tab"
                      aria-selected={active}
                      onClick={() => choose(t.key)}
                      className={`${t.order} -mb-px border-b-2 pb-3 text-[15px] font-semibold transition ${
                        active
                          ? "border-(--brand-navy) text-(--brand-navy)"
                          : "border-transparent text-(--gray-500) hover:text-(--brand-navy)"
                      }`}
                    >
                      {t.label}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center gap-2 pb-3 md:pb-3">
                <Select value={category || "all"} onValueChange={(v) => updateParams({ category: v })}>
                  <SelectTrigger className={`${pillTrigger} flex-1 md:flex-none`} aria-label="Category">
                    <ListFilter className="h-4 w-4 shrink-0 text-(--gold-icon)" aria-hidden />
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {EVENT_CATEGORY_NAMES.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={when || "anytime"} onValueChange={(v) => updateParams({ when: v })}>
                  <SelectTrigger className={`${pillTrigger} flex-1 md:flex-none`} aria-label="Date">
                    <CalendarIcon className="h-4 w-4 shrink-0 text-(--gold-icon)" aria-hidden />
                    <SelectValue placeholder="Any date" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cards */}
            <div className="mt-7">
              {eventsQuery.isPending ? (
                <EventCardSkeleton />
              ) : list.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
                    {visible.map((event, index) => (
                      <div
                        key={event.id}
                        className={!phoneExpanded && index >= PHONE_FIRST ? "hidden sm:block" : undefined}
                      >
                        <EventCard event={event} priority={index < 4} />
                      </div>
                    ))}
                  </div>

                  {hiddenOnPhone > 0 ? (
                    <button
                      type="button"
                      onClick={() => setPhoneExpanded(true)}
                      className="mt-8 flex h-12 w-full items-center justify-center rounded-full border border-(--gray-200) bg-white text-[15px] font-semibold text-(--brand-navy) transition hover:border-(--brand-navy) sm:hidden"
                    >
                      Show {hiddenOnPhone} more event{hiddenOnPhone === 1 ? "" : "s"}
                    </button>
                  ) : null}
                  {moreCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShown((n) => n + PAGE_STEP)
                        setPhoneExpanded(true)
                      }}
                      className={`mt-8 h-12 w-full items-center justify-center rounded-full border border-(--gray-200) bg-white text-[15px] font-semibold text-(--brand-navy) transition hover:border-(--brand-navy) ${
                        hiddenOnPhone > 0 ? "hidden sm:flex" : "flex"
                      }`}
                    >
                      Show {Math.min(moreCount, PAGE_STEP)} more event{Math.min(moreCount, PAGE_STEP) === 1 ? "" : "s"}
                    </button>
                  ) : null}
                </>
              ) : (
                <section className="flex flex-col items-center justify-center rounded-3xl border border-(--gray-200) bg-white/60 px-6 py-20 text-center">
                  <h2 className="text-xl font-semibold text-(--brand-navy)">
                    {tab === "past" ? "No past events to show" : "No upcoming events yet"}
                  </h2>
                  <p className="mt-2 max-w-sm text-sm text-(--gray-500)">
                    Try a different tab or filter, or check back soon: new events go live all the time.
                  </p>
                </section>
              )}
            </div>

            {/* Browse by city: real links, so every city page is reachable from here */}
            {cityList.length > 0 ? (
              <nav aria-label="Browse events by city" className="mt-10 flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-(--gray-500)">Browse by city:</span>
                {cityList.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/events/${c.slug}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-(--gray-200) bg-white px-4 text-sm font-semibold text-(--gray-700) hover:border-(--brand-navy) hover:text-(--brand-navy)"
                  >
                    {c.name}
                  </Link>
                ))}
              </nav>
            ) : null}

            {/* Organizers */}
            <section className="mt-10 flex flex-col gap-5 rounded-3xl border border-(--gold-soft-border) bg-(--gold-bar-bg) p-6 md:flex-row md:items-center md:justify-between md:px-10 md:py-8">
              <div>
                <h2 className="text-xl font-semibold text-(--brand-navy)">
                  More events are coming{cityName ? ` to ${cityName}` : ""}
                </h2>
                <p className="mt-1 text-[15px] text-(--gray-600)">
                  Organising a concert, workshop or meetup? Put it on Baatasari and sell tickets in minutes.
                </p>
              </div>
              <a
                href="https://organizer.baatasari.com"
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-(--brand-navy) px-7 text-[15px] font-semibold text-white transition hover:bg-(--brand-navy)/90"
              >
                List your event
              </a>
            </section>
          </>
        )}
      </div>

      <EventsFooter />
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
