"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Clock, Mail, MessageSquare } from "lucide-react"
import { SectionCard } from "@/components/platform/page-shell"
import { SOCIAL_LINKS } from "@/components/events/footer-social-edit"
import { getMyOpenSupportMessage, sendSupportMessage } from "@/lib/api/support"
import { useAuth } from "@/app/providers"

/**
 * "Raise a ticket" — signed-in people only; signed out, the support email.
 * Used on /help (beside the FAQs) and /contact-us. The ticket reaches the
 * admin app's Support tab labelled "User", with its category, and notifies
 * the team. One open ticket per person per site.
 *
 * Same form on all three sites (founder, 2026-10-02): name and email fixed
 * from the account, phone, a category from this site's list (with Other),
 * and a description. Only the category list differs per site.
 */

export const TICKET_CATEGORIES = [
  "Booking or tickets",
  "Payment or refund",
  "An event I attended",
  "Account or sign-in",
  "Talent profile",
  "Something else",
] as const

const OTHER = "Something else"

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

const input =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
const fixed = "mt-2 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-600"

export function RaiseTicket({ initialProblem = "", className }: { initialProblem?: string; className?: string }) {
  const { session, user, profile } = useAuth()
  const isLoggedIn = Boolean(session?.user)
  const accountName = profile?.full_name?.trim() ?? ""

  const queryClient = useQueryClient()
  const openQuery = useQuery({
    queryKey: ["support-open-message"],
    queryFn: getMyOpenSupportMessage,
    enabled: isLoggedIn,
  })
  const openMessage = openQuery.data ?? null

  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [category, setCategory] = useState("")
  const [otherCategory, setOtherCategory] = useState("")
  const [problem, setProblem] = useState(() => initialProblem.slice(0, 2000))
  const [error, setError] = useState<string | null>(null)

  // Phone from the profile, filled in during render (no flicker) and only
  // when the saved value changes, so later edits stay.
  const phoneSyncKey = profile?.phone ?? ""
  const [syncedPhoneKey, setSyncedPhoneKey] = useState("")
  if (phoneSyncKey && phoneSyncKey !== syncedPhoneKey) {
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
    const finalName = accountName || name.trim()
    if (!finalName) return setError("Enter your name.")
    if (phone.trim().length !== 10) return setError("Enter a valid 10-digit phone number.")
    if (!category) return setError("Choose what it's about.")
    if (category === OTHER && !otherCategory.trim()) return setError("Tell us what it's about.")
    if (problem.trim().length < 5) return setError("Please describe your problem in a few words.")
    mutation.mutate({
      phone: `+91 ${phone.trim()}`,
      problem: problem.trim(),
      category: category === OTHER ? `Other: ${otherCategory.trim()}` : category,
      name: finalName,
    })
  }

  if (!isLoggedIn) {
    return (
      <SectionCard title="Raise a ticket" className={className}>
        <p className="text-sm leading-6 text-slate-600">
          Sign in to raise a ticket and track it. Or email us — we&apos;ll get back to you.
        </p>
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

  return (
    <SectionCard title="Raise a ticket" className={className}>
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
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {openMessage.category ?? "Your message"}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{openMessage.problem}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <MessageSquare className="h-4 w-4" />
            Tell us what&apos;s wrong — we&apos;ll get back to you.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Name
              {accountName ? (
                <div className={fixed}>{accountName}</div>
              ) : (
                <input className={input} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              )}
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Email
              <div className={`${fixed} truncate`}>{user?.email ?? ""}</div>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Category *
              <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Choose one</option>
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {category === OTHER ? (
            <label className="block text-sm font-semibold text-slate-700">
              What&apos;s it about? *
              <input
                className={input}
                maxLength={60}
                placeholder="A few words"
                value={otherCategory}
                onChange={(e) => setOtherCategory(e.target.value)}
              />
            </label>
          ) : null}

          <label className="block text-sm font-semibold text-slate-700">
            Description *
            <textarea
              className={`${input} min-h-32 resize-y`}
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
            className="w-full rounded-full bg-brand-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60 sm:w-auto"
          >
            {mutation.isPending ? "Sending…" : "Raise ticket"}
          </button>
        </div>
      )}
    </SectionCard>
  )
}
