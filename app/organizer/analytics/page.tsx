"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Download,
  MapPin,
  Pencil,
  ScanLine,
  Users,
} from "lucide-react"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { apiRequest } from "@/lib/api/client"
import type { EventDetail } from "@/types/api"

import { EventStats } from "@/components/event-org/analytics/event-stats"
import { RevenueStats } from "@/components/event-org/analytics/revenue-stats"
import { DateReviewsSection } from "@/components/event-org/analytics/date-reviews"
import { ViewsVsPurchases } from "@/components/event-org/analytics/views-vs-purchases"
import { GstThresholdBanner } from "@/components/event-org/gst-threshold-banner"

type Status = "Upcoming" | "Live" | "Ended"

const getStatus = (dateStr: string): Status => {
  const eventDay = new Date(dateStr)
  if (Number.isNaN(eventDay.getTime())) return "Upcoming"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  eventDay.setHours(0, 0, 0, 0)
  if (eventDay.getTime() > today.getTime()) return "Upcoming"
  if (eventDay.getTime() < today.getTime()) return "Ended"
  return "Live"
}

const STATUS_CHIP: Record<Status, string> = {
  Live: "bg-emerald-100 text-emerald-700",
  Upcoming: "bg-blue-100 text-blue-700",
  Ended: "bg-slate-200 text-slate-600",
}

const formatMetaDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value),
  )

const formatWeekday = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(new Date(value))

function AnalyticsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get("eventId")
  const [exportLoading, setExportLoading] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const handleExportCsv = async () => {
    if (!eventId) return
    setExportLoading(true)
    setExportError(null)
    try {
      const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""
      const res = await fetch(`${base}/api/v1/organizer/events/${eventId}/attendees/export`, {
        credentials: "include",
        headers: { "x-active-role": "ORGANIZER" },
      })
      if (!res.ok) throw new Error("Export failed. Please try again.")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `attendees-${eventId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed.")
    } finally {
      setExportLoading(false)
    }
  }

  const eventsQuery = useQuery<EventDetail[], Error>({
    queryKey: ["organizer-events"],
    queryFn: async () => {
      const response = await apiRequest<{ data: { events: EventDetail[] } }>("/organizer/events", { auth: true })
      return response.data.events
    },
    enabled: !eventId,
  })

  useEffect(() => {
    if (eventId || !eventsQuery.data) return
    const events = eventsQuery.data
    if (events.length === 0) return
    const now = Date.now()
    const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const nearest = sorted.find((e) => new Date(e.date).getTime() >= now) ?? sorted[sorted.length - 1]
    if (nearest) {
      router.replace(`/organizer/analytics?eventId=${encodeURIComponent(nearest.id)}`)
    }
  }, [eventId, eventsQuery.data, router])

  const eventQuery = useQuery<EventDetail, Error>({
    queryKey: ["organizer-event-analytics", eventId],
    queryFn: async () => {
      const response = await apiRequest<{ data: { event: EventDetail } }>(
        `/organizer/events/${eventId}`,
        { auth: true }
      )
      return response.data.event
    },
    enabled: Boolean(eventId),
  })

  const event = eventQuery.data ?? null
  const isLoading = eventQuery.isLoading

  const handleEdit = () => {
    if (!eventId) return
    router.push(
      `/organizer/create-event?startDirectly=true&action=edit&eventId=${encodeURIComponent(eventId)}`
    )
  }

  if (!eventId) {
    if (eventsQuery.isLoading || (eventsQuery.data && eventsQuery.data.length > 0)) {
      return (
        <div className="w-full px-0 sm:px-6 lg:px-8 py-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
            <p className="text-slate-500 text-sm">Loading events...</p>
          </div>
        </div>
      )
    }
    return (
      <div className="w-full px-0 sm:px-6 lg:px-8 py-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center flex flex-col items-center gap-3">
          <p className="text-slate-500 text-sm">No events yet. Create your first event to view analytics.</p>
          <button
            className="rounded-full bg-slate-900 text-white px-5 py-2 text-sm font-semibold hover:bg-slate-800 transition"
            onClick={() => router.push("/organizer/create-event?mode=create")}
          >
            Create Event
          </button>
        </div>
      </div>
    )
  }

  if (eventQuery.isError) {
    return (
      <div className="w-full px-0 sm:px-6 lg:px-8 py-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
          {eventQuery.error?.message ?? "Unable to load event analytics."}
        </div>
      </div>
    )
  }

  const status = event ? getStatus(event.date) : null
  const totalCapacity = event
    ? (event.ticketTiers ?? []).reduce((sum, tier) => sum + Number(tier.quantity ?? 0), 0) ||
      Number(event.capacity ?? 0)
    : 0
  const timeDisplay = event
    ? event.startTime && event.endTime
      ? `${event.startTime}`
      : event.startTime ?? "TBA"
    : ""

  return (
    <div className="w-full px-0 sm:px-6 lg:px-8 pt-0 pb-6 flex flex-col gap-5">
      <GstThresholdBanner />

      {/* ── Header: back + title + status · scan / edit ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Back to events"
            onClick={() => router.push("/organizer/manage-events")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-400"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="truncate font-bricolage text-xl font-bold text-slate-900 sm:text-2xl">
            {isLoading ? "Loading…" : event?.title}
          </h1>
          {status ? (
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${STATUS_CHIP[status]}`}
            >
              {status}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleExportCsv()}
            disabled={exportLoading || !event}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{exportLoading ? "Exporting…" : "Export CSV"}</span>
          </button>
          <Link
            href={`/organizer/events/${eventId}/scan`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            <ScanLine className="h-4 w-4" /> Scan
          </Link>
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center gap-2 rounded-full bg-(--brand-navy) px-4 py-2 text-sm font-semibold text-white transition hover:bg-(--brand-navy)/90"
          >
            <Pencil className="h-4 w-4" /> Edit Event
          </button>
        </div>
      </div>

      {exportError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {exportError}
        </p>
      ) : null}

      {/* ── Meta strip ── */}
      {event ? (
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:grid-cols-4 sm:p-5">
          <div className="flex items-start gap-2.5">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-(--gold-icon)" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400">Date</p>
              <p className="truncate text-sm font-bold text-slate-900">{formatMetaDate(event.date)}</p>
              <p className="truncate text-xs font-medium text-slate-600">{formatWeekday(event.date)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-(--gold-icon)" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400">Time</p>
              <p className="truncate text-sm font-bold text-slate-900">{timeDisplay}</p>
              {event.endTime ? (
                <p className="truncate text-xs font-medium text-slate-600">{event.endTime}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--gold-icon)" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400">Venue</p>
              <p className="truncate text-sm font-bold text-slate-900">{event.venue ?? "TBA"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-(--gold-icon)" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-400">Total Capacity</p>
              <p className="truncate text-sm font-bold tabular-nums text-slate-900">
                {totalCapacity.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <EventStats event={event} isLoading={isLoading} />
      <ViewsVsPurchases eventId={event?.id} />
      <RevenueStats event={event} isLoading={isLoading} />
      <DateReviewsSection eventId={event?.id} />
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute requireOrganizer>
      <Suspense fallback={null}>
        <AnalyticsContent />
      </Suspense>
    </ProtectedRoute>
  )
}
