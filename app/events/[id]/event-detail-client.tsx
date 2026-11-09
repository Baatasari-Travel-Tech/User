"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CalendarDays, CalendarPlus, Clock, Languages, MapPin, Sparkles, Users } from "lucide-react"
import { useAuth } from "@/app/providers"
import { useAuthModal } from "@/components/auth/auth-modal-context"
import { DateReviewsSection } from "@/components/events/date-reviews-section"
import { InfoAccordion } from "@/components/events/detail/info-accordion"
import { MoreEvents } from "@/components/events/detail/more-events"
import { OrganizerCard } from "@/components/events/detail/organizer-card"
import { TicketCard, MAX_TICKETS_PER_ORDER, tierLeft } from "@/components/events/detail/ticket-card"
import { VenueSection } from "@/components/events/detail/venue-section"
import { EventsFooter } from "@/components/events/events-footer"
import { ShareEventButton } from "@/components/events/share-event-button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { isEventPast } from "@/lib/event-helpers"
import { getEventCoverImageUrl } from "@/lib/event-cover"
import { apiRequest } from "@/lib/api/client"
import { formatCurrency, formatDate } from "@/lib/format"
import type { EventDetail } from "@/types/api"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

// "7:00 PM" / "19:00" → minutes since midnight (null if unparseable).
const parseTimeToMinutes = (t: string | null | undefined): number | null => {
  if (!t) return null
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!m) return null
  let h = Number(m[1])
  const min = Number(m[2])
  const meridiem = m[3]?.toUpperCase()
  if (meridiem === "PM" && h < 12) h += 12
  if (meridiem === "AM" && h === 12) h = 0
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

// The platform fee per paid ticket (the same figure the checkout page charges).
const PLATFORM_FEE_PER_TICKET = 10

const card = "rounded-3xl bg-white p-5 shadow-[0_24px_60px_-32px_rgba(12,29,55,0.4)] md:p-7"

// One fact in the strip under the banner: a gold icon tile, a label, a value.
function Fact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--gold-soft-bg) text-(--gold-icon)">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-(--gray-400)">{label}</p>
        <p className="truncate text-sm font-semibold text-(--brand-navy)">{children}</p>
      </div>
    </div>
  )
}

const STRIP_COLUMNS: Record<number, string> = { 3: "md:grid-cols-3", 4: "md:grid-cols-4" }

