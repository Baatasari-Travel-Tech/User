"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  List,
  Pencil,
  Search,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toEventFormDraft } from "@/components/event-org/manage-events/manage-events"
import { getEventCoverImageUrl } from "@/lib/event-cover"
import type { EventDetail } from "@/types/api"

type Status = "Upcoming" | "Past" | "Cancelled"
type Tab = "All Events" | Status

const PAGE_SIZES = [10, 25, 50]

// Stable chip color per category (hash into a fixed palette).
const CATEGORY_PALETTE = [
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-600",
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-red-100 text-red-600",
  "bg-emerald-100 text-emerald-700",
]
const categoryCls = (category: string) => {
  let hash = 0
  for (const ch of category) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length]
}

const statusOf = (event: EventDetail): Status => {
  if (event.cancelledAt) return "Cancelled"
  const day = new Date(event.endDate ?? event.date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  day.setHours(0, 0, 0, 0)
  return day.getTime() < today.getTime() ? "Past" : "Upcoming"
}

const STATUS_CHIP: Record<Status, string> = {
  Upcoming: "bg-emerald-100 text-emerald-700",
  Past: "bg-slate-100 text-slate-600",
  Cancelled: "bg-rose-100 text-rose-600",
}

const formatRowDate = (value: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value),
  )

const formatRowSub = (event: EventDetail) => {
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(new Date(event.date))
  const time =
    event.startTime && event.endTime
      ? `${event.startTime} – ${event.endTime}`
      : event.startTime ?? ""
  return time ? `${day}, ${time}` : day
}

const registrationsOf = (event: EventDetail) => {
  const registered = (event.ticketTiers ?? []).reduce(
    (sum, tier) => sum + Number(tier.soldCount ?? 0),
    0,
  )
  const capacity =
    (event.ticketTiers ?? []).reduce((sum, tier) => sum + Number(tier.quantity ?? 0), 0) ||
    Number(event.capacity ?? 0)
  const pct = capacity > 0 ? Math.round((registered / capacity) * 100) : 0
  return { registered, capacity, pct }
}

// ─── Calendar view ──────────────────────────────────────────────────────────

