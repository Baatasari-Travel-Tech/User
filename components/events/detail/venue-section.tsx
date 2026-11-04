import type { ReactNode } from "react"
import { Bus, CircleCheck, CircleX, MapPin, Navigation } from "lucide-react"
import type { EventDetail } from "@/types/api"

const humanize = (key: string): string =>
  key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())

/** Where to go for directions: the organizer's own link, else the pin, else a search. */
export function directionsUrl(event: EventDetail): string | null {
  if (event.googleMapsUrl) return event.googleMapsUrl
  if (typeof event.locationLat === "number" && typeof event.locationLng === "number") {
    return `https://www.google.com/maps/dir/?api=1&destination=${event.locationLat},${event.locationLng}`
  }
  if (event.venue?.trim()) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue.trim())}`
  return null
}

/**
 * A small map of the venue. With the venue's coordinates it is a real
 * OpenStreetMap view (nothing to click inside it: the whole tile opens
 * directions instead, so it never traps scrolling on a phone). Without
 * coordinates it is a quiet map-style tile with a pin.
 */
function VenueMap({ event, href }: { event: EventDetail; href: string | null }) {
  const lat = event.locationLat
  const lng = event.locationLng
  const hasCoords = typeof lat === "number" && typeof lng === "number"
  const box = "relative h-40 w-full overflow-hidden rounded-2xl border border-(--gray-200) bg-(--gold-bar-bg) md:h-full md:min-h-[170px]"

  const inner = hasCoords ? (
    <>
      <iframe
        title={`Map of ${event.venue}`}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.006}%2C${lat - 0.004}%2C${lng + 0.006}%2C${lat + 0.004}&layer=mapnik&marker=${lat}%2C${lng}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="pointer-events-none h-full w-full border-0"
      />
      <span className="absolute inset-0" aria-hidden />
    </>
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--gold-bar-bg),#e9eef5)]">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-(--brand-navy) text-white shadow-lg">
        <MapPin className="h-5 w-5" aria-hidden />
      </span>
    </div>
  )

  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Open the venue in maps" className={box}>
      {inner}
    </a>
  ) : (
    <div className={box}>{inner}</div>
  )
}

function Chip({ tone, children }: { tone: "good" | "rule"; children: ReactNode }) {
  const Icon = tone === "good" ? CircleCheck : CircleX
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-(--gray-200) bg-(--gray-50) px-3 py-1 text-xs font-medium text-(--brand-navy)">
      <Icon className={`h-3.5 w-3.5 ${tone === "good" ? "text-emerald-600" : "text-rose-500"}`} aria-hidden />
      {children}
    </span>
  )
}

/** The Venue block: map, name and address, directions, then what to know and the rules. */
export function VenueSection({ event }: { event: EventDetail }) {
  const href = directionsUrl(event)
  const address = [event.locationArea, event.locationCity, event.locationPincode].filter(Boolean).join(", ") || event.location || ""
  const showAddress = address && address.toLowerCase() !== (event.venue ?? "").toLowerCase()

  const transport = Object.entries((event.transportOptions ?? {}) as Record<string, unknown>)
    .filter(([, v]) => v === true)
    .map(([k]) => humanize(k))

  const good: ReactNode[] = []
  if (event.entrySide) good.push(`Entry via ${event.entrySide}`)
  for (const t of transport) good.push(t)
  if (event.reEntryAllowed === true) good.push("Re-entry allowed")
  if (event.parkingAvailable === true) good.push("Parking available")
  const rules: ReactNode[] = []
  if (event.reEntryAllowed === false) rules.push("No re-entry")
  if (event.parkingAvailable === false) rules.push("No on-site parking")

  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_24px_60px_-32px_rgba(12,29,55,0.4)] md:p-7">
      <h2 className="text-xl font-semibold text-(--brand-navy)">Venue</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
        <VenueMap event={event} href={href} />
        <div className="min-w-0">
          <p className="text-base font-semibold text-(--brand-navy)">{event.venue ?? "To be announced"}</p>
          {showAddress ? <p className="mt-1 text-sm leading-relaxed text-(--gray-500)">{address}</p> : null}
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-(--gray-300) bg-white px-4 py-2 text-sm font-semibold text-(--brand-navy) transition hover:border-(--brand-navy)"
            >
              <Navigation className="h-4 w-4" aria-hidden /> Get directions
            </a>
          ) : null}

          {good.length > 0 ? (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--gold-text)">Good to know</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {good.map((g, i) => (
                  <Chip key={i} tone="good">
                    {g}
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}
          {rules.length > 0 ? (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--gold-text)">Rules</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {rules.map((r, i) => (
                  <Chip key={i} tone="rule">
                    {r}
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}
          {event.transportToEvent ? (
            <p className="mt-4 flex items-start gap-2 text-sm text-(--gray-600)">
              <Bus className="mt-0.5 h-4 w-4 shrink-0 text-(--gold-icon)" aria-hidden />
              {event.transportToEvent}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
