import type { Metadata } from "next"
import Link from "next/link"
import { PageShell, SectionCard } from "@/components/platform/page-shell"
import { SiteFooter } from "@/components/site-footer"
import { RaiseTicket } from "@/components/support/raise-ticket"

/**
 * Help centre — the FAQs for people buying tickets on baatasari.com, then
 * "Raise a ticket" (signed in) or the support email (signed out).
 *
 * Every answer states how the product works today or points at the policy
 * page that governs it; nothing promises timelines or features that don't
 * exist. Keep it in step with /refund-policy.
 */

export const metadata: Metadata = {
  title: "Help",
  description: "Answers about booking tickets, payments, refunds and your Baatasari account.",
  alternates: { canonical: "/help" },
}

type Faq = { q: string; a: React.ReactNode }

const link = (href: string, label: string) => (
  <Link href={href} className="font-semibold text-brand-900 underline underline-offset-4">
    {label}
  </Link>
)

const SECTIONS: { title: string; faqs: Faq[] }[] = [
  {
    title: "Booking tickets",
    faqs: [
      {
        q: "How do I book tickets?",
        a: <>Find an event under {link("/events", "Events")}, pick your tickets and pay. Your tickets are issued the moment the payment is confirmed.</>,
      },
      {
        q: "Where are my tickets?",
        a: <>In {link("/history", "My tickets")}. Each ticket has its own QR code — show it at the entrance. Keep it private: the first valid scan is the one that gets in.</>,
      },
      {
        q: "Can I change the date, tier or number of tickets?",
        a: <>Confirmed tickets can&apos;t be changed or exchanged. Check the details on the checkout page before you pay.</>,
      },
      {
        q: "Where's my invoice?",
        a: <>Open the booking in {link("/history", "My tickets")} and choose Invoice. You can print it or save it as a PDF from your browser.</>,
      },
    ],
  },
  {
    title: "Payments & refunds",
    faqs: [
      {
        q: "How can I pay?",
        a: <>Through our payment partner Cashfree — UPI, cards, net banking and the other options it shows at checkout.</>,
      },
      {
        q: "Money left my account but I didn't get a ticket",
        a: <>Every payment is checked before a ticket is issued. If the money was taken but no ticket could be issued, the full amount is refunded to where it came from — see {link("/refund-policy#payment-issues", "the refund policy")}. If you were charged twice, the extra payment is refunded in full too.</>,
      },
      {
        q: "Can I cancel my booking and get a refund?",
        a: <>Confirmed tickets are final — change of mind or not being able to attend aren&apos;t refunded. You are refunded if the event is cancelled. The full rules are in {link("/refund-policy", "the refund policy")}.</>,
      },
      {
        q: "The event was cancelled or postponed",
        a: <>If it&apos;s cancelled, your refund is started without you asking. If it&apos;s moved to a new date, your ticket normally stays valid; if you can&apos;t make the new date, raise a ticket and we&apos;ll take it up with the organizer.</>,
      },
      {
        q: "How long does a refund take?",
        a: <>Once a refund is processed it usually reaches your account in 5–7 working days, depending on your bank. You can see its status against the booking.</>,
      },
    ],
  },
  {
    title: "Your account",
    faqs: [
      {
        q: "I forgot my password",
        a: <>Choose &ldquo;Forgot password&rdquo; on the sign-in screen and we&apos;ll email you a link to set a new one.</>,
      },
      {
        q: "How do I keep my account safe?",
        a: <>Turn on two-step verification in your {link("/profile", "profile")}, under security. You&apos;ll then need a code from your authenticator app to sign in.</>,
      },
      {
        q: "How do I delete my account?",
        a: <>From your {link("/profile", "profile")}. We email you a code to confirm it&apos;s you. What we keep and why is in {link("/privacy-policy", "the privacy policy")}.</>,
      },
    ],
  },
  {
    title: "Talent, organizers & venues",
    faqs: [
      {
        q: "How do I list myself as a performer?",
        a: <>From {link("/talent", "Talent")}: create your profile and pay ₹299 once — it&apos;s a lifetime listing. You&apos;re live in the {link("/talent/browse", "talent directory")} straight away and can edit your profile any time.</>,
      },
      {
        q: "I want to host an event",
        a: <>Organizers use <a href="https://organizer.baatasari.com" className="font-semibold text-brand-900 underline underline-offset-4">organizer.baatasari.com</a> — sign up there, get approved, then publish your events.</>,
      },
      {
        q: "I own a venue",
        a: <>Venues list on <a href="https://venue.baatasari.com" className="font-semibold text-brand-900 underline underline-offset-4">venue.baatasari.com</a>.</>,
      },
    ],
  },
]

export default function HelpPage() {
  return (
    <>
      <PageShell
        eyebrow="Help centre"
        title="How can we help?"
        description="Answers to the questions we get most. Can't find yours? Raise a ticket below."
      >
        {SECTIONS.map((section) => (
          <SectionCard key={section.title} title={section.title}>
            <ul className="divide-y divide-slate-100">
              {section.faqs.map(({ q, a }) => (
                <li key={q}>
                  {/* <details>: opens, closes, takes focus and is announced
                      correctly with no JavaScript. */}
                  <details className="group py-1">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                      {q}
                      <span
                        aria-hidden
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="pb-4 text-sm leading-6 text-slate-600">{a}</p>
                  </details>
                </li>
              ))}
            </ul>
          </SectionCard>
        ))}

        <RaiseTicket />
      </PageShell>
      <SiteFooter />
    </>
  )
}
