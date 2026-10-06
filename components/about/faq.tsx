import Link from "next/link"
import { faqJsonLd, jsonLdString } from "@/lib/faq-schema"

/**
 * Answer-first FAQs for the home page. Each answer opens with the fact, then the
 * detail, which is the shape search and answer engines quote. The same list
 * feeds the FAQPage markup, so the two cannot drift. Keep it in step with
 * /help and the policy pages; every line here is stated there too.
 */
const FAQ = [
  {
    q: "How do I book tickets on Baatasari?",
    a: (
      <>
        Find an event under <Link href="/events" className="font-semibold underline underline-offset-2">Events</Link>, choose your tickets and pay by UPI, card or net banking. Your tickets are issued the moment the payment is confirmed, and each one has its own QR code in My tickets.
      </>
    ),
  },
  {
    q: "How much does Baatasari charge?",
    a: "The platform fee is currently a flat ₹10 per paid ticket, GST included. Checkout shows the full breakdown (ticket price, platform fee, taxes and any payment-gateway charge) before you pay.",
  },
  {
    q: "Can I get a refund?",
    a: (
      <>
        Yes, if the event is cancelled: you get everything back, and the refund starts without you asking. A confirmed ticket is otherwise final unless the organizer agrees to a refund. Refunds usually reach your account in 5–7 working days. See the{" "}
        <Link href="/refund-policy" className="font-semibold underline underline-offset-2">refund policy</Link>.
      </>
    ),
  },
  {
    q: "How do I get into the event?",
    a: "Show the QR code from My tickets at the entrance. Each ticket admits its stated number of people once, so keep the QR code private: the first valid scan is the one that gets in.",
  },
  {
    q: "How many tickets can I buy?",
    a: "Up to 10 tickets per event, counted across all your orders. When you start checkout your seats are held for about 15 minutes while you pay.",
  },
  {
    q: "How do I list an event, a venue or a talent profile?",
    a: (
      <>
        Organizers sign up at <a href="https://organizer.baatasari.com" className="font-semibold underline underline-offset-2">organizer.baatasari.com</a> (free to start, after a quick approval). Venues list at <a href="https://venue.baatasari.com" className="font-semibold underline underline-offset-2">venue.baatasari.com</a> for a one-time ₹999, GST included. Performers create a <Link href="/talent" className="font-semibold underline underline-offset-2">talent profile</Link> for a one-time ₹299.
      </>
    ),
  },
  {
    q: "Is Baatasari safe to pay on?",
    a: (
      <>
        Payments are processed by Cashfree, and Baatasari never sees or stores your card, UPI or bank details. Baatasari is run by Simha Karthik Reddy (sole proprietor) from Nellore, Andhra Pradesh. Complaints are acknowledged within 24 hours and resolved within 15 days: see{" "}
        <Link href="/grievance" className="font-semibold underline underline-offset-2">Grievance Redressal</Link>.
      </>
    ),
  },
] as const

export default function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="bg-white py-14 lg:py-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(faqJsonLd(FAQ)) }} />
      <div className="mx-auto w-full max-w-3xl px-5 sm:px-6">
        <h2 id="faq-heading" className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">
          Questions, answered
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-base text-slate-600">
          The quick answers to what people ask us most. Need more? Visit <Link href="/help" className="font-semibold underline underline-offset-2">Help</Link>.
        </p>
        <ul className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {FAQ.map(({ q, a }) => (
            <li key={q}>
              <details className="group">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-base font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {q}
                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 text-base leading-7 text-slate-600">{a}</p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
