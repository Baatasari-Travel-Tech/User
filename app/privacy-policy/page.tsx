import type { Metadata } from "next"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Baatasari collects, uses, shares, secures, and retains your personal data, and how to exercise your rights under the DPDP Act, 2023.",
  alternates: { canonical: "/privacy-policy" },
}

const SECTIONS = [
  ["who-we-are", "1. Who We Are"],
  ["scope", "2. Scope of this Policy"],
  ["data-we-collect", "3. Data We Collect"],
  ["how-we-use", "4. How We Use Your Data"],
  ["consent", "5. Consent & Legal Basis"],
  ["sharing", "6. Who We Share Data With"],
  ["cookies", "7. Cookies & Analytics"],
  ["retention", "8. Data Retention"],
  ["security", "9. Security"],
  ["rights", "10. Your Rights & How to Exercise Them"],
  ["guests", "11. Guest Bookings"],
  ["children", "12. Children"],
  ["storage", "13. Where Your Data is Stored"],
  ["grievance", "14. Grievance Officer"],
  ["changes", "15. Changes to this Policy"],
] as const

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-2 mt-10 scroll-mt-24 text-xl font-semibold text-slate-900">
      {children}
    </h2>
  )
}

export default function PrivacyPolicy() {
  return (
    <>
    <div className="mx-auto max-w-5xl px-6 py-10 text-gray-800">
      <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-gray-500">
        Effective date: 7 July 2026 · Prepared with reference to the Digital Personal Data
        Protection Act, 2023 (&ldquo;DPDP Act&rdquo;).
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

      <H2 id="who-we-are">1. Who We Are</H2>
      <p className="mb-4">
        Baatasari is operated by <strong>Simha Karthik Reddy</strong>, a sole proprietor trading
        as <strong>BAATASARI</strong> (GSTIN 37HRGPR8105H1ZD), with its principal place of
        business at 28/1A-4-145/41, Sathyamjee Layout, Navalak Gardens, Nellore, Andhra Pradesh –
        524002. For the purposes of the DPDP Act, Baatasari is the <strong>data fiduciary</strong>{" "}
        for the personal data described in this policy.
      </p>

      <H2 id="scope">2. Scope of this Policy</H2>
      <p className="mb-4">
        This policy covers personal data processed when you browse the Platform, create an
        account, book tickets (with or without an account), register as an Organizer or Talent,
        contact support, or otherwise interact with Baatasari. It does not cover what an Organizer
        does with your data outside the Platform once an event is fulfilled — Organizers are
        independently responsible for their own compliance, and we contractually restrict their
        use of your booking data to event fulfilment (see Section 6).
      </p>

      <H2 id="data-we-collect">3. Data We Collect</H2>
      <ul className="mb-4 list-disc space-y-1.5 pl-6">
        <li>
          <strong>Account data:</strong> name, email address, password (stored as a secure hash),
          and — if you sign in with Google — the name, email, and profile identifiers Google
          shares with us.
        </li>
        <li>
          <strong>Profile &amp; onboarding data:</strong> phone number, date of birth, gender,
          location (area/city/state/pincode), profession, interests and preferences, and any
          avatar image you upload.
        </li>
        <li>
          <strong>Booking data:</strong> events booked, ticket quantity and tier, attendee name,
          email and phone provided at checkout, order and invoice records, and check-in status.
        </li>
        <li>
          <strong>Payment data:</strong> order amount, payment status, and gateway transaction
          references. <strong>We do not collect or store your card, UPI, or bank
          credentials</strong> — payments are handled by our payment gateway (Cashfree).
        </li>
        <li>
          <strong>Organizer verification data:</strong> legal/business name, PAN, GSTIN, bank
          account details (account number, IFSC), contact details, address, and the KYC documents
          and signed agreement you upload.
        </li>
        <li>
          <strong>Talent data:</strong> the talent profile details you submit and the registration
          payment record.
        </li>
        <li>
          <strong>Support &amp; grievance data:</strong> messages you send us, including the phone
          number and issue description submitted via the contact form.
        </li>
        <li>
          <strong>Technical data:</strong> authentication cookies, device/browser information,
          and event-page view counts (de-duplicated per visitor per day) used for organizer
          analytics.
        </li>
      </ul>

      <H2 id="how-we-use">4. How We Use Your Data</H2>
      <ul className="mb-4 list-disc space-y-1.5 pl-6">
        <li>To create and secure your account and authenticate your sessions.</li>
        <li>
          To process bookings and payments, issue tickets and tax invoices, operate venue
          check-in, and process refunds where due.
        </li>
        <li>To verify Organizers (KYC), enable payouts, and meet our tax obligations.</li>
        <li>
          To send transactional communications — booking confirmations, tickets, payment/refund
          updates, verification emails, and account or security notices.
        </li>
        <li>To personalise event discovery based on your stated preferences and location.</li>
        <li>
          To produce aggregate analytics for Organizers (for example, daily views vs purchases of
          their event page) — reported in aggregate, not as your individual browsing history.
        </li>
        <li>To respond to support requests and grievances, and to keep records of them.</li>
        <li>To detect and prevent fraud, abuse, and violations of our Terms.</li>
        <li>To comply with law, including tax, accounting, and record-keeping obligations.</li>
      </ul>

      <H2 id="consent">5. Consent &amp; Legal Basis</H2>
      <p className="mb-4">
        We process your personal data on the basis of the consent you give when you sign up
        (recorded with a timestamp and the version of the terms you accepted) and when you book,
        and for certain legitimate uses permitted by the DPDP Act (such as compliance with law).
        You may withdraw consent at any time by deleting your account (Section 10). Withdrawal
        does not affect processing already carried out, or data we are legally required to
        retain.
      </p>

      <H2 id="sharing">6. Who We Share Data With</H2>
      <p className="mb-2">
        <strong>We do not sell your personal data.</strong> We share it only as follows:
      </p>
      <ul className="mb-4 list-disc space-y-1.5 pl-6">
        <li>
          <strong>Event Organizers:</strong> when you book an event, the booking details needed to
          fulfil it (attendee name, contact details, ticket details, check-in status) are shared
          with that event&rsquo;s Organizer. Organizers may use this data <strong>only</strong> to
          fulfil and manage that event.
        </li>
        <li>
          <strong>Payment gateway (Cashfree):</strong> to process payments and refunds. Your
          payment instrument details are provided by you directly to the gateway.
        </li>
        <li>
          <strong>Infrastructure providers:</strong> our cloud hosting, storage (for uploaded
          images and documents), email delivery, and database/caching providers, who process data
          on our behalf under their service agreements.
        </li>
        <li>
          <strong>Google:</strong> if you choose &ldquo;Sign in with Google&rdquo;, authentication
          is handled by Google under its own privacy policy.
        </li>
        <li>
          <strong>Authorities:</strong> where disclosure is required by law, legal process, or to
          protect the rights and safety of users or the public.
        </li>
      </ul>

      <H2 id="cookies">7. Cookies &amp; Analytics</H2>
      <ul className="mb-4 list-disc space-y-1.5 pl-6">
        <li>
          <strong>Essential cookies:</strong> we use secure, httpOnly cookies to keep you signed
          in. These are necessary for the Platform to function and are not used for advertising.
        </li>
        <li>
          <strong>Usage analytics:</strong> we measure page performance and aggregate usage (via
          our hosting provider&rsquo;s analytics) and de-duplicated event-page view counts. We do
          not run third-party advertising trackers.
        </li>
      </ul>

      <H2 id="retention">8. Data Retention</H2>
      <ul className="mb-4 list-disc space-y-1.5 pl-6">
        <li>Account and profile data: for as long as your account exists.</li>
        <li>
          Financial records (orders, invoices, refunds, payout and tax records): retained for the
          statutory retention period under Indian tax and accounting law, even after account
          deletion — anonymised where possible.
        </li>
        <li>
          Organizer KYC records: retained while the Organizer account is active and thereafter as
          required by law.
        </li>
        <li>Support and grievance records: retained as required to demonstrate compliance.</li>
      </ul>

      <H2 id="security">9. Security</H2>
      <p className="mb-4">
        We apply reasonable security safeguards appropriate to the data we hold: passwords are
        stored hashed, authentication uses short-lived signed tokens in httpOnly cookies, tickets
        carry cryptographically signed QR codes, access to production systems is restricted, and
        traffic is encrypted in transit (HTTPS). No system is perfectly secure; if we become aware
        of a personal data breach we will notify affected users and the Data Protection Board as
        required by the DPDP Act.
      </p>

      <H2 id="rights">10. Your Rights &amp; How to Exercise Them</H2>
      <ul className="mb-4 list-disc space-y-1.5 pl-6">
        <li>
          <strong>Access &amp; correction:</strong> view and edit your details any time under{" "}
          <a className="text-blue-600 hover:underline" href="/profile">Profile</a>.
        </li>
        <li>
          <strong>Erasure / withdrawal of consent:</strong> delete your account via{" "}
          <strong>Profile → Security → Delete account</strong> (confirmed by OTP). Your account is
          removed after a short grace window; records we must keep by law are retained and
          anonymised where possible.
        </li>
        <li>
          <strong>Grievance:</strong> raise any data-protection concern with our Grievance Officer
          (Section 14). We acknowledge within 48 hours and resolve within the timelines required
          by law.
        </li>
        <li>
          <strong>Nomination:</strong> as provided by the DPDP Act, you may nominate a person to
          exercise your rights in the event of death or incapacity — contact the Grievance Officer
          to record a nomination.
        </li>
      </ul>

      <H2 id="guests">11. Guest Bookings</H2>
      <p className="mb-4">
        If you book without an account, we collect the name, email, and phone number you provide
        at checkout to issue and deliver your ticket and invoice. Since there is no account to
        delete, you can request access to or erasure of your guest data by emailing{" "}
        <a className="text-blue-600 hover:underline" href="mailto:grievance@baatasari.com">
          grievance@baatasari.com
        </a>{" "}
        (records we must retain by law are excluded).
      </p>

      <H2 id="children">12. Children</H2>
      <p className="mb-4">
        The Platform is intended for users aged <strong>18 and above</strong>. We do not knowingly
        collect personal data from minors, and account creation requires confirming you meet the
        age requirement. If you believe a minor has provided us data, contact the Grievance
        Officer and we will delete it.
      </p>

      <H2 id="storage">13. Where Your Data is Stored</H2>
      <p className="mb-4">
        Our primary infrastructure and storage are hosted with reputable cloud providers, with
        media and document storage located in India (AWS Asia Pacific — Mumbai). Where any
        provider processes data outside India, we ensure it is permitted under applicable law.
      </p>

      <H2 id="grievance">14. Grievance Officer</H2>
      <p className="mb-4">
        Grievance Officer: <strong>Simha Karthik Reddy</strong> ·{" "}
        <a className="text-blue-600 hover:underline" href="mailto:grievance@baatasari.com">
          grievance@baatasari.com
        </a>
        . Full contact details, acknowledgement (48 hours) and resolution (30 days) commitments
        are on the{" "}
        <a className="text-blue-600 hover:underline" href="/grievance">Grievance Redressal</a>{" "}
        page.
      </p>

      <H2 id="changes">15. Changes to this Policy</H2>
      <p className="mb-4">
        We may update this policy from time to time; the effective date above reflects the latest
        version. Material changes will be notified on the Platform.
      </p>

      <p className="mt-10 text-sm text-gray-500">Last updated: 7 July 2026</p>
    </div>
    <SiteFooter />
    </>
  )
}
