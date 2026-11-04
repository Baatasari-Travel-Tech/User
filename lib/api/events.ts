import { apiRequest } from "@/lib/api/client"
import type { EventSummary } from "@/types/api"

// The API caps `limit` at 100 per request (Backend/events.controller.ts), and
// the events page filters (search, category, date, city) run in the browser over
// the full set. Walk the pages the same way app/sitemap.ts does, up to the same
// generous ceiling, rather than teaching the filters to be server-paginated.
const EVENTS_PAGE_SIZE = 100
const EVENTS_MAX_PAGES = 20

export async function fetchAllEvents(): Promise<EventSummary[]> {
  const all: EventSummary[] = []
  for (let page = 0; page < EVENTS_MAX_PAGES; page++) {
    const response = await apiRequest<{ data: { events: EventSummary[] } }>(
      `/events?limit=${EVENTS_PAGE_SIZE}&offset=${page * EVENTS_PAGE_SIZE}`,
    )
    const batch = response.data.events
    all.push(...batch)
    if (batch.length < EVENTS_PAGE_SIZE) break
  }
  return all
}
