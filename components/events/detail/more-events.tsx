"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { EventCard } from "@/components/events/event-card"
import { citySlug } from "@/lib/cities"
import { eventTab, getEventPhase } from "@/lib/event-helpers"
import { fetchAllEvents } from "@/lib/api/events"
import type { EventDetail } from "@/types/api"

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * "More events this week": other events that are still to come, from the same
 * city first. When nothing else is on within the week it says "More events"
 * instead, so the heading never promises something it does not show. A row of
 * four on a wide screen, a sideways strip on a phone.
 */
export function MoreEvents({ event }: { event: EventDetail }) {
  const { data } = useQuery({ queryKey: ["public-events"], queryFn: fetchAllEvents, staleTime: 60_000 })

  // Read once, when the section first appears (the list is for this visit).
  const [now] = useState(() => Date.now())
  const { items, thisWeek } = useMemo(() => {
    const pool = (data ?? [])
      .filter((e) => e.id !== event.id && !e.cancelledAt && eventTab(e) !== "past")
      .map((e) => ({ e, start: getEventPhase(e).sort }))
    const sameCity = event.locationCity ? citySlug(event.locationCity) : ""
    pool.sort((a, b) => {
      const ca = sameCity && citySlug(a.e.locationCity) === sameCity ? 0 : 1
      const cb = sameCity && citySlug(b.e.locationCity) === sameCity ? 0 : 1
      return ca - cb || a.start - b.start
    })
    const picked = pool.slice(0, 4)
    const week = picked.length > 0 && picked.every((p) => p.start - now <= WEEK_MS)
    return { items: picked.map((p) => p.e), thisWeek: week }
  }, [data, event.id, event.locationCity, now])

  if (items.length === 0) return null

  return (
    <section className="mt-12">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-(--brand-navy) md:text-[28px]">
          {thisWeek ? "More events this week" : "More events"}
        </h2>
        <Link href="/events" className="shrink-0 text-sm font-semibold text-(--brand-navy) hover:underline">
          See all →
        </Link>
      </div>
      <div className="-mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0">
        {items.map((e) => (
          <div key={e.id} className="w-[78%] shrink-0 snap-start sm:w-[46%] md:w-auto">
            <EventCard event={e} />
          </div>
        ))}
      </div>
    </section>
  )
}
