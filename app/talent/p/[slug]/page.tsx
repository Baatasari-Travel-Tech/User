import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  Briefcase,
  CalendarDays,
  Globe,
  Instagram,
  MapPin,
  Phone,
  Tag,
  Youtube,
} from "lucide-react"
import {
  fetchPublicTalent,
  formatPrice,
  isInstagram,
  isYouTube,
  organizerTalentUrl,
  videoEmbed,
} from "@/lib/talent"

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const talent = await fetchPublicTalent(slug)
  if (!talent) return { title: "Performer not found", robots: { index: false, follow: true } }

  const title = `${talent.stageName}${talent.mainSkill ? ` — ${talent.mainSkill}` : ""}`
  const description = [talent.mainSkill, talent.location, talent.bio?.replace(/\s+/g, " ").slice(0, 120)]
    .filter(Boolean)
    .join(" · ")
  return {
    title,
    description,
    alternates: { canonical: `/talent/p/${talent.slug}` },
    openGraph: {
      type: "profile",
      url: `/talent/p/${talent.slug}`,
      title,
      description,
      images: talent.photoUrl ? [{ url: talent.photoUrl, alt: talent.stageName }] : undefined,
    },
    twitter: {
      card: talent.photoUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: talent.photoUrl ? [talent.photoUrl] : undefined,
    },
  }
}

const card =
  "rounded-3xl border border-(--gold-bar-border) bg-white/90 p-5 shadow-[0_18px_50px_-32px_rgba(12,29,55,0.4)] sm:p-7"

export default async function TalentProfilePage({ params }: { params: Params }) {
  const { slug } = await params
  const talent = await fetchPublicTalent(slug)
  if (!talent) notFound()

  const price = formatPrice(talent.expectedPriceBand)
  const embeds = talent.videoLinks.map((url) => ({ url, embed: videoEmbed(url) }))
  const linkIcon = (url: string) => (isInstagram(url) ? Instagram : isYouTube(url) ? Youtube : Globe)
  const linkLabel = (url: string) => (isInstagram(url) ? "Instagram" : isYouTube(url) ? "YouTube" : "Website")

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-(--background) px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/talent/browse"
          className="inline-flex items-center gap-1.5 font-poppins text-sm font-semibold text-(--brand-navy) hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          All talent
        </Link>

        <div className="mt-5 grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
          {/* Left: photo + contact */}
          <aside className="grid content-start gap-5">
            <div className="overflow-hidden rounded-3xl border border-(--gold-bar-border) bg-(--gold-soft-bg)">
              {talent.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- S3 photo, already resized server-side
                <img src={talent.photoUrl} alt={talent.stageName} className="aspect-square w-full object-cover" />
              ) : (
                <span className="flex aspect-square w-full items-center justify-center font-bricolage text-7xl font-bold text-(--gold-icon)">
                  {talent.stageName.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>

            <div className={card}>
              <h2 className="flex items-center gap-2 font-bricolage text-lg font-bold text-(--brand-navy)">
                <Phone className="h-5 w-5 text-(--gold-icon)" />
                Book {talent.stageName}
              </h2>
              <p className="mt-2 font-albert text-sm leading-6 text-(--gray-600)">
                Contact details are shared with verified organizers on Baatasari.
              </p>
              <a
                href={organizerTalentUrl(talent.slug)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-(--brand-navy) px-5 py-3 font-poppins text-sm font-semibold text-white transition hover:opacity-90"
              >
                See contact as an organizer
                <ArrowUpRight className="h-4 w-4" />
              </a>
              <p className="mt-3 text-center font-albert text-xs text-(--gray-500)">
                Not an organizer yet?{" "}
                <a href="https://organizer.baatasari.com/register" className="font-semibold underline">
                  Create a free organizer account
                </a>
              </p>
            </div>
          </aside>

          {/* Right: details */}
          <div className="grid content-start gap-5">
            <section className={card}>
              <p className="font-poppins text-xs font-semibold uppercase tracking-[0.18em] text-(--gold-text)">
                {talent.mainSkill}
              </p>
              <h1 className="mt-1 font-bricolage text-4xl font-bold tracking-tight text-(--brand-navy)">
                {talent.stageName}
              </h1>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-albert text-sm text-(--gray-600)">
                {talent.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-(--gold-icon)" />
                    {talent.location}
                  </span>
                ) : null}
                {talent.experienceLevel ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-(--gold-icon)" />
                    {talent.experienceLevel}
                  </span>
                ) : null}
                {talent.yearsOfExperience ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4 text-(--gold-icon)" />
                    {talent.yearsOfExperience}
                  </span>
                ) : null}
                {price ? <span className="font-semibold text-(--brand-navy)">{price}</span> : null}
              </div>
              {talent.bio ? (
                <p className="mt-5 whitespace-pre-line font-albert text-sm leading-7 text-(--gray-700)">{talent.bio}</p>
              ) : null}
            </section>

            {embeds.length > 0 ? (
              <section className={card}>
                <h2 className="font-bricolage text-lg font-bold text-(--brand-navy)">Videos</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {embeds.map(({ url, embed }) =>
                    embed ? (
                      <div
                        key={url}
                        className={`overflow-hidden rounded-2xl border border-(--gold-bar-border) bg-black ${
                          embed.kind === "instagram" ? "aspect-[4/5]" : "aspect-video"
                        }`}
                      >
                        <iframe
                          src={embed.src}
                          title={`${talent.stageName} — video`}
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="h-full w-full"
                        />
                      </div>
                    ) : (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="flex items-center justify-center rounded-2xl border border-(--gold-bar-border) p-6 font-poppins text-sm font-semibold text-(--brand-navy) underline"
                      >
                        Watch video
                      </a>
                    ),
                  )}
                </div>
              </section>
            ) : null}

            <section className={card}>
              <h2 className="font-bricolage text-lg font-bold text-(--brand-navy)">Availability</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="flex items-center gap-1.5 font-albert text-xs font-semibold uppercase tracking-wide text-(--gray-500)">
                    <CalendarDays className="h-3.5 w-3.5" /> Days
                  </p>
                  <p className="mt-1 font-albert text-sm text-(--brand-navy)">
                    {talent.preferredSlots.join(", ") || "Ask"}
                  </p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 font-albert text-xs font-semibold uppercase tracking-wide text-(--gray-500)">
                    <Tag className="h-3.5 w-3.5" /> Available for
                  </p>
                  <p className="mt-1 font-albert text-sm text-(--brand-navy)">
                    {talent.availableFor.join(", ") || "Ask"}
                  </p>
                </div>
              </div>
            </section>

            {talent.portfolioLinks.length > 0 ? (
              <section className={card}>
                <h2 className="font-bricolage text-lg font-bold text-(--brand-navy)">More of their work</h2>
                <ul className="mt-4 flex flex-wrap gap-3">
                  {talent.portfolioLinks.map((url) => {
                    const Icon = linkIcon(url)
                    return (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-2 rounded-full border border-(--gold-bar-border) px-4 py-2 font-poppins text-sm font-semibold text-(--brand-navy) transition hover:border-(--gold)"
                        >
                          <Icon className="h-4 w-4 text-(--gold-icon)" />
                          {linkLabel(url)}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
