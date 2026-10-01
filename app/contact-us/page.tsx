"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { FaInstagram, FaLinkedin } from "react-icons/fa"
import { PageShell, SectionCard } from "@/components/platform/page-shell"
import { SOCIAL_LINKS } from "@/components/events/footer-social-edit"
import { SiteFooter } from "@/components/site-footer"
import { RaiseTicket } from "@/components/support/raise-ticket"
import { useAuth } from "@/app/providers"

function ContactUsPageContent() {
  const { session } = useAuth()
  const searchParams = useSearchParams()
  const isLoggedIn = Boolean(session?.user)

  return (
    <>
    <PageShell
      eyebrow="Contact us"
      title="Get in Touch"
      description="Reach us at the official email, or — signed in — raise a ticket and our team will help you out."
    >
      {/* Signed out, the ticket card IS the email card. */}
      {isLoggedIn ? (
        <SectionCard title="Official Email">
          <a
            href={`mailto:${SOCIAL_LINKS.email}`}
            className="inline-flex rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800 transition"
          >
            {SOCIAL_LINKS.email}
          </a>
        </SectionCard>
      ) : null}

      {/* Arriving from a "Cancel ticket" (or similar) link elsewhere —
          /contact-us?problem=... — prefills the ticket. */}
      <RaiseTicket initialProblem={searchParams.get("problem") ?? ""} />

      <SectionCard title="Common questions">
        <p className="text-sm text-slate-600">
          Bookings, refunds, payments and your account —{" "}
          <Link href="/help" className="font-semibold text-brand-900 underline underline-offset-4">
            see the Help centre
          </Link>
          .
        </p>
      </SectionCard>

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
