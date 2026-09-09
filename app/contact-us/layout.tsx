import type { Metadata } from "next"

// The page itself is a client component, which cannot export metadata — hence
// this layout. It exists only to give the route a title and description.

const title = "Contact Us"
const description =
  "Get in touch with the Baatasari team — support for bookings, tickets, refunds, and organizer queries."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact-us" },
  openGraph: { type: "website", url: "/contact-us", title, description },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
