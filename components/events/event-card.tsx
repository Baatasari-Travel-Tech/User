"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { computeEventStatus, formatCardChip, formatEventTime } from "@/lib/event-helpers"
import { getEventCoverImageUrl } from "@/lib/event-cover"
import { formatCurrency } from "@/lib/format"
import type { EventSummary } from "@/types/api"

/**
 * One event on the events list and in "More events this week": a landscape
 * picture with the date on it, then the title, "time · venue", the lowest price
 * and the category. Finished events are shown dimmed and are not clickable (they
 * have no booking page); cancelled events say so.
 */
export function EventCard({ event, priority = false }: { event: EventSummary; priority?: boolean }) {
  const image = getEventCoverImageUrl(event.id, event.updatedAt)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const [erroredSrc, setErroredSrc] = useState<string | null>(null)
  const loaded = loadedSrc === image
  const errored = erroredSrc === image

  const cancelled = Boolean(event.cancelledAt)
  const isPast = computeEventStatus(event) === "past"
  const dimmed = cancelled || isPast

  const time = formatEventTime(event.startTime)
  const when = [time, event.venue].filter(Boolean).join(" · ")
  const price = event.startingPrice ?? 0
  const priceLabel = price <= 0 ? "Free entry" : `From ${formatCurrency(price)}`
  const href = `/events/${event.slug ?? event.id}`

  const card = (
    <article className="group flex h-full flex-col">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-(--gray-100) md:aspect-[10/7]">
        {image && !errored ? (
          <>
            {!loaded ? <div className="absolute inset-0 animate-pulse bg-slate-200" aria-hidden /> : null}
            <Image
              src={image}
              alt={event.title}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className={`object-cover transition-[transform,opacity] duration-500 group-hover:scale-105 ${
                !loaded ? "opacity-0" : dimmed ? "opacity-60 grayscale" : "opacity-100"
              }`}
              onLoad={() => setLoadedSrc(image)}
              onError={() => setErroredSrc(image)}
            />
          </>
        ) : null}

        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[12px] font-semibold tracking-wide text-(--brand-navy) shadow-sm">
          {formatCardChip(event.date)}
        </span>
        {cancelled ? (
          <span className="absolute right-3 top-3 rounded-full bg-rose-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            Cancelled
          </span>
        ) : isPast ? (
          <span className="absolute right-3 top-3 rounded-full bg-(--brand-navy) px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
            Completed
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-1 flex-col px-1">
        <h3 className="line-clamp-2 text-[17px] font-semibold leading-snug text-(--brand-navy)">{event.title}</h3>
        {when ? <p className="mt-1 line-clamp-1 text-[13px] text-(--gray-500)">{when}</p> : null}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          <p className="text-[15px] font-bold text-(--brand-navy)">{priceLabel}</p>
          {event.category ? (
            <span className="max-w-[55%] truncate rounded-full bg-(--gold-soft-bg) px-3 py-1 text-[11px] font-semibold text-(--gold-text)">
              {event.category}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )

  // A finished event has no booking page: show the card only.
  if (isPast) return <div className="block h-full w-full">{card}</div>
  return (
    <Link href={href} className="block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--brand-navy)">
      {card}
    </Link>
  )
}

/** Placeholder cards while the events are loading. */
export function EventCardSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <div className="aspect-[16/10] w-full animate-pulse rounded-2xl bg-slate-200 md:aspect-[10/7]" />
          <div className="mt-3 space-y-2 px-1">
            <div className="h-5 w-4/5 animate-pulse rounded-full bg-slate-200" />
            <div className="h-4 w-3/5 animate-pulse rounded-full bg-slate-100" />
            <div className="h-5 w-1/3 animate-pulse rounded-full bg-slate-200" />
          </div>
        </div>
      ))}
    </div>
  )
}
