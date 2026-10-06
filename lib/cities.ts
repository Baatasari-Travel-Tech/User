import type { EventSummary } from "@/types/api"
import { getEventPhase } from "@/lib/event-helpers"

/**
 * City names arrive in whatever spelling an organizer picked (or a visitor's
 * network reports), so "Bangalore", "Bengaluru" and "bengaluru " must all be
 * the same city, and one URL: /events/bengaluru.
 */
const ALIASES: Record<string, string> = {
  bangalore: "bengaluru",
  bombay: "mumbai",
  calcutta: "kolkata",
  madras: "chennai",
  poona: "pune",
  gurgaon: "gurugram",
  vizag: "visakhapatnam",
  vishakhapatnam: "visakhapatnam",
  visakapatnam: "visakhapatnam",
  vijayawada: "vijayawada",
  "new delhi": "delhi",
  "navi mumbai": "navi-mumbai",
  hyd: "hyderabad",
  secunderabad: "hyderabad",
}

/** "Hyderabad " -> "hyderabad", "Navi Mumbai" -> "navi-mumbai", "São Paulo" -> "sao-paulo". */
export function citySlug(name: string | null | undefined): string {
  const base = (name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
  if (!base) return ""
  const aliased = ALIASES[base] ?? base
  return aliased.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

export type CityGroup = {
  slug: string
  /** The spelling used most often by the events in this city. */
  name: string
  events: EventSummary[]
}

/** Events a visitor can still go to or buy: not cancelled, not over. */
export function isUpcomingOrLive(event: EventSummary): boolean {
  if (event.cancelledAt) return false
  const { phase } = getEventPhase(event)
  return phase === "ongoing" || phase === "upcoming"
}

/**
 * Cities that have at least one live/upcoming event, biggest first. Never a
 * hand-written list: a city appears the day its first event is on sale and
 * leaves when its last one is over.
 */
export function groupCities(events: EventSummary[]): CityGroup[] {
  type Acc = { names: Map<string, number>; events: EventSummary[] }
  const groups = new Map<string, Acc>()
  for (const event of events) {
    if (!isUpcomingOrLive(event)) continue
    const raw = event.locationCity?.trim()
    const slug = citySlug(raw)
    if (!raw || !slug) continue
    const g: Acc = groups.get(slug) ?? { names: new Map<string, number>(), events: [] }
    g.names.set(raw, (g.names.get(raw) ?? 0) + 1)
    g.events.push(event)
    groups.set(slug, g)
  }
  return [...groups.entries()]
    .map(([slug, g]) => ({
      slug,
      name: [...g.names.entries()].sort((a, b) => b[1] - a[1])[0][0],
      events: g.events,
    }))
    .sort((a, b) => b.events.length - a.events.length || a.name.localeCompare(b.name))
}