export default function EventDetailClient({ event }: { event: EventDetail }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { session } = useAuth()
  const { openModal } = useAuthModal()
  const isLoggedIn = Boolean(session?.user)

  const [coverImageSrc, setCoverImageSrc] = useState(getEventCoverImageUrl(event.id, event.updatedAt))
  const [aboutExpanded, setAboutExpanded] = useState(false)
  const [refundOpen, setRefundOpen] = useState(false)

  // Record a unique daily view of this event page (fire-and-forget).
  useEffect(() => {
    if (typeof window === "undefined") return
    let visitorId = localStorage.getItem("baatasari-visitor-id") || ""
    if (!visitorId) {
      visitorId = crypto.randomUUID()
      localStorage.setItem("baatasari-visitor-id", visitorId)
    }
    void apiRequest(`/events/${event.id}/view`, {
      method: "POST",
      body: JSON.stringify({ visitorId }),
    }).catch(() => undefined)
  }, [event.id])

  // ── Tickets: how many of each type. It starts with one of the first type that has seats. ──
  const tiers = useMemo(() => event.ticketTiers ?? [], [event.ticketTiers])
  const [tierQty, setTierQty] = useState<Record<string, number>>(() => {
    const first = tiers.find((t) => {
      const left = tierLeft(t)
      return left === null || left > 0
    })
    return first?.id ? { [first.id]: 1 } : {}
  })
  const totalQty = useMemo(() => Object.values(tierQty).reduce((sum, n) => sum + n, 0), [tierQty])
  const subtotal = useMemo(
    () => tiers.reduce((sum, t) => sum + (tierQty[t.id ?? ""] ?? 0) * Number(t.price ?? 0), 0),
    [tiers, tierQty],
  )
  const adjustTierQty = (tierId: string, delta: number, left: number | null) => {
    setTierQty((prev) => {
      const current = prev[tierId] ?? 0
      const total = Object.values(prev).reduce((sum, n) => sum + n, 0)
      let next = current
      if (delta > 0) {
        if (total < MAX_TICKETS_PER_ORDER && (left === null || current < left)) next = current + 1
      } else {
        next = Math.max(0, current - 1)
      }
      if (next === current) return prev
      return { ...prev, [tierId]: next }
    })
  }

  const seatsLeft = useMemo(() => {
    let sum = 0
    for (const t of tiers) {
      const left = tierLeft(t)
      if (left === null) return null
      sum += left
    }
    return tiers.length > 0 ? sum : null
  }, [tiers])
  const allSoldOut = tiers.length > 0 && seatsLeft === 0
  const minPrice = useMemo(() => (tiers.length === 0 ? null : Math.min(...tiers.map((t) => Number(t.price ?? 0)))), [tiers])
  const isFreeEvent = tiers.length > 0 && tiers.every((t) => Number(t.price) === 0)
  const platformFee = subtotal > 0 ? PLATFORM_FEE_PER_TICKET * totalQty : 0

  // ── Content derived from the event record ──
  const descriptionParas = useMemo(
    () => (event.description ?? "").split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean),
    [event.description],
  )
  const aboutLong = (event.description ?? "").length > 260 || descriptionParas.length > 1

  const artists = useMemo(() => (event.artists ?? []).filter((a) => a.name && a.name.trim()), [event.artists])
  const chiefGuest = (() => {
    const personnel = asRecord(event.requirements).personnel
    return typeof personnel === "string" && personnel.trim() ? personnel.trim() : null
  })()

  const sponsorGroups = useMemo(() => {
    const s = event.sponsors ?? {}
    const groups: [string, { name: string; website?: string | null }[]][] = [
      ["Title sponsors", (s.titleSponsors ?? []).filter((x) => x.name?.trim())],
      ["Co-partners", (s.coPartners ?? []).filter((x) => x.name?.trim())],
      ["Venue partners", (s.venuePartners ?? []).filter((x) => x.name?.trim())],
      ["Media partners", (s.mediaPartners ?? []).filter((x) => x.name?.trim())],
    ]
    return groups.filter(([, names]) => names.length > 0)
  }, [event.sponsors])

  const guidelineItems = useMemo(() => {
    const guidelines = asRecord(event.guidelines)
    const text = typeof guidelines.text === "string" ? guidelines.text.trim() : ""
    if (!text) return []
    return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  }, [event])

  const startDateLabel = formatDate(event.date)
  const endDateLabel = event.endDate ? formatDate(event.endDate) : null
  const isMultiDay = Boolean(endDateLabel && endDateLabel !== startDateLabel)
  const dateLabel = isMultiDay ? `${startDateLabel} – ${endDateLabel}` : startDateLabel
  const timeRange = `${event.startTime ?? "TBA"}${event.endTime ? ` – ${event.endTime}` : ""}`

  // "3 hrs", for a single-day event whose start and end times can be read.
  const durationLabel = useMemo(() => {
    if (isMultiDay) return null
    const start = parseTimeToMinutes(event.startTime)
    const end = parseTimeToMinutes(event.endTime)
    if (start === null || end === null || end <= start) return null
    const hours = Math.round(((end - start) / 60) * 2) / 2
    return `${hours % 1 === 0 ? hours : hours.toFixed(1)} hr${hours !== 1 ? "s" : ""}`
  }, [event.startTime, event.endTime, isMultiDay])

  const ageLabel = useMemo(() => {
    const min = event.audienceRange?.min
    const max = event.audienceRange?.max
    if (typeof min !== "number" || typeof max !== "number") return null
    if (min <= 0 && max >= 100) return "All ages"
    if (max >= 100) return `${min}+ yrs`
    return `${min}–${max} yrs`
  }, [event.audienceRange])

  const languages = (event.languages ?? []).filter(Boolean)
  const organizerName = event.organizerDisplayName ?? event.seller?.legalName ?? null
  const isCancelled = Boolean(event.cancelledAt)
  const isPast = isEventPast(event)
  const unavailable = isCancelled || isPast
  const canBook = !unavailable && !allSoldOut && tiers.length > 0

  const ticketState = isCancelled
    ? "cancelled"
    : isPast
      ? "ended"
      : tiers.length === 0
        ? "no-tickets"
        : allSoldOut
          ? "sold-out"
          : "open"

  const statusChip =
    ticketState === "cancelled"
      ? { label: "Cancelled", cls: "bg-rose-600 text-white" }
      : ticketState === "ended"
        ? { label: "Event ended", cls: "bg-slate-500 text-white" }
        : ticketState === "sold-out"
          ? { label: "Sold out", cls: "bg-rose-500/90 text-white" }
          : ticketState === "no-tickets"
            ? { label: "Tickets soon", cls: "bg-white/20 text-white" }
            : { label: "Booking open", cls: "bg-emerald-500/90 text-white" }

  const goToCheckout = () => {
    if (!canBook || totalQty === 0) return
    // The selection travels as `sel=tierId:qty,tierId:qty`: refresh and share safe.
    const sel = tiers
      .filter((t) => (tierQty[t.id ?? ""] ?? 0) > 0)
      .map((t) => `${t.id}:${tierQty[t.id ?? ""]}`)
      .join(",")
    const target = `/checkout?eventId=${event.id}${sel ? `&sel=${encodeURIComponent(sel)}` : ""}`
    if (!isLoggedIn) {
      const params = new URLSearchParams(searchParams?.toString() ?? "")
      params.set("redirect", target)
      router.replace(`${pathname}?${params.toString()}`)
      openModal("register")
      return
    }
    router.push(target)
  }

  // "View refund policy" under Book tickets: open the refund row and bring it to the middle of the screen.
  const viewRefund = () => {
    setRefundOpen(true)
    window.setTimeout(() => document.getElementById("refund")?.scrollIntoView({ behavior: "smooth", block: "center" }), 60)
  }

  // The bar at the bottom of a phone: with nothing chosen it takes you to the ticket card.
  const handleBarBook = () => {
    if (totalQty === 0) {
      document.getElementById("ticket-card")?.scrollIntoView({ behavior: "smooth", block: "center" })
      return
    }
    goToCheckout()
  }

  const calendarEvent = {
    title: event.title,
    description: event.tagline ?? event.description,
    venue: [event.venue, event.locationCity].filter(Boolean).join(", "),
    date: event.date,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    url: `https://baatasari.com/events/${event.slug ?? event.id}`,
  }

  const chips = [...new Set([event.category ?? "", ageLabel ?? ""].map((t) => t.trim()).filter(Boolean))]

  const facts: Array<{ icon: ReactNode; label: string; value: string }> = [
    { icon: <CalendarDays className="h-5 w-5" aria-hidden />, label: "Date", value: dateLabel },
    {
      icon: <Clock className="h-5 w-5" aria-hidden />,
      label: "Time",
      value: durationLabel ? `${event.startTime ?? "TBA"} · ${durationLabel}` : timeRange,
    },
    { icon: <Users className="h-5 w-5" aria-hidden />, label: "Age", value: ageLabel ?? "All ages" },
  ]
  if (languages.length > 0) {
    facts.push({ icon: <Languages className="h-5 w-5" aria-hidden />, label: "Language", value: languages.join(" · ") })
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      {/* ════ BANNER — the event's own artwork sets the colour ════ */}
      <header className="relative isolate overflow-hidden bg-(--brand-navy)">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <Image
            src={coverImageSrc}
            alt=""
            aria-hidden
            fill
            sizes="1px"
            className="scale-125 object-cover opacity-40 blur-3xl saturate-[1.2]"
            onError={() => setCoverImageSrc("/an2.webp")}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-(--brand-navy)/75 via-(--brand-navy)/60 to-(--brand-navy)/90" />
        </div>

        <div className="mx-auto w-full max-w-[1400px] px-4 pb-8 pt-5 md:px-6 md:pb-12 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/85 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              All events
            </Link>
            <ShareEventButton
              eventId={event.id}
              slug={event.slug}
              title={event.title}
              iconOnly
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-(--brand-navy) shadow-sm transition hover:bg-white/90 active:scale-95"
            />
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-[300px_minmax(0,1fr)] md:items-center md:gap-9">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-white/10 shadow-xl md:aspect-[10/7]">
              <Image
                src={coverImageSrc}
                alt={event.title}
                fill
                priority
                sizes="(min-width: 768px) 300px, 100vw"
                className="object-cover"
                onError={() => setCoverImageSrc("/an2.webp")}
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusChip.cls}`}>
                  {ticketState === "open" ? <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden /> : null}
                  {statusChip.label}
                </span>
                {chips.map((tag) => (
                  <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-(--brand-navy)">
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="mt-4 font-bricolage text-[2rem] font-bold leading-[1.1] tracking-tight text-white [text-wrap:balance] md:text-5xl">
                {event.title}
              </h1>
              {event.tagline ? <p className="mt-2 max-w-xl text-base text-white/70">{event.tagline}</p> : null}

              <div className="mt-4 flex flex-col gap-2 text-sm text-white/85 md:flex-row md:flex-wrap md:items-center md:gap-x-7 md:gap-y-2">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-(--gold)" aria-hidden />
                  {dateLabel}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 text-(--gold)" aria-hidden />
                  {timeRange}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-(--gold)" aria-hidden />
                  {event.venue ?? "TBA"}
                </span>
              </div>
              {organizerName ? <p className="mt-3 text-sm text-white/65">Hosted by {organizerName}</p> : null}
            </div>
          </div>
        </div>
      </header>

      {/* ════ BODY ════ */}
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-28 pt-6 md:px-6 md:pt-8 lg:px-10 lg:pb-16">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-8 lg:gap-y-6">
          {/* Facts */}
          <section
            className={`grid grid-cols-2 gap-x-4 gap-y-5 rounded-3xl bg-white p-5 shadow-[0_24px_60px_-32px_rgba(12,29,55,0.4)] md:gap-4 md:px-7 md:py-5 lg:col-start-1 ${
              STRIP_COLUMNS[facts.length] ?? "md:grid-cols-4"
            }`}
          >
            {facts.map((f) => (
              <Fact key={f.label} icon={f.icon} label={f.label}>
                {f.value}
              </Fact>
            ))}
          </section>

          {/* Tickets: right-hand column on a wide screen, after the facts on a phone */}
          <div className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-8 lg:row-start-1 lg:self-start">
            <TicketCard
              tiers={tiers}
              qty={tierQty}
              onAdjust={adjustTierQty}
              totalQty={totalQty}
              subtotal={subtotal}
              platformFee={platformFee}
              seatsLeft={seatsLeft}
              isFree={isFreeEvent}
              refundable={event.refundable}
              state={ticketState}
              onBook={goToCheckout}
              onViewRefund={viewRefund}
              isLoggedIn={isLoggedIn}
              calendarEvent={calendarEvent}
            />
          </div>

          {/* About */}
          {descriptionParas.length > 0 ? (
            <section className={`${card} lg:col-start-1`}>
              <h2 className="text-xl font-semibold text-(--brand-navy)">About this event</h2>
              {aboutLong && !aboutExpanded ? (
                <p className="mt-3 line-clamp-4 leading-relaxed text-(--gray-600)">{descriptionParas.join(" ")}</p>
              ) : (
                <div className="mt-3 space-y-3 leading-relaxed text-(--gray-600)">
                  {descriptionParas.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              )}
              {aboutLong ? (
                <button
                  type="button"
                  onClick={() => setAboutExpanded((v) => !v)}
                  className="mt-3 text-sm font-semibold text-(--brand-navy) underline-offset-2 hover:underline"
                >
                  {aboutExpanded ? "Read less" : "Read more"}
                </button>
              ) : null}
            </section>
          ) : null}

          {/* Artists */}
          {artists.length > 0 ? (
            <section className={`${card} lg:col-start-1`}>
              <h2 className="text-xl font-semibold text-(--brand-navy)">Artists</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {artists.map((artist) => {
                  const inner = (
                    <>
                      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-(--gold-soft-bg) text-sm font-bold text-(--gold-text)">
                        {artist.photoUrl ? (
                          <Image src={artist.photoUrl} alt="" fill sizes="48px" unoptimized className="object-cover" />
                        ) : (
                          artist.name.trim().charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold text-(--brand-navy)">{artist.name}</span>
                        {artist.role || artist.genre ? (
                          <span className="block truncate text-sm text-(--gray-500)">{artist.role ?? artist.genre}</span>
                        ) : null}
                      </span>
                    </>
                  )
                  // A performer picked from Baatasari talent shows their photo and name only:
                  // talent profiles are private to the performer and to organizers.
                  return (
                    <li key={`${artist.name}-${artist.talentSlug ?? ""}`}>
                      <div className="flex items-center gap-3 p-1">{inner}</div>
                    </li>
                  )
                })}
              </ul>
              {chiefGuest ? (
                <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-(--gold-soft-bg) px-4 py-2 text-sm font-semibold text-(--gold-text)">
                  <Sparkles className="h-4 w-4 text-(--gold-icon)" aria-hidden />
                  {chiefGuest}
                </p>
              ) : null}
            </section>
          ) : null}

          {/* Sponsors */}
          {sponsorGroups.length > 0 ? (
            <section className={`${card} lg:col-start-1`}>
              <h2 className="text-xl font-semibold text-(--brand-navy)">Made possible by</h2>
              <div className="mt-4 space-y-3">
                {sponsorGroups.map(([label, names]) => (
                  <div key={label} className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                    <span className="w-32 shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {label}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {names.map((sponsor) =>
                        sponsor.website ? (
                          <a
                            key={sponsor.name}
                            href={sponsor.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-(--gray-200) bg-(--gray-50) px-4 py-1.5 text-sm font-semibold text-(--brand-navy) transition hover:border-(--gold)"
                          >
                            {sponsor.name}
                          </a>
                        ) : (
                          <span
                            key={sponsor.name}
                            className="rounded-full border border-(--gray-200) bg-(--gray-50) px-4 py-1.5 text-sm font-semibold text-(--brand-navy)"
                          >
                            {sponsor.name}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className="lg:col-start-1">
            <VenueSection event={event} />
          </div>
          <div className="lg:col-start-1">
            <OrganizerCard event={event} />
          </div>
          <div className="lg:col-start-1">
            <InfoAccordion event={event} guidelines={guidelineItems} refundOpen={refundOpen} onRefundOpenChange={setRefundOpen} />
          </div>

          {/* Flexible dates */}
          <section className={`${card} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between lg:col-start-1`}>
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--gold-soft-bg) text-(--gold-icon)">
                <CalendarPlus className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-(--brand-navy)">Can&rsquo;t make it on this date?</p>
                <p className="text-sm text-(--gray-500)">
                  Request a date that works for you: the organizer gets notified and you will hear back.
                </p>
              </div>
            </div>
            {isLoggedIn ? (
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="shrink-0 rounded-full border border-(--gray-300) bg-white px-5 py-2.5 text-sm font-semibold text-(--brand-navy) transition hover:border-(--brand-navy)"
                  >
                    Request a date
                  </button>
                </DialogTrigger>
                <DialogContent className="flex max-h-[85vh] w-[95vw] max-w-5xl flex-col items-center justify-center overflow-hidden rounded-3xl border-0 bg-(--white) p-0">
                  <VisuallyHidden>
                    <DialogTitle>Select Date and View Reviews</DialogTitle>
                  </VisuallyHidden>
                  <div className="h-full w-full overflow-auto p-4 md:p-8">
                    <DateReviewsSection eventId={event.id} />
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <button
                type="button"
                onClick={() => openModal("register")}
                className="shrink-0 rounded-full border border-(--gray-300) bg-white px-5 py-2.5 text-sm font-semibold text-(--brand-navy) transition hover:border-(--brand-navy)"
              >
                Register to request
              </button>
            )}
          </section>
        </div>

        <MoreEvents event={event} />
      </div>

      <EventsFooter />

      {/* A phone: the price and the button stay at the bottom of the screen */}
      {canBook ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-(--gray-200) bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-lg font-bold tabular-nums text-(--brand-navy)">
                {totalQty > 0
                  ? subtotal === 0
                    ? "Free"
                    : formatCurrency(subtotal)
                  : isFreeEvent
                    ? "Free entry"
                    : `From ${formatCurrency(minPrice ?? 0)}`}
              </p>
              <p className="truncate text-xs text-(--gray-500)">
                {totalQty > 0
                  ? `${totalQty} ticket${totalQty === 1 ? "" : "s"}`
                  : `${startDateLabel} · ${event.startTime ?? "TBA"}`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleBarBook}
              className="h-12 shrink-0 rounded-full bg-(--brand-navy) px-8 text-[15px] font-semibold text-white shadow-[0_14px_30px_-14px_rgba(12,29,55,0.6)] transition hover:bg-(--brand-navy)/90 active:scale-[0.98]"
            >
              {totalQty > 0 ? (isLoggedIn ? "Book tickets" : "Register to book") : "Select tickets"}
            </button>
          </div>
        </div>
      ) : null}

    </div>
  )
}
