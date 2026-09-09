import type { Metadata } from "next"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description:
    "Baatasari's refund and cancellation policy for event tickets — when refunds apply, how they are processed, timelines, and how to raise a request.",
  alternates: { canonical: "/refund-policy" },
}

const SECTIONS = [
  ["overview", "1. Overview"],
  ["general-rule", "2. General Rule: Confirmed Tickets are Final"],
  ["event-cancelled", "3. If an Event is Cancelled"],
  ["rescheduled", "4. If an Event is Postponed or Rescheduled"],
  ["entry-refused", "5. Denied Entry & Ejection"],
  ["payment-issues", "6. Failed, Duplicate & Stuck Payments"],
  ["fees", "7. Fees & Gateway Charges"],
  ["processing", "8. How Refunds are Processed"],
  ["how-to-request", "9. How to Request a Refund"],
  ["chargebacks", "10. Chargebacks"],
  ["organizer-terms", "11. Organizer-Specific Terms"],
  ["changes", "12. Changes to this Policy"],
] as const

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-2 mt-10 scroll-mt-24 text-xl font-semibold text-slate-900">
      {children}
    </h2>
  )
}

export default function RefundPolicy() {
  return (
    <>
    <div className="mx-auto max-w-5xl px-6 py-10 text-gray-800">
      <h1 className="mb-2 text-3xl font-bold">Refund &amp; Cancellation Policy</h1>
      <p className="mb-8 text-sm text-gray-500">
        Effective date: 7 July 2026 · Please read this policy before booking. By completing a
        booking you agree to it. It forms part of our{" "}
        <a className="text-blue-600 hover:underline" href="/terms-and-conditions">
          Terms &amp; Conditions
        </a>
        .
      </p>

      <nav className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Contents
        </p>
        <ol className="grid gap-1.5 text-sm sm:grid-cols-2">
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <a className="text-blue-700 hover:underline" href={`#${id}`}>
                {label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <H2 id="overview">1. Overview</H2>
      <p className="mb-4">
        Baatasari is a ticketing platform; events are conducted by their Organizers. This policy
        explains when a refund is due, who bears which cost, how refunds are processed, and how to
        raise a request. In short: <strong>confirmed tickets are final</strong>, but you are
        protected when the event itself is cancelled or when a payment goes wrong on our side.
      </p>

      <H2 id="general-rule">2. General Rule: Confirmed Tickets are Final</H2>
      <p className="mb-4">
        Event tickets purchased on Baatasari are <strong>non-refundable and
        non-exchangeable</strong> once the booking is confirmed. In particular, we do not provide
        refunds for:
      </p>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>change of mind or booking errors on your part (wrong date, tier, or quantity);</li>
        <li>inability to attend, late arrival, or no-show;</li>
        <li>partial use of a multi-person or multi-entry ticket;</li>
        <li>
          dissatisfaction with the event experience — quality complaints should be raised with the
          Organizer, whose event it is (we will assist via the grievance process where we can);
        </li>
        <li>weather or other conditions where the event still takes place as listed.</li>
      </ul>

      <H2 id="event-cancelled">3. If an Event is Cancelled</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          If an event is <strong>cancelled by the Organizer or by Baatasari</strong>, you are
          entitled to a refund of the ticket amount for all unused tickets on your order.
        </li>
        <li>
          Refunds for cancelled events are initiated without you needing to ask, and are also
          confirmed via the grievance channel if you contact us.
        </li>
        <li>
          Cancelled events stop selling immediately, and their tickets are voided (a voided ticket
          will not scan at any venue).
        </li>
      </ul>

      <H2 id="rescheduled">4. If an Event is Postponed or Rescheduled</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          If an event is rescheduled, your ticket normally remains valid for the new date — no
          action is needed.
        </li>
        <li>
          If you cannot attend the new date, any refund is at the discretion of the Organizer and
          subject to that event&rsquo;s specific terms. Raise a request via Section 9 and we will
          coordinate with the Organizer.
        </li>
        <li>
          If a rescheduled event is subsequently cancelled, Section 3 applies.
        </li>
      </ul>

      <H2 id="entry-refused">5. Denied Entry &amp; Ejection</H2>
      <p className="mb-4">
        No refund is due where entry is refused or a person is removed for lawful reasons — for
        example failing an event&rsquo;s stated age restriction, violating venue rules, arriving
        after gates close, presenting a ticket that has already been used, or presenting a QR code
        that fails validation because it was shared or tampered with. Keep your ticket QR private:
        the first valid scan is admitted.
      </p>

      <H2 id="payment-issues">6. Failed, Duplicate &amp; Stuck Payments</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          <strong>Money debited, no ticket:</strong> every payment is verified before a ticket is
          issued. If your payment was captured but a ticket could not be issued (for example, your
          seat reservation expired before payment completed and the seat was no longer available),
          the order is flagged on our side and <strong>refunded in full</strong> to the original
          payment method.
        </li>
        <li>
          <strong>Duplicate charge:</strong> if the same order is charged more than once, the
          duplicate capture is refunded in full.
        </li>
        <li>
          <strong>Failed payments:</strong> if a payment fails, no ticket is issued and any amount
          shown as debited is automatically reversed by your bank/gateway per their timelines
          (typically 5–7 working days). If it is not, contact us via Section 9.
        </li>
      </ul>

      <H2 id="fees">7. Fees &amp; Gateway Charges</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          <strong>Event cancelled:</strong> you receive a <strong>partial refund</strong> — the
          ticket amount minus the payment-gateway charge and the platform fee. Both are
          non-refundable costs (charged by our payment processor and by Baatasari respectively)
          and are retained from the refund.
        </li>
        <li>
          <strong>Where an Organizer permits a discretionary cancellation</strong> (Section 11),
          the same gateway charge and platform fee are retained, along with any additional
          cancellation charge the Organizer applies.
        </li>
        <li>
          Refund amounts and any retained components are shown against your order in your booking
          history.
        </li>
      </ul>

      <H2 id="processing">8. How Refunds are Processed</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          Refunds are processed to the <strong>original payment method only</strong> — we cannot
          redirect a refund to a different card, UPI ID, or bank account.
        </li>
        <li>
          Eligible refunds are processed <strong>manually by our team</strong>, typically within{" "}
          <strong>5–7 working days</strong> of the refund being confirmed. Your bank or payment
          provider may take additional time to reflect the credit.
        </li>
        <li>
          Once a refund is processed you will see its status against the order in your booking
          history; the associated tickets are voided at that point.
        </li>
        <li>Refunds are always made in INR, the currency of the original transaction.</li>
      </ul>

      <H2 id="how-to-request">9. How to Request a Refund</H2>
      <p className="mb-4">
        For any refund that falls within this policy, email our Grievance Officer at{" "}
        <a className="text-blue-600 hover:underline" href="mailto:grievance@baatasari.com">
          grievance@baatasari.com
        </a>{" "}
        with your <strong>order number</strong>, the <strong>event name</strong>, and the{" "}
        <strong>reason</strong>. We acknowledge within <strong>48 hours</strong> and resolve
        within the timelines published on our{" "}
        <a className="text-blue-600 hover:underline" href="/grievance">
          Grievance Redressal
        </a>{" "}
        page. Including a payment reference (from your confirmation email or booking history)
        speeds things up.
      </p>

      <H2 id="chargebacks">10. Chargebacks</H2>
      <p className="mb-4">
        If you dispute a charge with your bank without first raising it with us, the resolution
        may take significantly longer than the process above, and tickets associated with a
        disputed payment are suspended while the dispute is open. Please contact us first — most
        payment issues in Section 6 are resolved directly and faster.
      </p>

      <H2 id="organizer-terms">11. Organizer-Specific Terms</H2>
      <p className="mb-4">
        Individual events may carry additional terms set by their Organizer (for example, a
        discretionary cancellation window before the event). Where such terms exist they are shown
        on the event page or communicated by the Organizer, and apply in addition to — but never
        below the protections of — this policy.
      </p>

      <H2 id="changes">12. Changes to this Policy</H2>
      <p className="mb-4">
        We may update this policy from time to time; the effective date above reflects the latest
        version. The policy in force at the time of your booking applies to that booking.
      </p>

      <p className="mt-10 text-sm text-gray-500">Last updated: 7 July 2026</p>
    </div>
    <SiteFooter />
    </>
  )
}
