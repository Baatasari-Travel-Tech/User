import type { EventSummary } from "@/types/api"

// The API caps `limit` at 100, so the list has to be walked. Bounded: a
// runaway loop here would hammer the API on every revalidation.
const PAGE_SIZE = 100
const MAX_PAGES = 20

/**
 * Every published event, fetched on the server (so city pages and the sitemap
 * are real HTML a crawler can read). Cached for five minutes. A failure returns
 * what was gathered so far rather than throwing: a thin page is better than a
 * 500, and the next revalidation heals it.
 */
export async function fetchAllPublishedEvents(revalidate = 300): Promise<EventSummary[]> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""
  if (!base) return []

  const all: EventSummary[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    try {
      const res = await fetch(`${base}/api/v1/events?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, {
        next: { revalidate },
      })
      if (!res.ok) break
      const json = (await res.json()) as { data?: { events?: EventSummary[] } }
      const batch = json.data?.events ?? []
      all.push(...batch)
      if (batch.length < PAGE_SIZE) break
    } catch {
      break
    }
  }
  return all
}
