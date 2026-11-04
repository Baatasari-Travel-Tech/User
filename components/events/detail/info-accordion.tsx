"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { ChevronDown, CircleHelp, ShieldCheck, Sparkles } from "lucide-react"
import { buildEventFaqs } from "@/lib/event-faqs"
import type { EventDetail } from "@/types/api"

type RowKey = "refund" | "rules" | "faq"

function Row({
  id,
  icon,
  title,
  open,
  onToggle,
  children,
}: {
  id: string
  icon: ReactNode
  title: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div id={id} className="scroll-mt-24 border-b border-(--gray-100) last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-4 text-left"
      >
        <span className="text-(--gold-icon)">{icon}</span>
        <span className="flex-1 text-[15px] font-semibold text-(--brand-navy)">{title}</span>
        <ChevronDown className={`h-4 w-4 text-(--gray-400) transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open ? <div className="pb-5 pl-8 pr-2 text-sm leading-relaxed text-(--gray-600)">{children}</div> : null}
    </div>
  )
}

/**
 * Three collapsible rows under the venue: the refund rules for this event, its
 * rules and guidelines, and the questions people ask, answered from what this
 * event says. "View refund policy" in the ticket card opens the first row.
 */
export function InfoAccordion({ event, guidelines }: { event: EventDetail; guidelines: string[] }) {
  const [open, setOpen] = useState<Record<RowKey, boolean>>({ refund: false, rules: false, faq: false })
  const toggle = (key: RowKey) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }))

  // The link in the ticket card is #refund: open that row when it is followed.
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#refund") setOpen((prev) => ({ ...prev, refund: true }))
    }
    openFromHash()
    window.addEventListener("hashchange", openFromHash)
    return () => window.removeEventListener("hashchange", openFromHash)
  }, [])

  const policy = event.refundPolicy
  const cutoff = policy?.cutoffHours ?? 2
  const minCharge = policy?.minChargePerTicketRupees ?? 10
  const faqs = buildEventFaqs(event)

  return (
    <section className="rounded-3xl bg-white px-5 shadow-[0_24px_60px_-32px_rgba(12,29,55,0.4)] md:px-7">
      <Row
        id="refund"
        icon={<ShieldCheck className="h-5 w-5" aria-hidden />}
        title="Refund & cancellation"
        open={open.refund}
        onToggle={() => toggle("refund")}
      >
        {event.refundable === false ? (
          <p>
            This event is <strong>non-refundable</strong>: a confirmed ticket cannot be cancelled or refunded if you
            change your mind. If the organizer cancels the event, you get a full refund. Your rights under consumer
            protection law are not affected.
          </p>
        ) : (
          <>
            <p>
              Cancel your order while more than {cutoff} hours remain. The ticket price is refunded less a charge:
            </p>
            {policy && policy.tiers.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {policy.tiers.map((tier) => (
                  <li key={tier.label}>
                    {tier.label}: <strong>{tier.chargePct}%</strong>
                  </li>
                ))}
                <li>
                  {cutoff} hours or less before, or after it starts: <strong>no refund</strong>
                </li>
              </ul>
            ) : null}
            <p className="mt-2">
              The charge is never less than ₹{minCharge} per ticket. The platform fee and the payment charge are not
              refunded. If the organizer cancels the event, you get a full refund.
            </p>
          </>
        )}
        <p className="mt-2">
          <Link href="/refund-policy" className="font-semibold text-(--brand-navy) underline underline-offset-2">
            Read the full refund policy
          </Link>
        </p>
      </Row>

      <Row
        id="rules"
        icon={<CircleHelp className="h-5 w-5" aria-hidden />}
        title="Rules & guidelines"
        open={open.rules}
        onToggle={() => toggle("rules")}
      >
        {guidelines.length > 0 ? (
          <ul className="list-disc space-y-1.5 pl-5">
            {guidelines.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>
            The organizer has not listed event-specific rules yet. Carry a valid ID and your ticket QR code, and see our{" "}
            <Link href="/refund-policy" className="font-semibold text-(--brand-navy) underline underline-offset-2">
              refund & cancellation policy
            </Link>{" "}
            for what applies to every booking.
          </p>
        )}
      </Row>

      <Row
        id="faq"
        icon={<Sparkles className="h-5 w-5" aria-hidden />}
        title="Frequently asked questions"
        open={open.faq}
        onToggle={() => toggle("faq")}
      >
        <dl className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q}>
              <dt className="font-semibold text-(--brand-navy)">{faq.q}</dt>
              <dd className="mt-1">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </Row>
    </section>
  )
}
