"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { PageShell, SectionCard } from "@/components/platform/page-shell"
import InlineSpinner from "@/components/ui/inline-spinner"
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

  const [otp, setOtp] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)

  // A code is already on its way by the time this page can be reached —
  // organizer.service.ts's completeOnboarding fires one the moment
  // onboarding completes, server-side, before this page ever mounts. No
  // auto-send here on top of that: it would just land a second code in
  // their inbox seconds after the first. "Resend code" (same endpoint) is
  // what a visitor who returns after the 10-minute window, or never got the
  // first one, uses to get a fresh one.
  const handleVerify = async () => {
    if (!/^\d{6}$/.test(otp)) return

    setVerifying(true)
    setVerifyError(null)
    try {
      await apiRequest("/auth/verify-email-otp", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ otp }),
      })
      // Pulls the fresh emailVerified:true from the server — the gate
      // effect below reacts to organizerVerificationStatus changing and
      // sends this page on to /organizer/document-upload itself.
      await refreshOrganizerStatus()
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Invalid or expired code. Please try again.")
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setResendError(null)
    setResendMessage(null)
    try {
      const res = await apiRequest<{ data: { message: string; alreadyVerified: boolean } }>(
        "/auth/send-verification-otp",
        {
          method: "POST",
          auth: true,
        },
      )
      setResendMessage(res.data.message)
      // Only reachable if this page's own copy of `user` is stale (verified
      // in another tab, say) — refresh so the gate effect below notices and
      // moves on instead of leaving a "resend" button up for nothing left
      // to resend.
      if (res.data.alreadyVerified) {
        await refreshOrganizerStatus()
      }
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "Could not send a verification code.")
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
                We sent a 6-digit code to your registered email address.
              </div>

              <div className="grid gap-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Verification code
                  <input
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-lg tracking-[0.4em] text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    autoComplete="one-time-code"
                    placeholder="000000"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    onKeyDown={e => e.key === "Enter" && void handleVerify()}
                    autoFocus
                  />
                </label>

                {verifyError ? (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">
                    {verifyError}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => void handleVerify()}
                  disabled={verifying || !/^\d{6}$/.test(otp)}
                  className="flex w-fit items-center justify-center gap-2 rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verifying && <InlineSpinner />}
                  <span>{verifying ? "Verifying…" : "Verify email"}</span>
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600 sm:px-5">
                If you cannot find the email, check Spam or Promotions, or resend it below. Codes expire after 10 minutes.
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
                  onClick={() => void handleResend()}
                  disabled={resending}
                  className="inline-flex w-fit items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resending ? "Sending…" : "Resend code"}
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
