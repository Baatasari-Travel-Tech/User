"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { PageShell, SectionCard } from "@/components/platform/page-shell"
import { useAuth } from "@/app/providers"
import { supportMailto } from "@/lib/support-mailto"

// Mirrors Admin-Backend's organizerReview.service.ts (REVIEW_REASON_CODES /
// REASON_LABELS / REASON_TARGETS) — kept in sync by hand since it's a small,
// closed set the admin picks from, not something that changes often.
const REASON_LABELS: Record<string, string> = {
  DOC_UNREADABLE: "Document not readable",
  NAME_MISMATCH: "Name mismatch",
  AGREEMENT_UNSIGNED: "Agreement not signed",
  AGREEMENT_INCOMPLETE: "Agreement incomplete",
  BANK_MISMATCH: "Bank details mismatch",
  GST_INVALID: "GSTIN could not be verified",
  DUPLICATE: "Duplicate account",
  FRAUD: "Verification failed",
  OTHER: "Other",
}

type FixTarget = "documents" | "organization" | "bank"

const REASON_TARGETS: Record<string, FixTarget> = {
  DOC_UNREADABLE: "documents",
  AGREEMENT_UNSIGNED: "documents",
  AGREEMENT_INCOMPLETE: "documents",
  NAME_MISMATCH: "organization",
  GST_INVALID: "organization",
  DUPLICATE: "organization",
  BANK_MISMATCH: "bank",
  FRAUD: "documents",
  OTHER: "documents",
}

const TARGET_HREF: Record<FixTarget, string> = {
  documents: "/organizer/document-upload",
  organization: "/organizer/profile#organization-details",
  bank: "/organizer/profile#bank-details",
}

const TARGET_LABEL: Record<FixTarget, string> = {
  documents: "Update documents",
  organization: "Update organization details",
  bank: "Update bank details",
}

const formatReviewDate = (iso: string | null) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(d)
}

export default function OrganizerPendingPage() {
  const router = useRouter()
  const { user, organizerVerificationStatus, refreshOrganizerStatus, switchRole } = useAuth()
  const [switching, setSwitching] = useState(false)

  const reviewStatus = organizerVerificationStatus // PENDING | CHANGES_REQUESTED | REJECTED here
  const reasonCode = user?.organizerReviewReasonCode ?? null
  const reasonLabel = reasonCode ? (REASON_LABELS[reasonCode] ?? reasonCode) : null
  const target = reasonCode ? (REASON_TARGETS[reasonCode] ?? "documents") : "documents"
  const note = user?.organizerReviewNote ?? null
  const reviewedAt = formatReviewDate(user?.organizerReviewAt ?? null)

  const handleSwitchToUser = () => {
    if (switching) return
    setSwitching(true)
    router.push("/events")
    void switchRole("USER")
  }

  useEffect(() => {
    const id = setInterval(() => { void refreshOrganizerStatus() }, 10_000)
    return () => clearInterval(id)
  }, [refreshOrganizerStatus])

  useEffect(() => {
    if (!user || user.role !== "ORGANIZER") return

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

    if (organizerVerificationStatus === "APPROVED") {
      router.replace("/organizer/dashboard")
    }
  }, [organizerVerificationStatus, router, user])

  const isRejected = reviewStatus === "REJECTED"
  const isChangesRequested = reviewStatus === "CHANGES_REQUESTED"

  const pageTitle = isRejected
    ? "Your organizer application was not approved"
    : isChangesRequested
      ? "We need a few changes before we can approve your account"
      : "Your organizer account is pending review"

  const pageDescription = isRejected
    ? "Our team reviewed your submission and could not approve it this time."
    : isChangesRequested
      ? "Almost there — update the item below and we'll take another look."
      : "All required onboarding steps are complete. Our team is now reviewing your profile and documents."

  return (
    <ProtectedRoute requireOnboarding={false}>
      <PageShell eyebrow="Organizer approval" title={pageTitle} description={pageDescription}>
        <div className="mx-auto w-full max-w-3xl">
          <SectionCard className="border-slate-200 bg-white">
            <div className="grid gap-6">
              {isRejected ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900 sm:px-5">
                  <p className="font-semibold">
                    Status: Not approved{reasonLabel ? ` — ${reasonLabel}` : ""}
                  </p>
                  {note ? <p className="mt-2 text-rose-800">{note}</p> : null}
                  {reviewedAt ? <p className="mt-2 text-xs text-rose-700">Reviewed {reviewedAt}</p> : null}
                </div>
              ) : isChangesRequested ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 sm:px-5">
                  <p className="font-semibold">
                    Status: Changes requested{reasonLabel ? ` — ${reasonLabel}` : ""}
                  </p>
                  {note ? <p className="mt-2 text-amber-800">{note}</p> : null}
                  {reviewedAt ? <p className="mt-2 text-xs text-amber-700">Reviewed {reviewedAt}</p> : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 sm:px-5">
                  Status: Pending manual verification by the onboarding team.
                </div>
              )}

              {!isRejected && !isChangesRequested ? (
                <div className="grid gap-4 text-sm leading-6 text-slate-600">
                  <h2 className="text-lg font-semibold text-slate-950">What happens next</h2>
                  <ol className="list-decimal space-y-2 pl-5">
                    <li>Our team reviews your submitted documents and organizer details.</li>
                    <li>We contact you if any clarification is needed.</li>
                    <li>Your organizer tools unlock automatically once approved.</li>
                  </ol>
                </div>
              ) : null}

              {!isRejected && !isChangesRequested ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600 sm:px-5">
                  Keep PAN, GST, and organization details handy to speed up verification if our team reaches out.
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                {isRejected ? (
                  <a
                    href={supportMailto.organizerReviewAppeal({
                      reason: reasonLabel ?? undefined,
                      note: note ?? undefined,
                    })}
                    className="inline-flex items-center justify-center rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white"
                  >
                    Contact support
                  </a>
                ) : isChangesRequested ? (
                  <Link
                    href={TARGET_HREF[target]}
                    className="inline-flex items-center justify-center rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white"
                  >
                    {TARGET_LABEL[target]}
                  </Link>
                ) : (
                  <Link
                    href="/organizer/profile"
                    className="inline-flex items-center justify-center rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white"
                  >
                    Open organizer profile
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleSwitchToUser}
                  disabled={switching}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Switch to user side
                </button>
              </div>
            </div>
          </SectionCard>
        </div>
      </PageShell>
    </ProtectedRoute>
  )
}
