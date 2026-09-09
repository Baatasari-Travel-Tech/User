"use client"

import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { CalendarDays, ChevronLeft, ChevronRight, Play, TrendingUp, Zap } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { UpcomingEventPanel } from "@/components/event-org/upcoming-event-panel"
import { EventsTable } from "@/components/event-org/manage-events/events-table"
import { toUpcomingManageEvents } from "@/components/event-org/manage-events/manage-events"
import { apiRequest } from "@/lib/api/client"
import type { EventDetail } from "@/types/api"

export default function ManageEventsPage() {
  const eventsQuery = useQuery<EventDetail[], Error>({
    queryKey: ["organizer-events", "manage-events"],
    queryFn: async () => {
      const response = await apiRequest<{ data: { events: EventDetail[] } }>("/organizer/events", {
        auth: true,
      })
      return response.data.events
    },
  })

  const errorMessage = eventsQuery.isError
    ? eventsQuery.error?.message || "Unable to load organizer events right now."
    : null

  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data])
  const upcomingCards = useMemo(() => toUpcomingManageEvents(events), [events])

  // Carousel over the upcoming events (soonest first).
  const [slide, setSlide] = useState(0)
  const safeSlide = upcomingCards.length > 0 ? slide % upcomingCards.length : 0
  const activeCard = upcomingCards[safeSlide] ?? null
  const activeRaw = useMemo(
    () => (activeCard ? events.find((e) => e.id === activeCard.id) ?? null : null),
    [events, activeCard],
  )

  const upcomingCount = upcomingCards.length
  const pastCount = Math.max(0, events.length - upcomingCount)
  const isLoading = eventsQuery.isLoading

  const statCells = [
    {
      label: "Total Events",
      value: isLoading ? "—" : events.length.toLocaleString("en-IN"),
      sub: "All time",
      icon: CalendarDays,
      cls: "bg-sky-100 text-sky-600",
    },
    {
      label: "Upcoming",
      value: isLoading ? "—" : upcomingCount.toLocaleString("en-IN"),
      sub: "Scheduled events",
      icon: TrendingUp,
      cls: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Past",
      value: isLoading ? "—" : pastCount.toLocaleString("en-IN"),
      sub: "Completed events",
      icon: Play,
      cls: "bg-orange-100 text-orange-500",
    },
  ]

  return (
    <ProtectedRoute requireOrganizer>
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
        <div>
          <h1 className="font-bricolage text-2xl font-bold text-slate-900 sm:text-3xl">
            Manage Events
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create, manage and track all your events in one place.
          </p>
        </div>

        {/* ── Stat strip ── */}
        <div className="grid grid-cols-2 gap-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:grid-cols-4 sm:divide-x sm:divide-slate-100 sm:p-5">
          {statCells.map(({ label, value, sub, icon: Icon, cls }) => (
            <div key={label} className="flex items-center gap-3 sm:px-4 sm:first:pl-0">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cls}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="text-xl font-bold tabular-nums text-slate-900">{value}</p>
                <p className="text-[11px] text-slate-400">{sub}</p>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3 sm:px-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <Zap className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900">Everything in one place</p>
              <p className="text-[11px] leading-snug text-slate-400">
                Track registrations, engagement and more for every event you host.
              </p>
            </div>
          </div>
        </div>

        {/* ── Upcoming event carousel ── */}
        <UpcomingEventPanel
          event={activeCard}
          raw={activeRaw}
          isLoading={isLoading}
          errorMessage={errorMessage}
          headerRight={
            upcomingCards.length > 1 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous upcoming event"
                  onClick={() =>
                    setSlide((s) => (s - 1 + upcomingCards.length) % upcomingCards.length)
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-400"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  {upcomingCards.map((card, i) => (
                    <button
                      key={card.id}
                      type="button"
                      aria-label={`Go to ${card.title}`}
                      onClick={() => setSlide(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === safeSlide ? "w-4 bg-slate-800" : "w-2 bg-slate-300"
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Next upcoming event"
                  onClick={() => setSlide((s) => (s + 1) % upcomingCards.length)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-400"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null
          }
        />

        {/* ── All events ── */}
        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : (
          <EventsTable events={events} />
        )}
      </div>
    </ProtectedRoute>
  )
}
