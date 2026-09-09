import type { Metadata } from "next"
import { StateBlock } from "@/components/platform/state-block"
import { getEventCoverImageUrl } from "@/lib/event-cover"
import { breadcrumbJsonLd, eventJsonLd } from "@/lib/seo"
import type { EventDetail } from "@/types/api"
import EventDetailClient from "./event-detail-client"

// Build a share-preview description: tagline/description + date + venue.
const buildShareDescription = (event: EventDetail): string => {
  const parts: string[] = []
  const lead = (event.tagline?.trim() || event.description?.trim() || "").replace(/\s+/g, " ")
  if (lead) parts.push(lead.slice(0, 120))
  try {
    const when = new Date(event.date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      // This renders on the server, where Node's zone is UTC. Without an
      // explicit zone a show starting after 5:30 AM IST is fine, but anything
      // past midnight IST falls back a day — the share preview would name the
      // wrong date on exactly the late-night events people share most.
      timeZone: "Asia/Kolkata",
    })
    if (when) parts.push(when)
  } catch {
    /* ignore bad date */
  }
  if (event.venue?.trim()) parts.push(event.venue.trim())
  return parts.join(" · ").slice(0, 200) || "Event details"
}

async function fetchEvent(id: string): Promise<EventDetail | null> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""
    const res = await fetch(`${base}/api/v1/events/${id}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: { event?: EventDetail } }
    return json.data?.event ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const event = await fetchEvent(id)
  if (!event) return { title: "Event Not Found" }

  const description = buildShareDescription(event)
  // Absolute, public S3 URL of the event cover — used as the link-preview image.
  const coverUrl = getEventCoverImageUrl(event.id, event.updatedAt)

  return {
    title: event.title,
    description,
    alternates: { canonical: `/events/${event.id}` },
    // A cancelled event's page still has to be reachable — buyers follow their
    // ticket link to find the notice — but it should not be competing in
    // search results as if it were still on.
    robots: event.cancelledAt ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      title: event.title,
      description,
      images: [{ url: coverUrl, alt: event.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: [coverUrl],
    },
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await fetchEvent(id)

  if (!event) {
    return (
      <main className="page-x py-10">
        <StateBlock
          tone="error"
          title="Event unavailable"
          description="This event could not be loaded. It may have been unpublished or the request failed."
        />
      </main>
    )
  }

  // Rendered server-side so the structured data is in the initial HTML —
  // the crawler reads it without executing the client bundle.
  const jsonLd = [
    eventJsonLd(event, getEventCoverImageUrl(event.id, event.updatedAt)),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Events", path: "/events" },
      { name: event.title, path: `/events/${event.id}` },
    ]),
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <EventDetailClient event={event} />
    </>
  )
}
