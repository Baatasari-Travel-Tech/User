import type { Metadata } from "next"
import Link from "next/link"
import { MapPin, Search, Sparkles } from "lucide-react"
import { fetchTalentList, formatPrice, type PublicTalent } from "@/lib/talent"

const title = "Find Talent"
const description =
  "Singers, DJs, anchors, dancers, photographers and more — browse performers on Baatasari and book them for your event."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/talent/browse" },
  openGraph: { type: "website", url: "/talent/browse", title, description },
}

type SearchParams = Promise<{ q?: string; skill?: string; city?: string; page?: string }>

export default async function TalentBrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)
  const filters = { q: sp.q?.trim() || undefined, skill: sp.skill || undefined, city: sp.city || undefined }
  const data = await fetchTalentList({ ...filters, page })
  const filtered = Boolean(filters.q || filters.skill || filters.city)

  const pageHref = (n: number) => {
    const qs = new URLSearchParams()
    if (filters.q) qs.set("q", filters.q)
    if (filters.skill) qs.set("skill", filters.skill)
    if (filters.city) qs.set("city", filters.city)
    if (n > 1) qs.set("page", String(n))
    const s = qs.toString()
    return s ? `/talent/browse?${s}` : "/talent/browse"
  }

  const field =
    "w-full rounded-xl border border-(--gold-bar-border) bg-white px-4 py-3 font-albert text-sm text-(--brand-navy) outline-none focus:border-(--brand-navy) focus:ring-4 focus:ring-(--brand-navy)/10"

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-(--background) px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-(--gold-bar-border) bg-(--gold-bar-bg)/80 px-4 py-1.5 font-poppins text-xs font-semibold uppercase tracking-[0.18em] text-(--gold-text)">
            <Sparkles className="h-3.5 w-3.5" />
            Talent directory
          </span>
          <h1 className="mt-4 font-bricolage text-4xl font-bold tracking-tight text-(--brand-navy)">
            Find talent for your event
          </h1>
          <p className="mt-3 font-albert text-sm leading-6 text-(--gray-600)">
            Performers and creators listed on Baatasari. Organizers on Baatasari can see their contact details and
            reach them directly.
          </p>
        </div>

        {/* Filters — a plain GET form, so it works before any JS loads. */}
        <form action="/talent/browse" method="get" className="mt-8 grid gap-3 sm:grid-cols-[1fr_14rem_14rem_auto]">
          <label className="relative">
            <span className="sr-only">Search</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-(--gray-400)" />
            <input name="q" defaultValue={filters.q ?? ""} placeholder="Search by name or skill" className={`${field} pl-10`} />
          </label>
          <label>
            <span className="sr-only">Skill</span>
            <select name="skill" defaultValue={filters.skill ?? ""} className={field}>
              <option value="">All skills</option>
              {(data?.facets.skills ?? []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">City</span>
            <select name="city" defaultValue={filters.city ?? ""} className={field}>
              <option value="">All cities</option>
              {(data?.facets.cities ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-xl bg-(--brand-navy) px-6 py-3 font-poppins text-sm font-semibold text-white transition hover:opacity-90"
          >
            Search
          </button>
        </form>

        {!data ? (
          <p className="mt-10 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 font-albert text-sm text-rose-700">
            The talent directory couldn&apos;t load. Please try again in a moment.
          </p>
        ) : data.items.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-(--gold-bar-border) bg-white/90 p-10 text-center">
            <p className="font-bricolage text-xl font-bold text-(--brand-navy)">
              {filtered ? "No one matches that search yet" : "No performers listed yet"}
            </p>
            <p className="mt-2 font-albert text-sm text-(--gray-600)">
              {filtered ? (
                <Link href="/talent/browse" className="font-semibold underline">Clear the filters</Link>
              ) : (
                "Be the first —"
              )}{" "}
              {!filtered ? <Link href="/talent" className="font-semibold underline">list yourself as talent</Link> : null}
            </p>
          </div>
        ) : (
          <>
            <p className="mt-8 font-albert text-sm text-(--gray-500)">
              {data.total} {data.total === 1 ? "performer" : "performers"}
            </p>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((t) => (
                <li key={t.slug}>
                  <TalentCard talent={t} />
                </li>
              ))}
            </ul>
            {data.totalPages > 1 ? (
              <nav className="mt-8 flex items-center justify-center gap-3 font-poppins text-sm" aria-label="Pages">
                {page > 1 ? (
                  <Link href={pageHref(page - 1)} className="rounded-full border border-(--gold-bar-border) px-4 py-2 text-(--brand-navy)">
                    Previous
                  </Link>
                ) : null}
                <span className="text-(--gray-500)">
                  Page {page} of {data.totalPages}
                </span>
                {page < data.totalPages ? (
                  <Link href={pageHref(page + 1)} className="rounded-full border border-(--gold-bar-border) px-4 py-2 text-(--brand-navy)">
                    Next
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </>
        )}
      </div>
    </main>
  )
}

function TalentCard({ talent }: { talent: PublicTalent }) {
  const price = formatPrice(talent.expectedPriceBand)
  return (
    <Link
      href={`/talent/p/${talent.slug}`}
      className="group block overflow-hidden rounded-3xl border border-(--gold-bar-border) bg-white shadow-[0_18px_50px_-32px_rgba(12,29,55,0.4)] transition hover:-translate-y-0.5 hover:border-(--gold)"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-(--gold-soft-bg)">
        {talent.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- S3 photo, already resized server-side
          <img
            src={talent.photoUrl}
            alt={talent.stageName}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-bricolage text-5xl font-bold text-(--gold-icon)">
            {talent.stageName.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <div className="p-5">
        <p className="truncate font-bricolage text-lg font-bold text-(--brand-navy)">{talent.stageName}</p>
        <p className="mt-0.5 font-albert text-sm text-(--gold-text)">{talent.mainSkill}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 font-albert text-xs text-(--gray-600)">
          {talent.location ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-(--gold-icon)" />
              <span className="truncate">{talent.location}</span>
            </span>
          ) : <span />}
          {price ? <span className="font-semibold text-(--brand-navy)">{price}</span> : null}
        </div>
      </div>
    </Link>
  )
}
