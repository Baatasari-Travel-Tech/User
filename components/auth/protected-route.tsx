"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/app/providers"
import LoadingScreen from "@/components/loading-screen"

type ProtectedRouteProps = {
  children: React.ReactNode
  requireOnboarding?: boolean
  requireTalentPaid?: boolean
}

// Signed-in-only pages of baatasari.com. (The organizer checks that used to
// live here went with the legacy organizer screens — organizers use
// organizer.baatasari.com, which has its own RequireOrganizer gate.)
export function ProtectedRoute({
  children,
  requireOnboarding = true,
  requireTalentPaid = false,
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading, hasHydrated, session, user, profile, talentProfile } = useAuth()

  useEffect(() => {
    // Don't act until the cached identity is loaded and a revalidation pass has
    // settled — otherwise we'd redirect on a momentarily-empty session.
    if (!hasHydrated || isLoading) return

    if (!session?.user || !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    if (requireOnboarding && profile?.global_onboarding_completed !== true) {
      router.replace("/onboarding")
      return
    }

    if (requireTalentPaid && talentProfile?.paymentStatus !== "PAID") {
      router.replace("/talent/onboarding")
    }
  }, [
    hasHydrated,
    isLoading,
    pathname,
    profile?.global_onboarding_completed,
    requireOnboarding,
    requireTalentPaid,
    router,
    session?.user,
    talentProfile?.paymentStatus,
    user,
  ])

  // Before hydration both server and client render the loader (no mismatch).
  // Once hydrated, a cached user renders immediately — the session revalidates
  // in the background. Only a genuinely empty session keeps the loader (the
  // effect above redirects it to /login).
  if (!hasHydrated || !session?.user || !user) {
    return <LoadingScreen />
  }

  return <>{children}</>
}
