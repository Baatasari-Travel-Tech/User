"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/providers"

export default function OrganizerIndexPage() {
  const router = useRouter()
  const { user, organizerVerificationStatus } = useAuth()

  useEffect(() => {
    if (!user) {
      router.replace("/login?redirect=/organizer")
      return
    }

    if (user.role !== "ORGANIZER") {
      router.replace("/403")
      return
    }

    if (user.onboardingStatus !== "COMPLETED") {
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

    router.replace(organizerVerificationStatus === "APPROVED" ? "/organizer/dashboard" : "/organizer/pending")
  }, [organizerVerificationStatus, router, user])

  return null
}
