"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { X } from "lucide-react"
import { useAuth } from "@/app/providers"

// Where it shows: the dashboard (/dashboard redirects to the events list). Not
// on checkout, a ticket, or anywhere else, so it never gets in the way of paying.
const SHOWN_ON = ["/events", "/dashboard"]

const KEY = "baatasari-complete-profile-dismissed"

/**
 * A slim strip under the header, on the dashboard, for someone who signed up
 * from an event page (straight to checkout and their ticket, no onboarding) and
 * has not filled in their profile yet. Someone who registers the normal way goes
 * through onboarding, so never sees it. "Dismiss" hides it for the rest of the visit.
 */
export function CompleteProfileBanner() {
  const pathname = usePathname() ?? ""
  const { session, user } = useAuth()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window !== "undefined" && window.sessionStorage.getItem(KEY) === "1"
    } catch {
      return false
    }
  })

  if (dismissed) return null
  if (!session?.user || !user || user.onboardingStatus === "COMPLETED") return null
  if (!SHOWN_ON.includes(pathname)) return null

  return (
    <div role="region" aria-label="Complete your profile" className="border-b border-(--gold-soft-border) bg-(--gold-bar-bg)">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-4 py-2.5 md:px-6 lg:px-10">
        <p className="min-w-0 flex-1 text-sm text-(--brand-navy)">
          <span className="font-semibold">Complete your profile</span>
          <span className="hidden text-(--gray-600) sm:inline"> to get events picked for you and book faster next time.</span>
        </p>
        <Link
          href="/onboarding"
          className="shrink-0 rounded-full bg-(--brand-navy) px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-(--brand-navy)/90"
        >
          Complete profile
        </Link>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            try {
              window.sessionStorage.setItem(KEY, "1")
            } catch {
              /* private mode: it just comes back on the next page load */
            }
            setDismissed(true)
          }}
          className="shrink-0 rounded-full p-1.5 text-(--gray-500) hover:bg-white/60"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
