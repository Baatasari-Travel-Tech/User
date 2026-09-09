import type { EventDetail } from "@/types/api"

/**
 * Canonical origin. metadataBase in the root layout resolves relative URLs for
 * OG/canonical tags, but robots.ts, sitemap.ts and JSON-LD all need absolute
 * strings and none of them can read it, so it lives here once.
 *
 * MUST be the host that actually serves — the one visitors are left on after
 * any redirect, not the one they may have typed. Every canonical tag, every
 * sitemap entry, robots.txt and the JSON-LD `url` fields all derive from it.
 *
 * Naming the wrong one is not cosmetic: Google asks that a sitemap list final
 * URLs, and a self-referencing canonical that resolves somewhere else is a
 * contradictory signal — both work against being indexed at all.
 *
 * The apex serves; www redirects here. If that direction is ever reversed, this
 * line is the only thing that needs to change.
 */
export const SITE_ORIGIN = "https://baatasari.com"

export const SITE_NAME = "Baatasari"

/**
 * Paths that must never be indexed.
 *
 * Two separate mechanisms consume this:
 *   * robots.ts turns it into Disallow rules — a crawl hint;
 *   * proxy.ts sends `X-Robots-Tag: noindex` — the actual exclusion, and the
 *     only one that works for the client-rendered pages, which cannot export
 *     Next metadata at all.
 *
 * Disallow alone is NOT enough: a disallowed URL can still be indexed from
 * inbound links, because the crawler never fetches it and so never sees the
 * noindex. Both together is the combination that actually keeps them out.
 */
export const PRIVATE_PATH_PREFIXES = [
  "/403",
  "/auth/",
  "/checkout",
  "/dashboard",
  "/forgot-password",
  "/history",
  "/invoice/",
  "/login",
  "/maintenance",
  "/onboarding",
  "/order-confirmed/",
  "/organizer/",
  "/register",
  "/reset-password",
  "/talent/dashboard",
  "/talent/onboarding",
  "/verify-email",
]

export const isPrivatePath = (pathname: string): boolean =>
  PRIVATE_PATH_PREFIXES.some(
    (p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p),
  )

/** Public routes worth listing in the sitemap, with a crawl priority. */
export const PUBLIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/events", priority: 0.9, changeFrequency: "daily" },
  { path: "/for-organizers", priority: 0.7, changeFrequency: "monthly" },
  { path: "/talent", priority: 0.6, changeFrequency: "monthly" },
  { path: "/contact-us", priority: 0.4, changeFrequency: "yearly" },
  { path: "/privacy-policy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms-and-conditions", priority: 0.2, changeFrequency: "yearly" },
  { path: "/refund-policy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/grievance", priority: 0.2, changeFrequency: "yearly" },
]

/**
 * Reachable even while maintenance mode is on.
 *
 * The policy pages are published to satisfy the Consumer Protection
 * (E-Commerce) Rules, the IT Rules and the payment gateway's onboarding
 * requirements — obligations that do not pause because we are mid-deploy, and
 * a gateway or regulator checking the links must not find a holding page.
 * Contact is here for the same reason plus a practical one: it is what a
 * stranded buyer needs precisely when the site is down.
 *
 * Consumed by proxy.ts (the gate) and by the maintenance page (which links to
 * them), so the two can never disagree about what stays up.
 */
export const MAINTENANCE_ALLOWED: Array<{ path: string; label: string }> = [
  { path: "/contact-us", label: "Contact us" },
  { path: "/terms-and-conditions", label: "Terms & Conditions" },
  { path: "/privacy-policy", label: "Privacy Policy" },
  { path: "/refund-policy", label: "Refund Policy" },
  { path: "/grievance", label: "Grievance Redressal" },
]

export const bypassesMaintenance = (pathname: string): boolean =>
  MAINTENANCE_ALLOWED.some(
    ({ path }) => pathname === path || pathname.startsWith(`${path}/`),
  )

// ─── JSON-LD ────────────────────────────────────────────────────────────────

/** Site-wide identity. Emitted once, from the root layout. */
export const organizationJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_ORIGIN,
  logo: `${SITE_ORIGIN}/nlogo.png`,
  description: "Book the best events, dining, and activities near you.",
  areaServed: { "@type": "Country", name: "India" },
})

/**
 * Enables the sitelinks search box. The target must be a real, working URL —
 * /events reads `q` from the query string.
 */
export const webSiteJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_ORIGIN,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_ORIGIN}/events?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
})

const offersFor = (event: EventDetail) => {
  const tiers = event.ticketTiers ?? []
  if (tiers.length === 0) return undefined
  return tiers.map((tier) => ({
    "@type": "Offer",
    name: tier.name,
    price: tier.price,
    priceCurrency: "INR",
    url: `${SITE_ORIGIN}/events/${event.id}`,
    availability:
      (tier.soldCount ?? 0) >= tier.quantity
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
    validFrom: tier.saleStartsAt ?? undefined,
  }))
}

/**
 * schema.org/Event — what earns the event rich result in search.
 *
 * Google requires name, startDate and location. Everything else is included
 * only when the organizer actually filled it in: an `undefined` field is
 * dropped by JSON.stringify, whereas a placeholder would be a false claim in
 * structured data, which is what gets a site penalised.
 */
export const eventJsonLd = (event: EventDetail, coverUrl: string) => {
  const performers = (event.artists ?? [])
    .filter((a) => a?.name)
    .map((a) => ({ "@type": "PerformingGroup", name: a.name }))

  const address = {
    "@type": "PostalAddress",
    streetAddress: event.location ?? undefined,
    addressLocality: event.locationCity ?? event.locationArea ?? undefined,
    addressRegion: event.locationState ?? undefined,
    postalCode: event.locationPincode ?? undefined,
    addressCountry: "IN",
  }

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: (event.tagline?.trim() || event.description?.trim() || "").slice(0, 500) || undefined,
    // `date`/`endDate` are already full UTC instants carrying the real start
    // time (e.g. 2026-08-01T12:30:00Z for a 6:30 PM IST show), so they go
    // straight through. Do NOT try to graft `startTime` on top: it is a display
    // string in 12-hour form ("06:00 PM"), and parsing it as 24-hour puts every
    // evening event twelve hours early in search results.
    startDate: event.date,
    endDate: event.endDate ?? undefined,
    eventStatus: event.cancelledAt
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: coverUrl ? [coverUrl] : undefined,
    url: `${SITE_ORIGIN}/events/${event.id}`,
    location: {
      "@type": "Place",
      name: event.venue || event.location || "Venue",
      address,
      geo:
        event.locationLat != null && event.locationLng != null
          ? { "@type": "GeoCoordinates", latitude: event.locationLat, longitude: event.locationLng }
          : undefined,
    },
    organizer: event.organizerDisplayName
      ? { "@type": "Organization", name: event.organizerDisplayName }
      : { "@type": "Organization", name: SITE_NAME, url: SITE_ORIGIN },
    // Undefined rather than [] — an empty array is a positive claim of "no
    // performers", which validators flag.
    performer: performers.length > 0 ? performers : undefined,
    offers: offersFor(event),
    maximumAttendeeCapacity: event.capacity > 0 ? event.capacity : undefined,
  }
}

export const breadcrumbJsonLd = (trail: Array<{ name: string; path: string }>) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: trail.map((crumb, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: crumb.name,
    item: `${SITE_ORIGIN}${crumb.path}`,
  })),
})
