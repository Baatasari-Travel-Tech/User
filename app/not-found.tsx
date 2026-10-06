import type { Metadata } from "next"
import Link from "next/link"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "Page not found",
  description: "That page doesn’t exist or has moved. Head back to events, talent or the home page.",
  robots: { index: false, follow: true },
}

const LINKS = [
  { href: "/events", label: "Browse events" },
  { href: "/talent", label: "Find talent" },
  { href: "/help", label: "Help" },
  { href: "/contact-us", label: "Contact us" },
]

export default function NotFound() {
  return (
    <>
      <section className="mx-auto flex min-h-[60dvh] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Error 404</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">We couldn’t find that page</h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">
          The link may be old, or the event may have ended. Start again from the home page, or try one of these.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-[#0c1d37] px-7 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Go to the home page
        </Link>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="inline-flex min-h-11 items-center font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <SiteFooter />
    </>
  )
}
