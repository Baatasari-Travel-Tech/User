import Image from "next/image"
import Link from "next/link"

/**
 * The footer for the events list, the event page and the city pages: a dark
 * navy block with the logo and a one-line description, three short columns on a
 * wide screen and plain links on a phone. The Grievance link stays because the
 * law asks for the Grievance Officer's details to be easy to find.
 */
const COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string; plain?: boolean }> }> = [
  {
    heading: "Explore",
    links: [
      { label: "Events", href: "/events" },
      { label: "Talents", href: "/talent" },
      // /for-venue is a redirect to venue.baatasari.com: a plain link lets the browser follow it.
      { label: "Venues", href: "/for-venue", plain: true },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/" },
      { label: "Contact", href: "/contact-us" },
      { label: "Help", href: "/help" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms", href: "/terms-and-conditions" },
      { label: "Privacy", href: "/privacy-policy" },
      { label: "Refund & cancellation", href: "/refund-policy" },
      { label: "Grievance", href: "/grievance" },
    ],
  },
]

const ALL_LINKS = COLUMNS.flatMap((c) => c.links)

const linkClass = "text-white/80 transition hover:text-white"

function FooterLink({ link }: { link: { label: string; href: string; plain?: boolean } }) {
  return link.plain ? (
    <a href={link.href} className={linkClass}>
      {link.label}
    </a>
  ) : (
    <Link href={link.href} className={linkClass}>
      {link.label}
    </Link>
  )
}

export function EventsFooter() {
  return (
    <footer className="bg-(--brand-navy) text-white">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-6 pt-10 md:px-6 md:pt-12 lg:px-10">
        <div className="md:flex md:items-start md:justify-between md:gap-12">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white">
                <Image src="/brand-96.webp" alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />
              </span>
              <span className="text-lg font-semibold">Baatasari</span>
            </div>
            <p className="mt-4 text-sm text-white/70">Curated events, venues and talent in Visakhapatnam.</p>
          </div>

          {/* Wide screens: three columns */}
          <div className="mt-0 hidden gap-16 text-sm md:grid md:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">{col.heading}</p>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <FooterLink link={link} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Phones: one wrapped row of links */}
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm md:hidden">
            {ALL_LINKS.map((link) => (
              <li key={link.label}>
                <FooterLink link={link} />
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 border-t border-white/15 pt-5 text-xs text-white/55 md:mt-10">
          &copy; {new Date().getFullYear()} Baatasari. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
