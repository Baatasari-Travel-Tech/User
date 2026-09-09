"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/app/providers"
import LoadingScreen from "@/components/loading-screen"

type ProtectedRouteProps = {
  children: React.ReactNode
  requireOnboarding?: boolean
  requireOrganizer?: boolean
  requireTalentPaid?: boolean
  allowPendingOrganizer?: boolean
}

export function ProtectedRoute({
  children,
  requireOnboarding = true,
  requireOrganizer = false,
  requireTalentPaid = false,
  allowPendingOrganizer = false,
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoading, hasHydrated, session, user, activeRole, organizerVerificationStatus, profile, talentProfile } = useAuth()

  useEffect(() => {
    // Don't act until the cached identity is loaded and a revalidation pass has
    // settled — otherwise we'd redirect on a momentarily-empty session.
    if (!hasHydrated || isLoading) return

    if (!session?.user || !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    const hasCompletedOnboarding = profile?.global_onboarding_completed === true

    if (requireOrganizer) {
      if (user.role !== "ORGANIZER" || activeRole !== "EVENT_ORGANIZER") {
        router.replace("/403")
        return
      }

      if (!hasCompletedOnboarding) {
        router.replace("/organizer/onboarding")
        return
      }

      if (organizerVerificationStatus === "EMAIL_NOT_VERIFIED") {
        router.replace("/organizer/email-verification")
        return
      }

      if (organizerVerificationStatus === "DOCUMENTS_REQUIRED") {
        router.replace("/organizer/document-upload")
        return
      }

      if (organizerVerificationStatus !== "APPROVED" && !allowPendingOrganizer) {
        router.replace("/organizer/pending")
        return
      }
    } else if (requireOnboarding && !hasCompletedOnboarding) {
      router.replace(user.role === "ORGANIZER" ? "/organizer/onboarding" : "/onboarding")
      return
    }

    if (requireTalentPaid && talentProfile?.paymentStatus !== "PAID") {
      router.replace("/talent/onboarding")
    }
  }, [
    activeRole,
    hasHydrated,
    isLoading,
    organizerVerificationStatus,
    pathname,
    profile?.global_onboarding_completed,
    allowPendingOrganizer,
    requireOnboarding,
    requireOrganizer,
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
