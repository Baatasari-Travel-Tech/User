import type { Metadata } from "next"
import EventsClient from "./events-client"

const title = "Events — Baatasari"
const description = "Browse live, upcoming, and past events near you — concerts, workshops, meetups, and more."

export const metadata: Metadata = {
  // Bare — the root layout's template appends the brand. `title` above keeps
  // its branded form because it is also the share-card title.
  title: "Events",
  description,
  alternates: { canonical: "/events" },
  openGraph: {
    type: "website",
    url: "/events",
    siteName: "Baatasari",
    title,
    description,
    images: [{ url: "/og-events.jpg", width: 1200, height: 630, alt: "Baatasari Events" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-events.jpg"],
  },
}

export default function Page() {
  return <EventsClient />
}
