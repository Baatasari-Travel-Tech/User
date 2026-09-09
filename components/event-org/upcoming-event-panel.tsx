"use client"

import { useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  CalendarClock,
  CalendarDays,
  Clock,
  Gift,
  MapPin,
  Pencil,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ShareEventButton } from "@/components/event-org/share-event-button"
import type { UpcomingManageEvent } from "@/components/event-org/manage-events/manage-events"
import { useDateChangeCount } from "@/hooks/use-date-change-count"
import { apiRequest } from "@/lib/api/client"
import type { EventDetail } from "@/types/api"

type UpcomingEventPanelProps = {
  event?: UpcomingManageEvent | null
  // The raw event record behind the card — used for tier-level numbers the
  // mapped card shape doesn't carry (capacity, per-tier sold counts).
  raw?: EventDetail | null
  isLoading?: boolean
  errorMessage?: string | null
  // Right side of the card header (dashboard: "View all", manage: carousel arrows).
  headerRight?: React.ReactNode
}

export function UpcomingEventPanel({
  event = null,
  raw = null,
  isLoading = false,
  errorMessage = null,
  headerRight = null,
}: UpcomingEventPanelProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [failedPoster, setFailedPoster] = useState<string | null>(null)

  // Pending date-change requests — real count from the date-requests endpoint.
  const dateChangeQuery = useDateChangeCount(event?.id)

  const cancelMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/organizer/events/${event!.id}/cancel`, { method: "POST", auth: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organizer-events"] })
      await queryClient.invalidateQueries({ queryKey: ["organizer-dashboard"] })
    },
    onError: (err) => {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel event. Please try again.")
    },
  })

  const goToAnalytics = () => {
    if (!event) return
    localStorage.setItem("analyticsEventData", JSON.stringify(event.analyticsData))
    router.push(`/organizer/analytics?eventId=${encodeURIComponent(event.id)}`)
  }

  const goToCreateEvent = (action: "edit" | "reschedule") => {
    if (!event) return
    localStorage.setItem("eventFormData", JSON.stringify(event.formData))
    router.push(
      `/organizer/create-event?startDirectly=true&action=${action}&eventId=${encodeURIComponent(event.id)}`,
    )
  }

  const shell = (body: React.ReactNode) => (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">Upcoming Event</h2>
        {headerRight}
      </div>
      {body}
    </div>
  )

  if (isLoading) {
    return shell(<p className="mt-4 text-sm text-slate-500">Loading upcoming event…</p>)
  }
  if (errorMessage) {
    return shell(<p className="mt-4 text-sm text-rose-600">{errorMessage}</p>)
  }
  if (!event) {
    return shell(
      <div className="mt-4">
        <p className="text-sm text-slate-600">
          You don&rsquo;t have an upcoming event yet. Create one to see it here.
        </p>
        <button
          type="button"
          onClick={() => router.push("/organizer/create-event?mode=create")}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-(--brand-navy) px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-(--brand-navy)/90"
        >
          Create Event
        </button>
      </div>,
    )
  }

  const registered = (raw?.ticketTiers ?? []).reduce(
    (sum, tier) => sum + Number(tier.soldCount ?? 0),
    0,
  )
  const capacity =
    (raw?.ticketTiers ?? []).reduce((sum, tier) => sum + Number(tier.quantity ?? 0), 0) ||
    Number(raw?.capacity ?? 0)
  const bookedPct = capacity > 0 ? Math.round((registered / capacity) * 100) : 0
  const highlightChips = event.highlights.filter(Boolean)
  const dateChangeCount = dateChangeQuery.data

  return shell(
    <>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* Left: poster + identity (click-through to analytics) */}
        <button type="button" onClick={goToAnalytics} className="flex gap-4 text-left sm:gap-5">
          <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-36">
            {failedPoster !== event.posterImage ? (
              <Image
                src={event.posterImage}
                alt={`${event.title} poster`}
                fill
                sizes="(min-width: 640px) 144px, 96px"
                className="object-cover"
                onError={() => setFailedPoster(event.posterImage)}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                No image
              </span>
            )}
          </div>
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              Upcoming
            </span>
            <h3 className="mt-2 font-bricolage text-xl font-bold text-slate-900 sm:text-2xl">
              {event.title}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-slate-400" />
                {event.date}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                {event.timeRange}
              </span>
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                {event.type}
              </span>
            </div>
            <p className="mt-1.5 hidden items-center gap-1.5 text-sm text-slate-500 sm:flex">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">{event.venue}</span>
            </p>

            {highlightChips.length > 0 ? (
              <>
                <p className="mt-4 hidden text-xs font-semibold text-slate-500 sm:block">
                  Event Highlights
                </p>
                <div className="mt-2 hidden flex-wrap gap-2 sm:flex">
                  {highlightChips.slice(0, 3).map((h) => (
                    <span
                      key={h}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      {h}
                    </span>
                  ))}
                  {highlightChips.length > 3 ? (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-500">
                      +{highlightChips.length - 3} more
                    </span>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        </button>

        {/* Right: mini-stats 2×2 */}
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200/80">
          <div className="border-b border-r border-slate-200/80 p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Users className="h-3.5 w-3.5 text-violet-500" /> Registrations
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
              {registered} / {capacity.toLocaleString("en-IN")}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${bookedPct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Tickets booked <span className="float-right tabular-nums">{bookedPct}%</span>
            </p>
          </div>
          <div className="border-b border-slate-200/80 p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Gift className="h-3.5 w-3.5 text-emerald-500" /> Add-ons
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{event.stats.addOns}</p>
            <p className="mt-1 text-[11px] text-slate-400">Active on this event</p>
          </div>
          <div className="border-r border-slate-200/80 p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <CalendarClock className="h-3.5 w-3.5 text-amber-500" /> Date Change Requests
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
              {dateChangeQuery.isLoading ? "…" : (dateChangeCount ?? 0)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Pending</p>
          </div>
          <div className="p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> Progress
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{bookedPct}%</p>
            <p className="mt-1 text-[11px] text-slate-400">Tickets booked</p>
          </div>
        </div>
      </div>

      {cancelError ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {cancelError}
        </p>
      ) : null}

      {/* Actions */}
      <div className="mt-5 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => goToCreateEvent("edit")}
          className="inline-flex items-center gap-2 rounded-full bg-(--brand-navy) px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-(--brand-navy)/90 active:scale-[0.98]"
        >
          <Pencil className="h-4 w-4" /> Edit Event
        </button>
        <ShareEventButton
          eventId={event.id}
          slug={event.slug}
          title={event.title}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 active:scale-[0.98]"
        />
        <button
          type="button"
          onClick={() => goToCreateEvent("reschedule")}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 active:scale-[0.98]"
        >
          <CalendarClock className="h-4 w-4" /> Reschedule
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              onClick={() => setCancelError(null)}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:border-rose-400 hover:bg-rose-50 active:scale-[0.98]"
            >
              <Trash2 className="h-4 w-4" /> Cancel Event
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel the event. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Event</AlertDialogCancel>
              <AlertDialogAction
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                {cancelMutation.isPending ? "Cancelling…" : "Cancel Event"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>,
  )
}