function EventsCalendar({
  events,
  onOpen,
}: {
  events: EventDetail[]
  onOpen: (event: EventDetail) => void
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(month)

  // Build the Mon-first grid of the visible month.
  const weeks = useMemo(() => {
    const first = new Date(month)
    const startOffset = (first.getDay() + 6) % 7 // Mon = 0
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const cells: (Date | null)[] = [
      ...Array.from({ length: startOffset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
    ]
    while (cells.length % 7 !== 0) cells.push(null)
    const grid: (Date | null)[][] = []
    for (let i = 0; i < cells.length; i += 7) grid.push(cells.slice(i, i + 7))
    return grid
  }, [month])

  // Events on a given day (multi-day events span their whole range).
  const eventsOn = (day: Date) =>
    events.filter((event) => {
      const start = new Date(event.date)
      const end = new Date(event.endDate ?? event.date)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return day >= start && day <= end
    })

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {monthLabel}
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <span key={d} className="pb-2">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((day, i) => {
          if (!day) return <div key={i} className="min-h-16 rounded-lg bg-slate-50/40" />
          const dayEvents = eventsOn(day)
          return (
            <div key={i} className="min-h-16 rounded-lg border border-slate-100 p-1">
              <p className="text-right text-[11px] tabular-nums text-slate-400">{day.getDate()}</p>
              <div className="mt-0.5 space-y-0.5">
                {dayEvents.slice(0, 2).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onOpen(event)}
                    title={event.title}
                    className={`block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-semibold leading-tight ${
                      statusOf(event) === "Cancelled"
                        ? "bg-rose-100 text-rose-600 line-through"
                        : statusOf(event) === "Past"
                          ? "bg-slate-100 text-slate-500"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 2 ? (
                  <p className="px-1 text-[10px] text-slate-400">+{dayEvents.length - 2} more</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Table + controls ───────────────────────────────────────────────────────

export function EventsTable({ events }: { events: EventDetail[] }) {
  const router = useRouter()
  const [view, setView] = useState<"table" | "calendar">("table")
  const [tab, setTab] = useState<Tab>("All Events")
  const [query, setQuery] = useState("")
  const [dateAsc, setDateAsc] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const categories = useMemo(
    () => [...new Set(events.map((e) => e.category ?? "Live Event"))].sort(),
    [events],
  )

  const counts = useMemo(() => {
    const byStatus = { Upcoming: 0, Past: 0, Cancelled: 0 }
    for (const event of events) byStatus[statusOf(event)] += 1
    return byStatus
  }, [events])

  const filtered = useMemo(() => {
    let list = [...events]
    if (tab !== "All Events") list = list.filter((e) => statusOf(e) === tab)
    if (categoryFilter.length > 0) {
      list = list.filter((e) => categoryFilter.includes(e.category ?? "Live Event"))
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.category ?? "").toLowerCase().includes(q) ||
          (e.venue ?? "").toLowerCase().includes(q),
      )
    }
    list.sort((a, b) => {
      const da = new Date(a.date).getTime()
      const db = new Date(b.date).getTime()
      return dateAsc ? da - db : db - da
    })
    return list
  }, [events, tab, query, dateAsc, categoryFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  const openAnalytics = (event: EventDetail) => {
    router.push(`/organizer/analytics?eventId=${encodeURIComponent(event.id)}`)
  }

  const openEdit = (event: EventDetail, clickEvent: React.MouseEvent) => {
    clickEvent.stopPropagation()
    const status = statusOf(event)
    const action = status === "Past" ? "repeat" : "edit"
    localStorage.setItem("eventFormData", JSON.stringify(toEventFormDraft(event)))
    router.push(
      `/organizer/create-event?startDirectly=true&action=${action}&eventId=${encodeURIComponent(event.id)}`,
    )
  }

  const setTabAndReset = (next: Tab) => {
    setTab(next)
    setPage(1)
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
      {/* Header + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">All Events</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search events..."
              className="w-40 rounded-full border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 sm:w-56"
            />
          </div>
          <button
            type="button"
            onClick={() => setView((v) => (v === "table" ? "calendar" : "table"))}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            {view === "table" ? (
              <>
                <CalendarDays className="h-4 w-4" /> <span className="hidden sm:inline">Calendar View</span>
              </>
            ) : (
              <>
                <List className="h-4 w-4" /> <span className="hidden sm:inline">Table View</span>
              </>
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:border-slate-400 ${
                  categoryFilter.length > 0
                    ? "border-(--brand-navy) bg-(--brand-navy)/5 text-(--brand-navy)"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">
                  Filter{categoryFilter.length > 0 ? ` (${categoryFilter.length})` : ""}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {categories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={categoryFilter.includes(category)}
                  onCheckedChange={(checked) => {
                    setCategoryFilter((prev) =>
                      checked ? [...prev, category] : prev.filter((c) => c !== category),
                    )
                    setPage(1)
                  }}
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
              {categoryFilter.length > 0 ? (
                <DropdownMenuItem onClick={() => setCategoryFilter([])} className="font-semibold">
                  Clear filter
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["All Events", events.length],
            ["Upcoming", counts.Upcoming],
            ["Past", counts.Past],
            ["Cancelled", counts.Cancelled],
          ] as [Tab, number][]
        ).map(([name, count]) => (
          <button
            key={name}
            type="button"
            onClick={() => setTabAndReset(name)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              tab === name
                ? "bg-(--brand-navy) text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            {name}
            {name !== "All Events" ? (
              <span
                className={`rounded-full px-1.5 text-[10px] font-bold ${
                  tab === name ? "bg-white/20" : "bg-slate-100"
                }`}
              >
                {count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {view === "calendar" ? (
        <EventsCalendar events={filtered} onOpen={openAnalytics} />
      ) : (
        <>
          {/* Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="pb-3 pr-4 font-bold">Event Name</th>
                  <th className="pb-3 pr-4 font-bold">
                    <button
                      type="button"
                      onClick={() => setDateAsc((v) => !v)}
                      className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-slate-600"
                    >
                      Date{" "}
                      <ChevronDown
                        className={`h-3 w-3 transition-transform ${dateAsc ? "rotate-180" : ""}`}
                      />
                    </button>
                  </th>
                  <th className="pb-3 pr-4 font-bold">Category</th>
                  <th className="hidden pb-3 pr-4 font-bold lg:table-cell">Status</th>
                  <th className="pb-3 pr-4 font-bold">Registrations</th>
                  <th className="pb-3 font-bold">Edit</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((event) => {
                  const status = statusOf(event)
                  const { registered, capacity, pct } = registrationsOf(event)
                  const category = event.category ?? "Live Event"
                  return (
                    <tr
                      key={event.id}
                      onClick={() => openAnalytics(event)}
                      className="cursor-pointer border-b border-slate-50 transition hover:bg-slate-50/60"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="relative aspect-[2/3] w-9 shrink-0 overflow-hidden rounded-md bg-slate-100">
                            <EventThumb event={event} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{event.title}</p>
                            <p className="truncate text-[11px] text-slate-400">
                              {event.slug ?? `#${event.id.slice(0, 8)}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-slate-900">{formatRowDate(event.date)}</p>
                        <p className="text-[11px] text-slate-400">{formatRowSub(event)}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${categoryCls(category)}`}>
                          {category}
                        </span>
                      </td>
                      <td className="hidden py-3 pr-4 lg:table-cell">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CHIP[status]}`}>
                          {status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="text-xs font-semibold tabular-nums text-slate-900">
                          {registered.toLocaleString("en-IN")} / {capacity.toLocaleString("en-IN")}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${status === "Past" ? "bg-emerald-500" : "bg-blue-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-[11px] tabular-nums text-slate-400">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={(e) => openEdit(event, e)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                        >
                          <Pencil className="h-3 w-3" />
                          <span className="hidden sm:inline">{status === "Past" ? "Repeat" : "Edit"}</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                      No events match your filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
            <p className="text-xs">
              {filtered.length === 0
                ? "No events"
                : `Showing ${(safePage - 1) * pageSize + 1} to ${Math.min(
                    safePage * pageSize,
                    filtered.length,
                  )} of ${filtered.length} events`}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                <ChevronLeft className="h-3 w-3" /> Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .map((p, idx, arr) => (
                  <span key={p} className="flex items-center gap-1.5">
                    {idx > 0 && arr[idx - 1] !== p - 1 ? (
                      <span className="text-xs text-slate-400">…</span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setPage(p)}
                      className={`h-8 w-8 rounded-full text-xs font-bold transition ${
                        p === safePage
                          ? "bg-(--brand-navy) text-white"
                          : "border border-slate-200 text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-400"
                >
                  Rows per page: {pageSize} <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {PAGE_SIZES.map((size) => (
                  <DropdownMenuItem
                    key={size}
                    onClick={() => {
                      setPageSize(size)
                      setPage(1)
                    }}
                  >
                    {size}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </>
      )}
    </div>
  )
}

// Cover thumbnail with graceful fallback (covers are 2:3-locked at upload).
function EventThumb({ event }: { event: EventDetail }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return <span className="flex h-full w-full items-center justify-center text-[9px] text-slate-400">—</span>
  }
  return (
    <Image
      src={getEventCoverImageUrl(event.id, event.updatedAt)}
      alt=""
      fill
      sizes="36px"
      className="object-cover"
      onError={() => setFailed(true)}
    />
  )
}
