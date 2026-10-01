"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Clock, Mail, MessageSquare } from "lucide-react"
import { SectionCard } from "@/components/platform/page-shell"
import { SOCIAL_LINKS } from "@/components/events/footer-social-edit"
import { getMyOpenSupportMessage, sendSupportMessage } from "@/lib/api/support"
import { useAuth } from "@/app/providers"

/**
 * "Raise a ticket" — signed-in people only (founder, 2026-10-02); everyone
 * else gets the support email. Used on /help and /contact-us. A ticket lands
 * in the admin app's Support tab, labelled with the site it came from, and
 * notifies the team. One open ticket per person per site.
 */

const RESPONSE_NOTE =
  "Within 24 hours on a working day, our team will contact you to resolve the problem."

const toTenDigits = (value: string | null | undefined) =>
  (value ?? "").replace(/^\+91\s?/, "").replace(/\D/g, "").slice(0, 10)

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  )

const STATUS_TEXT: Record<string, string> = {
  OPEN: "Your ticket is open.",
  ONGOING: "Our team is working on your ticket.",
  WAITING_ON_USER: "We've asked you for more details — please check your email and reply.",
}

export function RaiseTicket({ initialProblem = "" }: { initialProblem?: string }) {
  const { session, profile } = useAuth()
  const isLoggedIn = Boolean(session?.user)
  const onboardingDone = profile?.global_onboarding_completed === true

  const queryClient = useQueryClient()
  const openQuery = useQuery({
    queryKey: ["support-open-message"],
    queryFn: getMyOpenSupportMessage,
    enabled: isLoggedIn,
  })
  const openMessage = openQuery.data ?? null

  const [phone, setPhone] = useState("")
  const [problem, setProblem] = useState(() => initialProblem.slice(0, 2000))
  const [error, setError] = useState<string | null>(null)

  // Auto-fill the phone from the profile, during render rather than in an
  // effect so it's there on the first paint; the key makes it fire only when
  // the source changes, leaving later edits alone.
  const phoneSyncKey = `${onboardingDone}|${profile?.phone ?? ""}`
  const [syncedPhoneKey, setSyncedPhoneKey] = useState(phoneSyncKey)
  if (onboardingDone && phoneSyncKey !== syncedPhoneKey) {
    setSyncedPhoneKey(phoneSyncKey)
    setPhone(toTenDigits(profile?.phone))
  }

  const mutation = useMutation({
    mutationFn: sendSupportMessage,
    onSuccess: () => {
      setProblem("")
      void queryClient.invalidateQueries({ queryKey: ["support-open-message"] })
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not raise your ticket."),
  })

  const handleSend = () => {
    setError(null)
    if (phone.trim().length !== 10) {
      setError("Enter a valid 10-digit phone number.")
      return
    }
    if (problem.trim().length < 5) {
      setError("Please describe your problem in a few words.")
      return
    }
    mutation.mutate({ phone: `+91 ${phone.trim()}`, problem: problem.trim() })
  }

  if (!isLoggedIn) {
    return (
      <SectionCard title="Contact support">
        <p className="text-sm text-slate-600">Email us and we&apos;ll get back to you.</p>
        <a
          href={`mailto:${SOCIAL_LINKS.email}`}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
        >
          <Mail className="h-4 w-4" />
          {SOCIAL_LINKS.email}
        </a>
      </SectionCard>
    )
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"

  return (
    <SectionCard title="Raise a ticket">
      {openQuery.isLoading ? (
        <p className="text-sm text-slate-500">Checking your tickets…</p>
      ) : openMessage ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">{STATUS_TEXT[openMessage.status] ?? STATUS_TEXT.OPEN}</p>
              <p className="mt-1">{RESPONSE_NOTE}</p>
              <p className="mt-1 text-xs text-amber-700">
                Raised {formatDate(openMessage.createdAt)}. You can raise a new ticket once this one is closed.
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your message</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{openMessage.problem}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <MessageSquare className="h-4 w-4" />
            Tell us what&apos;s wrong — we&apos;ll get back to you.
          </p>

          <label className="block text-sm font-semibold text-slate-700">
            Phone number *
            <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-brand-900 focus-within:ring-4 focus-within:ring-brand-900/10">
              <span className="text-sm font-semibold text-slate-500">+91</span>
              <input
                className="ml-2 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                placeholder="10 digit number"
                inputMode="numeric"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>
            {onboardingDone ? (
              <span className="mt-1 block text-xs text-slate-400">Auto-filled from your profile — edit if needed.</span>
            ) : null}
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Problem *
            <textarea
              className={`${inputClass} min-h-28 resize-y`}
              placeholder="Describe the issue — include the event or order if it's about a booking."
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              maxLength={2000}
            />
          </label>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            {RESPONSE_NOTE}
          </p>

          <button
            type="button"
            onClick={handleSend}
            disabled={mutation.isPending}
            className="rounded-full bg-brand-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
          >
            {mutation.isPending ? "Sending…" : "Raise ticket"}
          </button>
        </div>
      )}
    </SectionCard>
  )
}
