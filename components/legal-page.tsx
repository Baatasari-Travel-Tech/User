import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SiteFooter } from "@/components/site-footer"

/**
 * The shell every legal page sits in (same component shape as Organizer's and
 * Venue's). Prose styling lives in `.legal` (app/globals.css) as descendant
 * rules, so the page files hold only the words.
 */
export function LegalPage({
  title,
  standfirst,
  updated,
  children,
}: {
  title: string
  standfirst: string
  /** Effective date, as a human string. */
  updated: string
  children: React.ReactNode
}) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 md:px-10 lg:px-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to Baatasari
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1680px] px-4 pb-16 sm:px-6 md:px-10 lg:px-16 lg:pb-24">
        {/* A prose measure, not the page gutter: legal text is read line by line. */}
        <div className="mx-auto max-w-[46rem] pt-10 lg:pt-14">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
          <span aria-hidden className="mt-4 block h-0.5 w-16 rounded-full bg-slate-900" />
          <p className="mt-5 text-base leading-relaxed text-slate-600">{standfirst}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Last updated {updated}</p>

          <div className="legal mt-10">{children}</div>
        </div>
      </main>

      <SiteFooter />
    </>
  )
}
