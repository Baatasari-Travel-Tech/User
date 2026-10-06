import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "When Baatasari tickets and fees are refunded, what you get back, how refunds are paid, and how to ask.",
  alternates: { canonical: "/refund-policy" },
}

const SECTIONS = [
  ["overview", "Overview"],
  ["event-cancelled", "If an event is cancelled"],
  ["rescheduled", "If an event is postponed or rescheduled"],
  ["your-cancellation", "If you want to cancel a confirmed ticket"],
  ["entry-refused", "If you are refused entry"],
  ["payment-issues", "If a payment goes wrong"],
  ["talent-fee", "Talent registration fee"],
  ["processing", "How refunds are made"],
  ["how-to-request", "How to ask for a refund"],
  ["chargebacks", "Chargebacks"],
  ["organizer-terms", "Event-specific terms"],
  ["changes", "Changes to this policy"],
] as const

export default function Page() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      standfirst="Effective 6 October 2026. Please read this before you book. It is part of our Terms & Conditions."
      updated="6 October 2026"
    >
      <nav aria-label="Contents">
        <p>
          <strong>Contents</strong>
        </p>
        <ol>
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`}>{label}</a>
            </li>
          ))}
        </ol>
      </nav>
      <h2 id="overview" className="scroll-mt-6">1. Overview</h2>
      <p>Baatasari is a ticketing platform; events are run by their Organizers. This policy says when you get a refund, what you get back, and how to ask. In short: <strong>if an event is cancelled you get everything back; if a payment goes wrong on our side you get everything back; otherwise a confirmed ticket is not refundable unless the Organizer agrees.</strong></p>
      <h2 id="event-cancelled" className="scroll-mt-6">2. If an event is cancelled</h2>
      <ul>
      <li>If the <strong>Organizer or Baatasari cancels an event</strong>, you get a <strong>full refund</strong> of what you paid for the unused tickets: the ticket price, our platform fee, and any payment-gateway charge shown at checkout. The Organizer bears the gateway cost, not you.</li>
      <li>You do not need to ask. Refunds for cancelled events are started for you. If you have not seen one, write to us (see below).</li>
      <li>A cancelled event stops selling at once and its tickets stop scanning.</li>
      </ul>
      <h2 id="rescheduled" className="scroll-mt-6">3. If an event is postponed or rescheduled</h2>
      <ul>
      <li>Your ticket normally stays valid for the new date and you do not need to do anything.</li>
      <li>If you cannot attend the new date, ask us (see below). Whether you get a refund then depends on the Organizer and the event’s own terms, and we will help you ask. We will tell you the outcome.</li>
      <li>If a rescheduled event is later cancelled, the section above applies.</li>
      </ul>
      <h2 id="your-cancellation" className="scroll-mt-6">4. If you want to cancel a confirmed ticket</h2>
      <ul>
      <li>A confirmed ticket is <strong>not refundable</strong> if you change your mind, cannot attend, arrive late, miss the event, or book the wrong date, type or quantity.</li>
      <li>You can ask for a refund anyway. If the Organizer agrees, you get the ticket price back <strong>less</strong> our platform fee (₹10 per ticket), the payment-gateway charge, and a cancellation charge (currently ₹10, inclusive of GST). The amounts are shown against your order. Nothing is refunded unless the Organizer agrees.</li>
      <li>Some events may in future let you cancel yourself from your ticket page. If so, the page shows the exact refund before you confirm, and that event’s rules apply.</li>
      <li>If you are unhappy with an event itself, raise it with the Organizer first; we will help through the grievance process where we can.</li>
      </ul>
      <h2 id="entry-refused" className="scroll-mt-6">5. If you are refused entry</h2>
      <p>No refund is due if entry is refused or you are removed for a lawful reason: for example you do not meet the event’s age limit, you break the venue’s rules, you arrive after gates close, your ticket has already been used, or your QR code fails because it was shared or altered. Keep your ticket private; the first valid scan is admitted.</p>
      <h2 id="payment-issues" className="scroll-mt-6">6. If a payment goes wrong</h2>
      <ul>
      <li><strong>Money taken, no ticket.</strong> We verify every payment before issuing a ticket. If your payment was captured but no ticket could be issued, for example because your seat hold ended before payment completed and the seat was gone, the order is flagged and <strong>refunded in full</strong> to your original payment method.</li>
      <li><strong>Charged twice.</strong> A duplicate charge for the same order is refunded in full.</li>
      <li><strong>Payment failed.</strong> No ticket is issued, and any amount shown as debited is reversed by your bank or the gateway, usually in 5–7 working days. If it is not, write to us.</li>
      </ul>
      <h2 id="talent-fee" className="scroll-mt-6">7. Talent registration fee</h2>
      <p>The one-time talent registration fee (currently ₹299) is <strong>not refundable once your profile is live</strong>. It is refunded in full if you were charged twice or charged by mistake, or if we could not publish your profile because of a fault on our side. If we waived the fee, nothing was charged and nothing is refunded.</p>
      <h2 id="processing" className="scroll-mt-6">8. How refunds are made</h2>
      <ul>
      <li>Refunds go to the <strong>original payment method only</strong>. We cannot send them to another card, UPI ID or bank account.</li>
      <li>Our team processes eligible refunds, usually within <strong>5–7 working days</strong> of the refund being confirmed. Your bank or payment provider may take longer to show the credit.</li>
      <li>You can see the refund status against the order in your booking history. When a refund is processed, the tickets on that order are cancelled and stop scanning.</li>
      <li>Refunds are in INR, the currency you paid in.</li>
      <li>Where a refund returns our platform fee, we issue a credit note for it, as GST law requires.</li>
      </ul>
      <h2 id="how-to-request" className="scroll-mt-6">9. How to ask for a refund</h2>
      <p>Write to our Grievance Officer at <a href="mailto:grievance@baatasari.com">grievance@baatasari.com</a> (or raise a ticket from Help while signed in) with the <strong>order number</strong>, the <strong>name of the event or fee</strong>, and the <strong>reason</strong>. A payment reference from your confirmation email speeds things up. We acknowledge within <strong>24 hours</strong> and resolve within <strong>15 days</strong>; see <a href="/grievance">Grievance Redressal</a>.</p>
      <h2 id="chargebacks" className="scroll-mt-6">10. Chargebacks</h2>
      <p>Please contact us before disputing a charge with your bank. A dispute that skips our process can take much longer, and tickets on a disputed payment are suspended while it is open.</p>
      <h2 id="organizer-terms" className="scroll-mt-6">11. Event-specific terms</h2>
      <p>An Organizer may add terms for a particular event (for example a cancellation window). They are shown on the event page or sent to you, and apply in addition to this policy, never below the protections it gives you.</p>
      <h2 id="changes" className="scroll-mt-6">12. Changes to this policy</h2>
      <p>We may update this policy. The version in force when you booked applies to that booking.</p>
    </LegalPage>
  )
}
