"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { FaInstagram, FaLinkedin } from "react-icons/fa"
import { Clock, MessageSquare } from "lucide-react"
import { PageShell, SectionCard } from "@/components/platform/page-shell"
import { SOCIAL_LINKS } from "@/components/events/footer-social-edit"
import { SiteFooter } from "@/components/site-footer"
import { getMyOpenSupportMessage, sendSupportMessage } from "@/lib/api/support"
import { useAuth } from "@/app/providers"

const RESPONSE_NOTE =
  "Within 24 hours on a working day, our team will contact you to resolve the problem."

const toTenDigits = (value: string | null | undefined) =>
  (value ?? "").replace(/^\+91\s?/, "").replace(/\D/g, "").slice(0, 10)

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  )

function ContactUsPageContent() {
  const { session, profile } = useAuth()
  const searchParams = useSearchParams()
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
  // Arriving from a "Cancel ticket" (or similar) link elsewhere in the app —
  // e.g. /contact-us?problem=... — prefills the request instead of making
  // the buyer retype order/event context that link already knew. A lazy
  // initializer, not an effect: the param is only ever relevant once, at
  // the initial visit.
  const [problem, setProblem] = useState(() => (searchParams.get("problem") ?? "").slice(0, 2000))
  const [error, setError] = useState<string | null>(null)

  // Auto-fill the phone from the profile once onboarding is done. Adjusted
  // during render rather than in an effect so the field is already populated
  // on the first paint; the sync key makes it fire only when the source
  // values actually change, leaving later edits by the user untouched.
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
    onError: (err) => setError(err instanceof Error ? err.message : "Could not send your message."),
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

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"

  return (
    <>
    <PageShell
      eyebrow="Contact us"
      title="Get in Touch"
      description="Reach us at the official email, or raise a request and our team will help you out."
    >
      <SectionCard title="Official Email">
        <a
          href={`mailto:${SOCIAL_LINKS.email}`}
          className="inline-flex rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800 transition"
        >
          {SOCIAL_LINKS.email}
        </a>
      </SectionCard>

      {isLoggedIn ? (
        <SectionCard title="Raise a Request">
          {openQuery.isLoading ? (
            <p className="text-sm text-slate-500">Checking your requests…</p>
          ) : openMessage ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Your request is open.</p>
                  <p className="mt-1">{RESPONSE_NOTE}</p>
                  <p className="mt-1 text-xs text-amber-700">
                    Submitted {formatDate(openMessage.createdAt)}. You can send a new message once this one is
                    resolved by our team.
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
                  placeholder="Describe the issue you're facing…"
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
                {mutation.isPending ? "Sending…" : "Send message"}
              </button>
            </div>
          )}
        </SectionCard>
      ) : null}

      <SectionCard title="Find Us Online">
        <div className="flex flex-wrap items-center gap-4">
          <a
            href={SOCIAL_LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <FaInstagram className="h-4 w-4" />
            Instagram
          </a>
          <a
            href={SOCIAL_LINKS.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <FaLinkedin className="h-4 w-4" />
            LinkedIn
          </a>
        </div>
      </SectionCard>
    </PageShell>
    <SiteFooter />
    </>
  )
}

export default function ContactUsPage() {
  return (
    <Suspense fallback={null}>
      <ContactUsPageContent />
    </Suspense>
  )
}
