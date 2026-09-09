"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bus,
  CalendarDays,
  CalendarPlus,
  CalendarX2,
  Car,
  Clock,
  DoorOpen,
  MapPin,
  Music,
  Navigation,
  Phone,
  Repeat,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react"
import { useAuth } from "@/app/providers"
import { useAuthModal } from "@/components/auth/auth-modal-context"
import { ShareEventButton } from "@/components/event-org/share-event-button"
import { isEventPast } from "@/lib/event-helpers"
import { getEventCoverImageUrl } from "@/lib/event-cover"
import { apiRequest } from "@/lib/api/client"
import { formatCurrency, formatDate } from "@/lib/format"
import type { EventDetail } from "@/types/api"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DateReviewsSection } from "@/components/events/date-reviews-section"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

// "publicTransport" / "ample_parking" → "Public Transport" / "Ample Parking"
const humanize = (key: string): string =>
  key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())

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

// 1234 → "1.2k"
const formatCount = (n: number): string => {
  if (n >= 1000) {
    const k = n / 1000
    return `${k.toFixed(k >= 10 ? 0 : 1).replace(/\.0$/, "")}k`
  }
  return String(n)
}

// Max tickets per booking — mirrors the server-side per-identity cap (A9).
const MAX_TICKETS_PER_ORDER = 10

// Subtle film grain for the immersive header (breaks digital flatness).
const NOISE_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E\")"

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
}

// Section heading: gold kicker + display title — the page's rhythm device.
function SectionHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <>
      <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-(--gold-text)">{kicker}</p>
      <h2 className="mt-1.5 font-bricolage text-2xl font-bold tracking-tight text-(--brand-navy)">{title}</h2>
    </>
  )
}

// One row of the ticket card: gold icon tile + label + value.
function TicketRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--gold-soft-bg) text-(--gold-icon)">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--gray-400)">{label}</p>
        <p className="truncate text-sm font-semibold text-(--brand-navy)">{children}</p>
      </div>
    </div>
  )
}

