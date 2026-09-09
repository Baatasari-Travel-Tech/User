"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { CalendarDays, ChevronRight, Play, TrendingUp, Users } from "lucide-react"

import { useAuth } from "@/app/providers"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { UpcomingEventPanel } from "@/components/event-org/upcoming-event-panel"
import { InsightsAnalytics } from "@/components/event-org/insights-analytics"
import { GstThresholdBanner } from "@/components/event-org/gst-threshold-banner"
import { toUpcomingManageEvents } from "@/components/event-org/manage-events/manage-events"
import { apiRequest } from "@/lib/api/client"
import type { EventDetail, OrganizerAnalytics } from "@/types/api"

type DashboardQueryData = {
  analytics: OrganizerAnalytics
  events: EventDetail[]
}

export default function Home() {
  const { profile } = useAuth()

  const dashboardQuery = useQuery<DashboardQueryData, Error>({
    queryKey: ["organizer-dashboard"],
    queryFn: async () => {
      const [analyticsResponse, eventsResponse] = await Promise.all([
        apiRequest<{ data: { analytics: OrganizerAnalytics } }>("/organizer/analytics", {
          auth: true,
        }),
        apiRequest<{ data: { events: EventDetail[] } }>("/organizer/events", {
          auth: true,
        }),
      ])

      return {
        analytics: analyticsResponse.data.analytics,
        events: eventsResponse.data.events,
      }
    },
  })

  const greetingName = profile?.full_name?.trim().split(/\s+/)[0] || "Organizer"
  const analytics = dashboardQuery.data?.analytics ?? null
  const events = useMemo(() => dashboardQuery.data?.events ?? [], [dashboardQuery.data?.events])

  const upcomingEvents = useMemo(() => toUpcomingManageEvents(events), [events])
  const upcomingEvent = upcomingEvents[0] ?? null
  const upcomingRaw = useMemo(
    () => (upcomingEvent ? events.find((e) => e.id === upcomingEvent.id) ?? null : null),
    [events, upcomingEvent],
  )

  const totalEvents = analytics?.totalEvents ?? events.length
  const upcomingCount = upcomingEvents.length
  const pastCount = Math.max(0, events.length - upcomingCount)
  const totalCapacity = analytics?.totalCapacity ?? 0
  const isLoading = dashboardQuery.isLoading

  const errorMessage = dashboardQuery.isError
    ? dashboardQuery.error?.message || "Unable to load dashboard data right now."
    : null

  const statCards = [
    {
      label: "Total Events",
      value: isLoading ? "—" : totalEvents.toLocaleString("en-IN"),
      sub: "All time",
      icon: CalendarDays,
      iconCls: "bg-violet-100 text-violet-600",
    },
    {
      label: "Upcoming",
      value: isLoading ? "—" : upcomingCount.toLocaleString("en-IN"),
      sub: "Scheduled",
      icon: TrendingUp,
      iconCls: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Past Events",
      value: isLoading ? "—" : pastCount.toLocaleString("en-IN"),
      sub: "Completed",
      icon: Play,
      iconCls: "bg-orange-100 text-orange-500",
    },
    {
      label: "Total Capacity",
      value: isLoading ? "—" : totalCapacity.toLocaleString("en-IN"),
      sub: "Across all events",
      icon: Users,
      iconCls: "bg-amber-100 text-amber-600",
    },
  ]

  return (
    <ProtectedRoute requireOrganizer>
      <div className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-1">
          <h1 className="font-bricolage text-2xl font-bold text-slate-900 sm:text-3xl">
            Hello {greetingName}! <span aria-hidden>👋</span>
          </h1>
          <p className="text-sm text-slate-500">
            Track, update, and grow your events the smart way.
          </p>
        </div>

        <GstThresholdBanner />

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {statCards.map(({ label, value, sub, icon: Icon, iconCls }) => (
            <div
              key={label}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 sm:flex-row sm:items-center sm:p-5"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="hidden text-xs font-medium text-slate-500 sm:block">{label}</p>
                <p className="text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">{value}</p>
                <p className="text-xs font-medium text-slate-500 sm:hidden">{label}</p>
                <p className="text-[11px] text-slate-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <UpcomingEventPanel
          event={upcomingEvent}
          raw={upcomingRaw}
          isLoading={isLoading}
          errorMessage={errorMessage}
          headerRight={
            <Link
              href="/organizer/manage-events"
              className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
            >
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          }
        />

        <InsightsAnalytics
          analytics={analytics}
          events={events}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
      </div>
    </ProtectedRoute>
  )
}
