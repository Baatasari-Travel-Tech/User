"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Eye,
  MapPin,
  MessageCircle,
  PenLine,
  Phone,
  Sparkles,
} from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { SkeletonGrid, StateBlock } from "@/components/platform/state-block"
import { apiRequest } from "@/lib/api/client"
import { formatPrice, TALENT_FEE } from "@/lib/talent"
import type { TalentProfile } from "@/types/api"

type TalentDashboardResponse = {
  profile: TalentProfile
  stats: { activeStatus: string; totalBookings: number }
}

const card =
  "rounded-3xl border border-(--gold-bar-border) bg-white/90 p-5 shadow-[0_18px_50px_-32px_rgba(12,29,55,0.4)] sm:p-7"

export default function TalentDashboardPage() {
  const query = useQuery({
    queryKey: ["talent-dashboard"],
    queryFn: async () => {
      const response = await apiRequest<{ data: TalentDashboardResponse }>("/talent/dashboard", { auth: true })
      return response.data
    },
  })

  return (
    <ProtectedRoute requireTalentPaid>
      <main className="min-h-[calc(100dvh-72px)] bg-(--background) px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-5xl">
          {query.isLoading ? (
            <SkeletonGrid />
          ) : query.isError || !query.data ? (
            <StateBlock tone="error" title="Couldn't load your talent profile" description="Please refresh the page in a moment." />
          ) : (
            <Dashboard profile={query.data.profile} />
          )}
        </div>
      </main>
    </ProtectedRoute>
  )
}

function Dashboard({ profile }: { profile: TalentProfile }) {
  const [copied, setCopied] = useState(false)
  const publicPath = profile.slug ? `/talent/p/${profile.slug}` : null
  const publicUrl = publicPath ? `https://baatasari.com${publicPath}` : null
  const price = formatPrice(profile.expectedPriceBand)

  const copy = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — the link is visible to copy by hand */
    }
  }

  return (
    <div className="grid gap-5">
      {/* Header */}
      <section className={card}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-(--gold-soft-bg)">
            {profile.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- S3 photo
              <img src={profile.photoUrl} alt={profile.stageName ?? "Your photo"} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-bricolage text-3xl font-bold text-(--gold-icon)">
                {(profile.stageName ?? "?").slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-poppins text-xs font-semibold uppercase tracking-[0.18em] text-(--gold-text)">
              Talent dashboard
            </p>
            <h1 className="mt-1 truncate font-bricolage text-3xl font-bold text-(--brand-navy)">
              {profile.stageName ?? "Your profile"}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-albert text-sm text-(--gray-600)">
              {profile.mainSkill ? <span>{profile.mainSkill}</span> : null}
              {profile.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-(--gold-icon)" />
                  {profile.location}
                </span>
              ) : null}
              {price ? <span>{price}</span> : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {publicPath && profile.isListed ? (
              <Link
                href={publicPath}
                className="inline-flex items-center gap-2 rounded-full bg-(--brand-navy) px-5 py-2.5 font-poppins text-sm font-semibold text-white transition hover:opacity-90"
              >
                <Eye className="h-4 w-4" />
                View public profile
              </Link>
            ) : null}
            <Link
              href="/talent/onboarding"
              className="inline-flex items-center gap-2 rounded-full border border-(--gold-bar-border) px-5 py-2.5 font-poppins text-sm font-semibold text-(--brand-navy) transition hover:border-(--gold)"
            >
              <PenLine className="h-4 w-4" />
              Edit profile
            </Link>
          </div>
        </div>
      </section>

      {/* Status */}
      {profile.hiddenAt ? (
        <section className="flex items-start gap-3 rounded-3xl border border-rose-200 bg-rose-50 p-5 sm:p-6">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <h2 className="font-bricolage text-lg font-bold text-rose-800">Your profile is hidden</h2>
            <p className="mt-1 font-albert text-sm text-rose-700">
              Our team has taken it off the talent directory
              {profile.hiddenReason ? `: ${profile.hiddenReason}` : "."} Fix it with “Edit profile”, then
              write to us and we&apos;ll take another look.
            </p>
          </div>
        </section>
      ) : (
        <section className="flex items-start gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="min-w-0">
            <h2 className="font-bricolage text-lg font-bold text-emerald-900">You&apos;re live</h2>
            <p className="mt-1 font-albert text-sm text-emerald-800">
              Anyone can find you in the Baatasari talent directory, and verified organizers can contact you.
            </p>
            {publicUrl ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="max-w-full truncate rounded-lg bg-white px-3 py-1.5 font-mono text-xs text-(--brand-navy)">
                  {publicUrl}
                </code>
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-3 py-1.5 font-poppins text-xs font-semibold text-emerald-800"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
            ) : null}
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={card}>
          <h2 className="flex items-center gap-2 font-bricolage text-lg font-bold text-(--brand-navy)">
            <Phone className="h-5 w-5 text-(--gold-icon)" />
            How organizers reach you
          </h2>
          <p className="mt-3 font-albert text-sm leading-6 text-(--gray-600)">
            Verified organizers on Baatasari see your number
            {profile.contactPhone ? <strong className="text-(--brand-navy)"> {profile.contactPhone}</strong> : null} and
            can message you on WhatsApp. It is never shown on your public page.
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-(--gold-soft-bg) px-3 py-1 font-albert text-xs text-(--gold-text)">
            <MessageCircle className="h-3.5 w-3.5" />
            Booking requests inside Baatasari are coming soon
          </p>
        </section>

        <section className={card}>
          <h2 className="flex items-center gap-2 font-bricolage text-lg font-bold text-(--brand-navy)">
            <Sparkles className="h-5 w-5 text-(--gold-icon)" />
            Your listing
          </h2>
          <dl className="mt-3 grid gap-2 font-albert text-sm text-(--gray-600)">
            <div className="flex justify-between gap-3">
              <dt>Plan</dt>
              <dd className="font-semibold text-(--brand-navy)">₹{TALENT_FEE} lifetime — nothing to renew</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Paid on</dt>
              <dd className="font-semibold text-(--brand-navy)">
                {profile.paidAt ? new Date(profile.paidAt).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Videos on your profile</dt>
              <dd className="font-semibold text-(--brand-navy)">{profile.videoLinks.length}</dd>
            </div>
          </dl>
          <Link
            href="/talent/browse"
            className="mt-4 inline-flex items-center gap-1 font-poppins text-sm font-semibold text-(--brand-navy) underline-offset-4 hover:underline"
          >
            See the talent directory
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  )
}