export default function EventDetailClient({ event }: { event: EventDetail }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { session } = useAuth()
  const { openModal } = useAuthModal()
  const reduce = useReducedMotion()
  const isLoggedIn = Boolean(session?.user)

  const [coverImageSrc, setCoverImageSrc] = useState(getEventCoverImageUrl(event.id, event.updatedAt))
  const [aboutExpanded, setAboutExpanded] = useState(false)
  const [showTiers, setShowTiers] = useState(false)

  // J1 — record a unique daily view of this event page (fire-and-forget).
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

  // ── Tickets: per-tier quantities (multi-tier cart) ──
  const tiers = useMemo(() => event.ticketTiers ?? [], [event.ticketTiers])
  const [tierQty, setTierQty] = useState<Record<string, number>>({})
  const totalQty = useMemo(
    () => Object.values(tierQty).reduce((sum, n) => sum + n, 0),
    [tierQty],
  )
  const totalPrice = useMemo(
    () =>
      tiers.reduce(
        (sum, t) => sum + (tierQty[t.id ?? ""] ?? 0) * Number(t.price ?? 0),
        0,
      ),
    [tiers, tierQty],
  )
  // Seats left on a tier, when the API exposes soldCount (undefined ⇒ unknown).
  const tierLeft = (tier: (typeof tiers)[number]): number | null => {
    if (typeof tier.soldCount !== "number" || typeof tier.quantity !== "number") return null
    return Math.max(0, tier.quantity - tier.soldCount)
  }
  const adjustTierQty = (tierId: string, delta: number, left: number | null) => {
    setTierQty((prev) => {
      const current = prev[tierId] ?? 0
      const total = Object.values(prev).reduce((sum, n) => sum + n, 0)
      let next = current
      if (delta > 0) {
        const underOrderCap = total < MAX_TICKETS_PER_ORDER
        const underTierCap = left === null || current < left
        if (underOrderCap && underTierCap) next = current + 1
      } else {
        next = Math.max(0, current - 1)
      }
      if (next === current) return prev
      return { ...prev, [tierId]: next }
    })
  }

  const isFreeEvent = tiers.length > 0 && tiers.every((t) => Number(t.price) === 0)
  const minPrice = useMemo(() => {
    if (tiers.length === 0) return null
    return Math.min(...tiers.map((t) => Number(t.price ?? 0)))
  }, [tiers])
  const allSoldOut =
    tiers.length > 0 &&
    tiers.every((t) => {
      const left = tierLeft(t)
      return left !== null && left <= 0
    })
  const priceDisplay = isFreeEvent ? "Free" : minPrice !== null ? formatCurrency(minPrice) : "—"

  // ── Content derived from the event record ──
  const descriptionParas = useMemo(
    () => (event.description ?? "").split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean),
    [event.description],
  )
  const aboutLong = (event.description ?? "").length > 260 || descriptionParas.length > 1

  const artists = useMemo(
    () => (event.artists ?? []).filter((a) => a.name && a.name.trim()),
    [event.artists],
  )

  // Unique artist genres — "Folk, Indie, Rock".
  const genres = useMemo(() => {
    const list = artists.map((a) => (a.genre ?? "").trim()).filter(Boolean)
    return [...new Set(list)].slice(0, 4)
  }, [artists])

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

  const transportItems = useMemo(() => {
    const opts = (event.transportOptions ?? {}) as Record<string, unknown>
    return Object.entries(opts)
      .filter(([, v]) => v === true)
      .map(([k]) => humanize(k))
  }, [event.transportOptions])

  const startDateLabel = formatDate(event.date)
  const endDateLabel = event.endDate ? formatDate(event.endDate) : null
  const isMultiDay = Boolean(endDateLabel && endDateLabel !== startDateLabel)
  const dateLabel = isMultiDay ? `${startDateLabel} – ${endDateLabel}` : startDateLabel
  const timeLabel = `${event.startTime ?? "TBA"}${event.endTime ? ` – ${event.endTime}` : ""}`

  // Duration derived from start–end time; only for single-day events with
  // parseable times (a date range already tells the multi-day story).
  const durationLabel = useMemo(() => {
    if (isMultiDay) return null
    const start = parseTimeToMinutes(event.startTime)
    const end = parseTimeToMinutes(event.endTime)
    if (start === null || end === null || end <= start) return null
    const hours = (end - start) / 60
    const rounded = Math.round(hours * 2) / 2
    return `${rounded % 1 === 0 ? rounded : rounded.toFixed(1)} hour${rounded !== 1 ? "s" : ""}`
  }, [event.startTime, event.endTime, isMultiDay])

  // Age group from the organizer's audienceRange ("Age Limit" row).
  const ageLabel = useMemo(() => {
    const min = event.audienceRange?.min
    const max = event.audienceRange?.max
    if (typeof min !== "number" || typeof max !== "number") return null
    if (min <= 0 && max >= 100) return "All ages"
    if (max >= 100) return `${min}+ yrs`
    return `${min}–${max} yrs`
  }, [event.audienceRange])

  const contact = (event.contactInfo ?? {}) as {
    mobile?: string
    email?: string
    website?: string
    additionalLinks?: string
  }
  const organizerName = event.organizerDisplayName ?? null
  const mapsUrl = event.googleMapsUrl
  const goingCount = typeof event.bookedCount === "number" ? event.bookedCount : 0

  const isCancelled = Boolean(event.cancelledAt)
  const isPast = isEventPast(event)
  const unavailable = isCancelled || isPast

  const goToCheckout = () => {
    if (unavailable) return
    if (tiers.length > 0 && totalQty === 0) return
    // Selection travels as `sel=tierId:qty,tierId:qty` — refresh/share-safe.
    const sel = tiers
      .filter((t) => (tierQty[t.id ?? ""] ?? 0) > 0)
      .map((t) => `${t.id}:${tierQty[t.id ?? ""]}`)
      .join(",")
    const selParam = sel ? `&sel=${encodeURIComponent(sel)}` : ""
    const target = `/checkout?eventId=${event.id}${selParam}`
    if (!isLoggedIn) {
      const params = new URLSearchParams(searchParams?.toString() ?? "")
      params.set("redirect", target)
      router.replace(`${pathname}?${params.toString()}`)
      openModal("login")
      return
    }
    router.push(target)
  }

  const scrollToBooking = () =>
    document.getElementById("booking-panel")?.scrollIntoView({ behavior: "smooth", block: "center" })

  // Ticket CTA: logged out → login modal (returning here after auth); logged in → reveal the tier picker.
  const handleBookCta = () => {
    if (unavailable || allSoldOut || tiers.length === 0) return
    if (!isLoggedIn) {
      const params = new URLSearchParams(searchParams?.toString() ?? "")
      params.set("redirect", pathname)
      router.replace(`${pathname}?${params.toString()}`)
      openModal("login")
      return
    }
    setShowTiers(true)
    requestAnimationFrame(scrollToBooking)
  }

  const bookCtaLabel = isLoggedIn ? "Book tickets" : "Login to book"
  const canBook = !unavailable && !allSoldOut && tiers.length > 0

  // Header chips: category + artist genres.
  const tagChips = useMemo(
    () => [...new Set([event.category ?? "", ...genres].map((t) => t.trim()).filter(Boolean))].slice(0, 4),
    [event.category, genres],
  )

  return (
    <div className="min-h-screen overflow-x-clip bg-background pb-32 lg:pb-20">
      {/* ════ IMMERSIVE HEADER — each event's own artwork sets the atmosphere ════ */}
      <header className="relative isolate overflow-hidden bg-(--brand-navy)">
        {/* Ambient artwork wash */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <Image
            src={coverImageSrc}
            alt=""
            aria-hidden
            fill
            sizes="1px"
            className="scale-125 object-cover opacity-50 blur-3xl saturate-[1.2]"
            onError={() => setCoverImageSrc("/an2.webp")}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-(--brand-navy)/70 via-(--brand-navy)/55 to-(--brand-navy)/85" />
          {/* Film grain */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
            style={{ backgroundImage: NOISE_TEXTURE }}
          />
        </div>

        <div className="mx-auto w-full max-w-[1400px] px-4 pb-36 pt-6 sm:px-6 md:pb-44 lg:px-10 lg:pb-16 lg:pt-8">
          {/* Top row: back link + share */}
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/events"
              className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white/85 backdrop-blur-md transition hover:bg-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              All events
            </Link>
            <ShareEventButton
              eventId={event.id}
              slug={event.slug}
              title={event.title}
              iconOnly
              className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/85 backdrop-blur-md transition hover:bg-white/20 hover:text-white active:scale-95 lg:flex"
            />
          </div>

          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center lg:gap-16">
            <div>
          {/* Kicker chips + status */}
          <motion.div
            variants={reduce ? undefined : rise}
            initial="hidden"
            animate="show"
            className="mt-10 flex flex-wrap items-center gap-2 md:mt-14 lg:mt-10"
          >
            {isCancelled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                Cancelled
              </span>
            ) : isPast ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                Event ended
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                Booking open
              </span>
            )}
            {tagChips.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/80 backdrop-blur-md"
              >
                {tag}
              </span>
            ))}
          </motion.div>

          {/* Title — share sits beside it on mobile */}
          <div className="mt-4 flex items-start justify-between gap-3">
            <motion.h1
              variants={reduce ? undefined : rise}
              initial="hidden"
              animate="show"
              className="max-w-4xl font-bricolage text-[clamp(1.6rem,5vw,4rem)] font-bold leading-[1.08] tracking-tight text-white [text-wrap:balance]"
            >
              {event.title}
            </motion.h1>
            <ShareEventButton
              eventId={event.id}
              slug={event.slug}
              title={event.title}
              iconOnly
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/85 backdrop-blur-md transition hover:bg-white/20 hover:text-white active:scale-95 lg:hidden"
            />
          </div>
          {event.tagline ? (
            <motion.p
              variants={reduce ? undefined : rise}
              initial="hidden"
              animate="show"
              className="mt-4 max-w-xl text-base leading-relaxed text-white/70 md:text-lg"
            >
              {event.tagline}
            </motion.p>
          ) : null}

          {/* Meta row — desktop only; on mobile these details live in the ticket card */}
          <motion.div
            variants={reduce ? undefined : rise}
            initial="hidden"
            animate="show"
            className="mt-7 hidden flex-wrap items-center gap-x-7 gap-y-3 text-sm text-white/80 lg:flex"
          >
            <span className="inline-flex items-center gap-2 font-semibold text-white">
              <CalendarDays className="h-4 w-4 text-(--gold)" />
              {dateLabel}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock className="h-4 w-4 text-(--gold)" />
              {timeLabel}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-(--gold)" />
              {event.venue ?? "TBA"}
            </span>
            {goingCount > 0 ? (
              <span className="inline-flex items-center gap-2 font-semibold text-white">
                <Users className="h-4 w-4 text-(--gold)" />
                {formatCount(goingCount)} going
              </span>
            ) : null}
          </motion.div>
            </div>

            {/* Poster — desktop: framed object beside the title */}
            <motion.div
              variants={reduce ? undefined : rise}
              initial="hidden"
              animate="show"
              className="hidden lg:block"
            >
              <div className="relative ml-auto aspect-[2/3] w-full max-w-[300px] rotate-[1.5deg] overflow-hidden rounded-[1.25rem] bg-(--brand-navy) shadow-[0_45px_90px_-35px_rgba(4,12,28,0.8)] transition-transform duration-500 hover:rotate-0">
                <Image
                  src={coverImageSrc}
                  alt={`${event.title} poster`}
                  fill
                  priority
                  sizes="300px"
                  className={`object-cover ${unavailable ? "grayscale-[0.4]" : ""}`}
                  onError={() => setCoverImageSrc("/an2.webp")}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* ════ OVERLAP ZONE — artwork + ticket rise out of the header ════ */}
      <div className="relative z-10 mx-auto -mt-28 grid w-full max-w-[1400px] grid-cols-1 gap-8 px-4 sm:px-6 md:-mt-32 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_408px] lg:gap-12 lg:px-10">
        {/* Artwork — mobile/tablet only; on desktop the poster lives in the header */}
        <motion.div
          variants={reduce ? undefined : rise}
          initial="hidden"
          animate="show"
          className="min-w-0 lg:hidden"
        >
          <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-(--brand-navy) shadow-[0_35px_70px_-30px_rgba(4,12,28,0.6)] sm:h-60">
            <Image
              src={coverImageSrc}
              alt={`${event.title} poster`}
              fill
              priority
              sizes="100vw"
              className={`object-cover object-[center_30%] ${unavailable ? "grayscale-[0.4]" : ""}`}
              onError={() => setCoverImageSrc("/an2.webp")}
            />
          </div>
        </motion.div>

        {/* ── The ticket ── */}
        <div className="min-w-0 lg:col-start-2 lg:row-start-1">
          <div className="lg:sticky lg:top-24">
            <motion.div
              variants={reduce ? undefined : rise}
              initial="hidden"
              animate="show"
              className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_45px_90px_-35px_rgba(4,12,28,0.65)]"
            >
              {/* Stub header: price — warm cream so the card separates from the navy hero */}
              <div className="border-b border-(--gold-bar-border) bg-(--gold-bar-bg) px-6 py-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-(--gold-text)">
                      {isFreeEvent ? "Entry" : "Tickets from"}
                    </p>
                    <p className="font-bricolage text-3xl font-bold tabular-nums text-(--brand-navy)">
                      {priceDisplay}
                    </p>
                  </div>
                  {unavailable ? null : allSoldOut ? (
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-600">
                      Sold out
                    </span>
                  ) : tiers.length > 0 ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-600" />
                      </span>
                      Available
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Event facts */}
              <div className="space-y-4 px-6 py-5">
                <TicketRow icon={<CalendarDays className="h-4.5 w-4.5" />} label="Date">
                  {dateLabel}
                </TicketRow>
                <TicketRow icon={<Clock className="h-4.5 w-4.5" />} label="Time">
                  {timeLabel}
                  {durationLabel ? <span className="font-medium text-(--gray-500)"> · {durationLabel}</span> : null}
                </TicketRow>
                {genres.length > 0 ? (
                  <TicketRow icon={<Music className="h-4.5 w-4.5" />} label="Genre">
                    {genres.join(", ")}
                  </TicketRow>
                ) : null}
                {ageLabel ? (
                  <TicketRow icon={<Users className="h-4.5 w-4.5" />} label="Age group">
                    {ageLabel}
                  </TicketRow>
                ) : null}
                <TicketRow icon={<MapPin className="h-4.5 w-4.5" />} label="Venue">
                  {event.venue ?? "TBA"}
                  {mapsUrl ? (
                    <>
                      {" "}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex translate-y-[2px] text-(--brand-blue) transition hover:text-(--brand-navy)"
                        aria-label="Get directions"
                      >
                        <Navigation className="h-4 w-4" />
                      </a>
                    </>
                  ) : null}
                </TicketRow>
              </div>

              {/* Perforation */}
              <div className="relative" aria-hidden>
                <div className="mx-6 border-t-2 border-dashed border-(--gray-200)" />
                <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background" />
                <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-background" />
              </div>

              {/* Stub: CTA / state */}
              <div className="px-6 pb-6 pt-5">
                {unavailable ? (
                  <div className="flex items-center gap-3">
                    <CalendarX2 className={`h-6 w-6 shrink-0 ${isCancelled ? "text-rose-600" : "text-slate-500"}`} />
                    <div>
                      <p className={`font-poppins text-sm font-bold ${isCancelled ? "text-rose-700" : "text-slate-600"}`}>
                        {isCancelled ? "Event cancelled" : "Event ended"}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {isCancelled
                          ? "If you booked, you'll be refunded — minus the gateway and platform fees."
                          : "Tickets are no longer available."}
                      </p>
                    </div>
                  </div>
                ) : tiers.length === 0 ? (
                  <p className="text-sm text-(--gray-500)">Tickets for this event aren&rsquo;t on sale yet.</p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={handleBookCta}
                      disabled={!canBook}
                      className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-(--brand-navy) px-6 py-4 font-poppins text-base font-bold text-white shadow-[0_18px_40px_-15px_rgba(12,29,55,0.6)] transition hover:bg-(--brand-navy)/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gold) active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      <Ticket className="relative h-5 w-5" />
                      <span className="relative">{bookCtaLabel}</span>
                    </button>
                    <p className="mt-3 text-center text-[11px] text-(--gray-400)">
                      Secure checkout · instant QR tickets · refunded if cancelled (minus fees)
                    </p>
                  </>
                )}
              </div>
            </motion.div>

            {/* Tier picker — revealed by the CTA once logged in */}
            {canBook && isLoggedIn && showTiers ? (
              <motion.div
                variants={reduce ? undefined : rise}
                initial="hidden"
                animate="show"
                id="booking-panel"
                className="mt-4 scroll-mt-24 overflow-hidden rounded-[1.75rem] bg-white shadow-[0_30px_70px_-30px_rgba(4,12,28,0.5)]"
              >
                <div className="flex items-center justify-between border-b border-(--gray-100) px-6 py-4">
                  <p className="font-poppins text-sm font-bold text-(--brand-navy)">Select tickets</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-(--gold-soft-bg) px-2.5 py-1 text-[11px] font-semibold text-(--gold-text)">
                    <Ticket className="h-3.5 w-3.5" />
                    {tiers.length} type{tiers.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="px-3 py-2">
                  {tiers.map((tier) => {
                    const id = tier.id ?? ""
                    const n = tierQty[id] ?? 0
                    const selected = n > 0
                    const left = tierLeft(tier)
                    const soldOut = left !== null && left <= 0
                    const price = Number(tier.price ?? 0)
                    return (
                      <div
                        key={id || tier.name}
                        className={`relative flex items-center justify-between gap-3 rounded-2xl px-3 py-4 transition ${
                          selected ? "bg-(--gold-soft-bg)/60" : ""
                        } ${soldOut ? "opacity-55" : ""} [&:not(:last-child)]:border-b [&:not(:last-child)]:border-slate-100`}
                      >
                        {selected ? (
                          <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-(--gold)" />
                        ) : null}
                        <div className="min-w-0 pl-2">
                          <p className="font-semibold text-(--brand-navy)">{tier.name}</p>
                          {tier.description ? (
                            <p className="truncate text-xs text-slate-500">{tier.description}</p>
                          ) : null}
                          <p className="mt-1 text-sm font-bold tabular-nums text-(--brand-navy)">
                            {price === 0 ? "Free" : formatCurrency(price)}
                            {soldOut ? (
                              <span className="ml-2 text-[11px] font-semibold uppercase text-rose-500">Sold out</span>
                            ) : left !== null && left <= 10 ? (
                              <span className="ml-2 text-[11px] font-semibold text-rose-500">only {left} left</span>
                            ) : null}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => adjustTierQty(id, -1, left)}
                            disabled={n === 0}
                            aria-label={`Remove one ${tier.name} ticket`}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold text-(--brand-navy) transition hover:border-(--brand-navy) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gold) active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            −
                          </button>
                          <span className="w-5 text-center font-bold tabular-nums text-(--brand-navy)" aria-live="polite">
                            {n}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustTierQty(id, 1, left)}
                            disabled={soldOut || totalQty >= MAX_TICKETS_PER_ORDER || (left !== null && n >= left)}
                            aria-label={`Add one ${tier.name} ticket`}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold text-(--brand-navy) transition hover:border-(--brand-navy) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gold) active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Summary + checkout */}
                <div className="border-t border-slate-100 px-6 pb-6 pt-4">
                  {totalQty > 0 ? (
                    <div className="mb-4 space-y-1.5 text-sm">
                      {tiers
                        .filter((t) => (tierQty[t.id ?? ""] ?? 0) > 0)
                        .map((t) => (
                          <div key={t.id ?? t.name} className="flex justify-between text-slate-600">
                            <span>
                              {t.name} × {tierQty[t.id ?? ""]}
                            </span>
                            <span className="font-medium tabular-nums">
                              {Number(t.price ?? 0) === 0
                                ? "Free"
                                : formatCurrency(Number(t.price ?? 0) * (tierQty[t.id ?? ""] ?? 0))}
                            </span>
                          </div>
                        ))}
                      <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 font-bold text-(--brand-navy)">
                        <span>Total</span>
                        <span className="tabular-nums">{totalPrice === 0 ? "Free" : formatCurrency(totalPrice)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="mb-4 text-center text-xs text-slate-400">
                      Pick your tickets — up to {MAX_TICKETS_PER_ORDER} per booking
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={goToCheckout}
                    disabled={totalQty === 0}
                    className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-(--brand-navy) px-6 py-4 font-poppins text-base font-bold text-white shadow-[0_18px_40px_-15px_rgba(12,29,55,0.6)] transition hover:bg-(--brand-navy)/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gold) active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Ticket className="h-5 w-5" />
                    {totalQty === 0 ? "Select tickets" : `Book ${totalQty} ticket${totalQty > 1 ? "s" : ""}`}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </motion.div>
            ) : null}
          </div>
        </div>

        {/* ════ STORY — content flows under the artwork ════ */}
        <div className="min-w-0 space-y-6 pt-2 lg:col-start-1 lg:row-start-1 lg:pt-0">
          {/* About */}
          {descriptionParas.length > 0 ? (
            <motion.section
              variants={reduce ? undefined : rise}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="rounded-3xl bg-white p-6 shadow-[0_24px_60px_-32px_rgba(12,29,55,0.4)] sm:p-8"
            >
              <SectionHead kicker="About" title="What's happening" />
              {(aboutExpanded ? descriptionParas : descriptionParas.slice(0, 1)).map((para, i) => (
                <p key={i} className={`mt-4 max-w-[65ch] leading-relaxed text-slate-600 ${aboutExpanded ? "" : "line-clamp-4"}`}>
                  {para}
                </p>
              ))}
              {aboutLong ? (
                <button
                  type="button"
                  onClick={() => setAboutExpanded((v) => !v)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-(--gray-200) bg-white px-4 py-2 text-sm font-semibold text-(--brand-navy) transition hover:border-(--brand-navy) hover:bg-(--gray-50) active:scale-[0.98]"
                >
                  {aboutExpanded ? "Read less" : "Read more"}
                  <ArrowRight
                    className={`h-3.5 w-3.5 transition-transform ${aboutExpanded ? "-rotate-90" : "rotate-90"}`}
                  />
                </button>
              ) : null}
            </motion.section>
          ) : null}

          {/* Lineup */}
          {artists.length > 0 ? (
            <motion.section
              variants={reduce ? undefined : rise}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="rounded-3xl bg-white p-6 shadow-[0_24px_60px_-32px_rgba(12,29,55,0.4)] sm:p-8"
            >
              <SectionHead kicker="Lineup" title="On stage" />
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {artists.map((artist) => (
                  <div
                    key={artist.name}
                    className="rounded-2xl border border-(--gray-100) bg-(--gray-50) p-4 transition duration-300 hover:-translate-y-1 hover:border-(--gold-soft-border) hover:bg-(--gold-soft-bg)/40 hover:shadow-[0_20px_45px_-24px_rgba(12,29,55,0.4)]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-(--brand-navy) font-bricolage text-lg font-bold text-(--gold)">
                      {artist.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="mt-3 text-sm font-bold leading-snug text-(--brand-navy)">{artist.name}</p>
                    {artist.genre ? (
                      <p className="mt-0.5 text-xs font-medium text-slate-500">{artist.genre}</p>
                    ) : null}
                  </div>
                ))}
              </div>
              {chiefGuest ? (
                <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-(--gold-soft-border) bg-(--gold-soft-bg) px-4 py-2 text-sm font-semibold text-(--gold-text)">
                  <Sparkles className="h-4 w-4 text-(--gold-icon)" />
                  {chiefGuest}
                </p>
              ) : null}
            </motion.section>
          ) : null}

          {/* Flexible dates */}
          <motion.section
            variants={reduce ? undefined : rise}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="relative overflow-hidden rounded-3xl bg-(--brand-navy) p-6 sm:p-8"
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
              style={{ backgroundImage: NOISE_TEXTURE }}
            />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-(--gold)">Flexible dates</p>
              <h2 className="mt-1.5 font-bricolage text-2xl font-bold tracking-tight text-white">
                Can&rsquo;t make it on this date?
              </h2>

              <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-(--gold)">
                    <CalendarPlus className="h-5 w-5" />
                  </span>
                  <p className="max-w-md text-sm leading-relaxed text-white/70">
                    Request a date that works for you — the organizer gets notified and you&rsquo;ll hear back.
                  </p>
                </div>
                {isLoggedIn ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-(--brand-navy) shadow-[0_14px_30px_-14px_rgba(0,0,0,0.6)] transition hover:-translate-y-0.5 hover:bg-(--gold-soft-bg) active:scale-[0.98]"
                      >
                        Request a date
                      </button>
                    </DialogTrigger>
                    <DialogContent className="flex max-h-[85vh] w-[95vw] max-w-5xl flex-col items-center justify-center overflow-hidden rounded-3xl border-0 bg-(--white) p-0">
                      <VisuallyHidden>
                        <DialogTitle>Select Date and View Reviews</DialogTitle>
                      </VisuallyHidden>
                      <div className="flex h-full w-full items-center justify-center overflow-y-auto p-6 md:p-8">
                        <DateReviewsSection eventId={event.id} />
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <button
                    type="button"
                    onClick={() => openModal("register")}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-(--brand-navy) shadow-[0_14px_30px_-14px_rgba(0,0,0,0.6)] transition hover:-translate-y-0.5 hover:bg-(--gold-soft-bg) active:scale-[0.98]"
                  >
                    Register to request
                  </button>
                )}
              </div>
            </div>
          </motion.section>

          {/* Sponsors */}
          {sponsorGroups.length > 0 ? (
            <motion.section
              variants={reduce ? undefined : rise}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="rounded-3xl bg-white p-6 shadow-[0_24px_60px_-32px_rgba(12,29,55,0.4)] sm:p-8"
            >
              <SectionHead kicker="Sponsors" title="Made possible by" />
              <div className="mt-6 space-y-4">
                {sponsorGroups.map(([label, names]) => (
                  <div key={label} className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                    <span className="w-32 shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
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
                            className="rounded-full border border-(--gray-200) bg-(--gray-50) px-4 py-2 font-bricolage text-sm font-bold text-(--brand-navy) transition hover:-translate-y-0.5 hover:border-(--gold) hover:bg-white"
                          >
                            {sponsor.name}
                          </a>
                        ) : (
                          <span
                            key={sponsor.name}
                            className="rounded-full border border-(--gray-200) bg-(--gray-50) px-4 py-2 font-bricolage text-sm font-bold text-(--brand-navy)"
                          >
                            {sponsor.name}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          ) : null}

          {/* Venue & transport */}
          <motion.section
            variants={reduce ? undefined : rise}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="rounded-3xl border border-(--gold-soft-border) bg-gradient-to-br from-(--gold-soft-bg) via-(--gold-bar-bg) to-white p-6 shadow-[0_24px_60px_-32px_rgba(12,29,55,0.35)] sm:p-8"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-(--gold-text)">Getting there</p>
            <h2 className="mt-1 font-bricolage text-xl font-bold tracking-tight text-(--brand-navy) sm:text-2xl">
              Venue &amp; transport
            </h2>

            <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-(--brand-navy) text-(--gold) shadow-[0_14px_30px_-14px_rgba(12,29,55,0.6)]">
                  <MapPin className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Venue</p>
                  <p className="font-semibold text-(--brand-navy)">{event.venue ?? "TBA"}</p>
                </div>
              </div>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-(--brand-navy) px-7 py-3.5 font-poppins text-sm font-bold text-white shadow-[0_18px_40px_-15px_rgba(12,29,55,0.6)] transition hover:bg-(--brand-navy)/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gold) active:scale-[0.98]"
                >
                  <Navigation className="h-4 w-4" /> Get directions
                </a>
              ) : null}
            </div>

            {event.entrySide ||
            transportItems.length > 0 ||
            event.transportToEvent ||
            event.reEntryAllowed !== null ||
            event.parkingAvailable !== null ? (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-(--gold-soft-border) pt-5">
                {event.entrySide ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-(--gray-200) bg-(--gray-50) px-3.5 py-1.5 text-xs font-semibold text-(--brand-navy)">
                    <DoorOpen className="h-3.5 w-3.5 text-(--gold)" />
                    {event.entrySide}
                  </span>
                ) : null}
                {transportItems.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-2 rounded-full border border-(--gray-200) bg-(--gray-50) px-3.5 py-1.5 text-xs font-semibold text-(--brand-navy)"
                  >
                    <Bus className="h-3.5 w-3.5 text-(--gold)" />
                    {t}
                  </span>
                ))}
                {event.transportToEvent ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-(--gray-200) bg-(--gray-50) px-3.5 py-1.5 text-xs font-semibold text-(--brand-navy)">
                    <Bus className="h-3.5 w-3.5 shrink-0 text-(--gold)" />
                    {event.transportToEvent}
                  </span>
                ) : null}
                {event.reEntryAllowed !== null ? (
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                      event.reEntryAllowed
                        ? "border-(--gray-200) bg-(--gray-50) text-(--brand-navy)"
                        : "border-(--gray-200) bg-(--gray-50) text-(--gray-500)"
                    }`}
                  >
                    <Repeat className={`h-3.5 w-3.5 ${event.reEntryAllowed ? "text-(--gold)" : "text-(--gray-400)"}`} />
                    {event.reEntryAllowed ? "Re-entry allowed" : "No re-entry"}
                  </span>
                ) : null}
                {event.parkingAvailable !== null ? (
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
                      event.parkingAvailable
                        ? "border-(--gray-200) bg-(--gray-50) text-(--brand-navy)"
                        : "border-(--gray-200) bg-(--gray-50) text-(--gray-500)"
                    }`}
                  >
                    <Car className={`h-3.5 w-3.5 ${event.parkingAvailable ? "text-(--gold)" : "text-(--gray-400)"}`} />
                    {event.parkingAvailable ? "Parking available" : "No parking on-site"}
                  </span>
                ) : null}
              </div>
            ) : null}
          </motion.section>

          {/* Hosted by */}
          {organizerName ? (
            <motion.section
              variants={reduce ? undefined : rise}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-[0_24px_60px_-32px_rgba(12,29,55,0.4)]"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-(--brand-navy) font-bricolage text-xl font-bold text-(--gold)">
                {organizerName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Hosted by</p>
                <p className="mt-0.5 flex items-center gap-1.5 font-semibold text-(--brand-navy)">
                  <span className="truncate">{organizerName}</span>
                  <BadgeCheck className="h-4 w-4 shrink-0 text-(--brand-blue)" />
                </p>
                <p className="text-xs text-slate-500">Verified organizer</p>
              </div>
            </motion.section>
          ) : null}

          {/* Quick links — refund · guidelines · contact */}
          <motion.section
            variants={reduce ? undefined : rise}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="flex flex-wrap items-center gap-3 pt-2 text-sm"
          >
            <Link
              href="/refund-policy"
              className="inline-flex items-center gap-2 rounded-full border border-(--gray-200) bg-white px-5 py-2.5 font-semibold text-(--brand-navy) shadow-sm transition hover:-translate-y-0.5 hover:border-(--gold) hover:shadow-md active:scale-[0.98]"
            >
              <ShieldCheck className="h-4 w-4 text-(--gold-icon)" /> Refund policy
            </Link>

            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-(--gray-200) bg-white px-5 py-2.5 font-semibold text-(--brand-navy) shadow-sm transition hover:-translate-y-0.5 hover:border-(--gold) hover:shadow-md active:scale-[0.98]"
                >
                  <ScrollText className="h-4 w-4 text-(--gold-icon)" /> Guidelines &amp; rules
                </button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] w-[95vw] max-w-lg overflow-y-auto rounded-3xl border border-(--gray-200) bg-(--white) p-6">
                <DialogTitle className="mb-3 text-lg font-bold text-(--brand-navy)">Guidelines &amp; Rules</DialogTitle>
                {guidelineItems.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm text-(--gray-600)">
                    {guidelineItems.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-(--gray-600)">
                    The organizer hasn&rsquo;t listed event-specific guidelines yet. Carry a valid ID
                    and your ticket QR code — see our{" "}
                    <Link href="/refund-policy" className="font-semibold text-(--brand-blue) underline underline-offset-2">
                      refund &amp; cancellation policy
                    </Link>{" "}
                    for what applies to every booking.
                  </p>
                )}
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-(--gray-200) bg-white px-5 py-2.5 font-semibold text-(--brand-navy) shadow-sm transition hover:-translate-y-0.5 hover:border-(--gold) hover:shadow-md active:scale-[0.98]"
                >
                  <Phone className="h-4 w-4 text-(--gold-icon)" /> Contact organizer
                </button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md rounded-3xl border border-(--gray-200) bg-(--white) p-6">
                <DialogTitle className="mb-3 text-lg font-bold text-(--brand-navy)">Contact Information</DialogTitle>
                <div className="space-y-2 text-sm text-(--gray-600)">
                  {contact.mobile ? (
                    <a href={`tel:${contact.mobile}`} className="flex items-center gap-2 hover:text-(--brand-blue)">
                      <Phone className="h-4 w-4" /> {contact.mobile}
                    </a>
                  ) : null}
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-(--brand-blue)">
                      <ScrollText className="h-4 w-4" /> {contact.email}
                    </a>
                  ) : null}
                  {contact.website ? (
                    <a
                      href={contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-(--brand-blue)"
                    >
                      <Navigation className="h-4 w-4" /> {contact.website}
                    </a>
                  ) : null}
                  {contact.additionalLinks ? (
                    <p className="flex items-start gap-2">
                      <ScrollText className="mt-0.5 h-4 w-4 shrink-0" /> {contact.additionalLinks}
                    </p>
                  ) : null}
                  {!contact.mobile && !contact.email && !contact.website ? (
                    <p>
                      Reach us at{" "}
                      <a href="mailto:contact-us@baatasari.com" className="font-semibold text-(--brand-blue)">
                        contact-us@baatasari.com
                      </a>
                    </p>
                  ) : null}
                </div>
              </DialogContent>
            </Dialog>
          </motion.section>
        </div>
      </div>

      {/* ════ Mobile sticky booking bar — mirrors the tier selection once tickets are picked ════ */}
      {canBook ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-(--gray-200) bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
            {isLoggedIn && showTiers && totalQty > 0 ? (
              <>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--gray-400)">
                    Total · {totalQty} ticket{totalQty > 1 ? "s" : ""}
                  </p>
                  <p className="font-bricolage text-lg font-bold tabular-nums text-(--brand-navy)">
                    {totalPrice === 0 ? "Free" : formatCurrency(totalPrice)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={goToCheckout}
                  className="shrink-0 rounded-2xl bg-(--brand-navy) px-8 py-3.5 font-poppins text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgba(12,29,55,0.6)] transition hover:bg-(--brand-navy)/90 active:scale-[0.98]"
                >
                  Book {totalQty} ticket{totalQty > 1 ? "s" : ""}
                </button>
              </>
            ) : (
              <>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--gray-400)">
                    {isFreeEvent ? "Entry" : "From"}
                  </p>
                  <p className="font-bricolage text-lg font-bold tabular-nums text-(--brand-navy)">{priceDisplay}</p>
                </div>
                <button
                  type="button"
                  onClick={handleBookCta}
                  className="shrink-0 rounded-2xl bg-(--brand-navy) px-8 py-3.5 font-poppins text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgba(12,29,55,0.6)] transition hover:bg-(--brand-navy)/90 active:scale-[0.98]"
                >
                  {bookCtaLabel}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
