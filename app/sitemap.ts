import type { MetadataRoute } from "next"
import { PUBLIC_ROUTES, SITE_ORIGIN } from "@/lib/seo"
import type { EventSummary } from "@/types/api"

// Regenerate hourly. Events are published continuously, so a build-time-only
// sitemap would go stale between deploys — which is exactly the state that
// left Search Console with nothing to crawl.
export const revalidate = 3600

// The API caps `limit` at 100, so the list has to be walked. Bounded: a
// runaway loop here would hammer the API on every revalidation, and a sitemap
// is capped at 50,000 URLs anyway.
const PAGE_SIZE = 100
const MAX_PAGES = 20

async function fetchAllPublishedEvents(): Promise<EventSummary[]> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""
  if (!base) return []

  const all: EventSummary[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    try {
      const res = await fetch(
        `${base}/api/v1/events?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
        { next: { revalidate } },
      )
      if (!res.ok) break
      const json = (await res.json()) as { data?: { events?: EventSummary[] } }
      const batch = json.data?.events ?? []
      all.push(...batch)
      if (batch.length < PAGE_SIZE) break
    } catch {
      // Serve what we have. A partial sitemap is materially better than the
      // 500 that a thrown error would turn into — Google drops a failing
      // sitemap entirely rather than falling back to the last good one.
      break
    }
  }
  return all
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_ORIGIN}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))

  const events = await fetchAllPublishedEvents()

  const eventEntries: MetadataRoute.Sitemap = events
    // The list endpoint only returns published events, but a cancelled one
    // stays published so buyers can still find the notice — it just has no
    // business being advertised in search.
    .filter((event) => !event.cancelledAt)
    .map((event) => {
      const isPast = new Date(event.endDate ?? event.date).getTime() < now.getTime()
      return {
        url: `${SITE_ORIGIN}/events/${event.id}`,
        lastModified: new Date(event.updatedAt),
        // A past event's page never changes again, and it is no longer what
        // anyone is searching for.
        changeFrequency: isPast ? ("yearly" as const) : ("daily" as const),
        priority: isPast ? 0.3 : 0.8,
      }
    })

  return [...staticEntries, ...eventEntries]
}
