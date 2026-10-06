import type { Metadata } from "next"
import Link from "next/link"
import { EventGrid } from "@/components/events/event-grid"
import { SiteFooter } from "@/components/site-footer"
import { groupCities, type CityGroup } from "@/lib/cities"
import { fetchAllPublishedEvents } from "@/lib/events-server"
import { getEventPhase, toEventCardData } from "@/lib/event-helpers"
import { jsonLdString } from "@/lib/faq-schema"
import { SITE_ORIGIN, breadcrumbJsonLd } from "@/lib/seo"

/**
 * /events/<city>: every live and upcoming event in one city, as real HTML.
 *
 * It lives under /events/[id] because that is the URL asked for
 * (baatasari.com/events/hyderabad) and a second dynamic segment at the same
 * level is not allowed. The event page tries the id first and only falls
 * through to here when it is not an event, so event URLs are never affected.
 *
 * A city with no live or upcoming events has no page (404): a thin page is
 * worse than no page, and it stops being listed in the sitemap the same day.
 */

export async function findCity(slug: string): Promise<{ city: CityGroup; others: CityGroup[] } | null> {
  const cities = groupCities(await fetchAllPublishedEvents())
  const city = cities.find((c) => c.slug === slug.toLowerCase())
  if (!city) return null
  return { city, others: cities.filter((c) => c.slug !== city.slug) }
}

const dateIN = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })

function intro(city: CityGroup): string {
  const sorted = [...city.events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const n = sorted.length
  const categories = [...new Set(sorted.map((e) => e.category).filter((c): c is string => Boolean(c)))].slice(0, 3)
  const range =
    n > 1 ? `from ${dateIN(sorted[0].date)} to ${dateIN(sorted[n - 1].date)}` : `on ${dateIN(sorted[0].date)}`
  const mix = categories.length > 0 ? `, including ${categories.join(", ")}` : ""
  return `${n} live or upcoming ${n === 1 ? "event" : "events"} in ${city.name} on Baatasari, ${range}${mix}. Pick your tickets, pay online and get a QR code instantly.`
}

export async function cityMetadata(slug: string): Promise<Metadata | null> {
  const found = await findCity(slug)
  if (!found) return null
  const { city } = found
  const title = `Events in ${city.name}`
  const description = intro(city)
  return {
    title,
    description,
    alternates: { canonical: `/events/${city.slug}` },
    openGraph: { type: "website", url: `/events/${city.slug}`, title, description, images: [{ url: "/og-events.jpg", width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og-events.jpg"] },
  }
}

export async function CityEventsPage({ slug }: { slug: string }) {
  const found = await findCity(slug)
  if (!found) return null
  const { city, others } = found

  const cards = [...city.events]
    .map((event) => ({ event, ...getEventPhase(event) }))
    .sort((a, b) => (a.phase === b.phase ? a.sort - b.sort : a.phase === "ongoing" ? -1 : 1))
    .map(({ event }) => toEventCardData(event))

  const jsonLd = [
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Events", path: "/events" },
      { name: city.name, path: `/events/${city.slug}` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `Events in ${city.name}`,
      url: `${SITE_ORIGIN}/events/${city.slug}`,
      description: intro(city),
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: city.events.length,
        itemListElement: city.events.map((e, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_ORIGIN}/events/${e.id}`,
          name: e.title,
        })),
      },
    },
  ]

  return (
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <section className="page-x-wide pt-8 md:pt-10">
        <nav aria-label="Breadcrumb" className="text-sm text-(--gray-500)">
          <Link href="/" className="hover:underline">Home</Link>
          <span aria-hidden> / </span>
          <Link href="/events" className="hover:underline">Events</Link>
          <span aria-hidden> / </span>
          <span className="text-(--gray-700)">{city.name}</span>
        </nav>
        <h1 className="mt-3 font-bricolage text-3xl font-bold text-(--brand-blue) md:text-4xl">Events in {city.name}</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-(--gray-700)">{intro(city)}</p>
      </section>

      <EventGrid events={cards} title={`Events in ${city.name}`} hideHeader />

      <section className="page-x-wide pb-14">
        <h2 className="text-lg font-semibold text-(--brand-blue)">Looking elsewhere?</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          <li>
            <Link href="/events" className="inline-flex min-h-11 items-center rounded-full border border-(--gray-200) bg-white px-5 text-sm font-semibold text-(--gray-700) hover:border-(--brand-blue) hover:text-(--brand-blue)">
              All events
            </Link>
          </li>
          {others.map((c) => (
            <li key={c.slug}>
              <Link href={`/events/${c.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-(--gray-200) bg-white px-5 text-sm font-semibold text-(--gray-700) hover:border-(--brand-blue) hover:text-(--brand-blue)">
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <SiteFooter />
    </main>
  )
}
