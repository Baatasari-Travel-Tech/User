"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { PageShell, SectionCard } from "@/components/platform/page-shell"
import { useAuth } from "@/app/providers"
import { apiRequest } from "@/lib/api/client"

const buildSupportHref = (): string => {
  const lines = [
    "I'm stuck on organizer email verification.",
    "",
    "Details: ",
  ]
  return `/contact-us?problem=${encodeURIComponent(lines.join("\n"))}`
}

export default function OrganizerEmailVerificationPage() {
  const router = useRouter()
  const { user, organizerVerificationStatus, refreshOrganizerStatus } = useAuth()
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    const id = setInterval(() => { void refreshOrganizerStatus() }, 10_000)
    return () => clearInterval(id)
  }, [refreshOrganizerStatus])

  const resendVerificationEmail = async () => {
    setResending(true)
    setResendError(null)
    setResendMessage(null)
    try {
      const res = await apiRequest<{ data: { message: string } }>("/auth/resend-verification", {
        method: "POST",
        auth: true,
      })
      setResendMessage(res.data.message)
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "Could not resend the verification email.")
    } finally {
      setResending(false)
    }
  }

  useEffect(() => {
    if (!user || user.role !== "ORGANIZER") return

    if (user.onboardingStatus !== "COMPLETED") {
      router.replace("/organizer/onboarding")
      return
    }

    if (organizerVerificationStatus === "APPROVED") {
      router.replace("/organizer/dashboard")
      return
    }

    if (organizerVerificationStatus === "PENDING") {
      router.replace("/organizer/pending")
      return
    }

    if (organizerVerificationStatus === "DOCUMENTS_REQUIRED" || user.emailVerified) {
      router.replace("/organizer/document-upload")
    }
  }, [organizerVerificationStatus, router, user])

  return (
    <ProtectedRoute requireOnboarding={false}>
      <PageShell
        eyebrow="Organizer verification"
        title="Verify your email to continue"
        description="Finish this step to unlock organizer document upload and move your account into approval review."
      >
        <div className="mx-auto w-full max-w-3xl">
          <SectionCard className="border-slate-200 bg-white">
            <div className="grid gap-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900 sm:px-5">
                A verification link has been sent to your registered email address.
              </div>

              <div className="grid gap-4 text-sm leading-6 text-slate-600">
                <h2 className="text-lg font-semibold text-slate-950">What to do now</h2>
                <ol className="list-decimal space-y-2 pl-5">
                  <li>Open your inbox and click the Baatasari verification link.</li>
                  <li>Return here after verification completes.</li>
                  <li>Continue with PAN and agreement upload.</li>
                </ol>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600 sm:px-5">
                If you cannot find the email, check Spam or Promotions, or resend it below. Links expire after 24 hours.
              </div>

              {resendMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 sm:px-5">
                  {resendMessage}
                </div>
              ) : null}

              {resendError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:px-5">
                  {resendError}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void resendVerificationEmail()}
                  disabled={resending}
                  className="inline-flex w-fit items-center justify-center rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resending ? "Sending…" : "Resend email"}
                </button>
                <Link
                  href={buildSupportHref()}
                  className="inline-flex w-fit items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Support
                </Link>
              </div>
            </div>
          </SectionCard>
        </div>
      </PageShell>
    </ProtectedRoute>
  )
}
