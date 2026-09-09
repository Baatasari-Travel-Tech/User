import type { Metadata } from "next"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms governing your use of the Baatasari platform — accounts, bookings, tickets, payments, organizer and talent obligations, and dispute resolution.",
  alternates: { canonical: "/terms-and-conditions" },
}

const SECTIONS = [
  ["acceptance", "1. Acceptance of these Terms"],
  ["definitions", "2. Definitions"],
  ["eligibility", "3. Eligibility"],
  ["accounts", "4. Accounts & Security"],
  ["platform-role", "5. Our Role as a Platform"],
  ["bookings", "6. Bookings, Tickets & Entry"],
  ["pricing", "7. Pricing, Fees & Taxes"],
  ["payments", "8. Payments"],
  ["refunds", "9. Cancellations & Refunds"],
  ["organizers", "10. Terms for Event Organizers"],
  ["talent", "11. Terms for Talent / Artists"],
  ["conduct", "12. User Content & Acceptable Use"],
  ["ip", "13. Intellectual Property"],
  ["privacy", "14. Privacy"],
  ["communications", "15. Communications"],
  ["third-party", "16. Third-Party Services"],
  ["availability", "17. Availability & Disclaimers"],
  ["liability", "18. Limitation of Liability"],
  ["indemnity", "19. Indemnity"],
  ["termination", "20. Suspension & Termination"],
  ["grievance", "21. Grievance Redressal"],
  ["law", "22. Governing Law & Jurisdiction"],
  ["changes", "23. Changes to these Terms"],
  ["contact", "24. Legal Entity & Contact"],
] as const

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mb-2 mt-10 scroll-mt-24 text-xl font-semibold text-slate-900">
      {children}
    </h2>
  )
}

export default function TermsAndConditions() {
  return (
    <>
    <div className="mx-auto max-w-5xl px-6 py-10 text-gray-800">
      <h1 className="mb-2 text-3xl font-bold">Terms &amp; Conditions</h1>
      <p className="mb-8 text-sm text-gray-500">
        Effective date: 7 July 2026 · These Terms form a legally binding agreement between you
        and Baatasari. Please read them carefully.
      </p>

      {/* Table of contents */}
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

      <H2 id="acceptance">1. Acceptance of these Terms</H2>
      <p className="mb-4">
        These Terms &amp; Conditions (&ldquo;<strong>Terms</strong>&rdquo;) govern your access to
        and use of the Baatasari website, applications, and services (together, the
        &ldquo;<strong>Platform</strong>&rdquo;), operated by <strong>Simha Karthik Reddy</strong>,
        a sole proprietor trading as <strong>BAATASARI</strong> (&ldquo;Baatasari&rdquo;,
        &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). By creating an account, making a
        booking, listing an event, or otherwise using the Platform, you accept these Terms, our{" "}
        <a className="text-blue-600 hover:underline" href="/privacy-policy">Privacy Policy</a>, and
        our{" "}
        <a className="text-blue-600 hover:underline" href="/refund-policy">
          Refund &amp; Cancellation Policy
        </a>
        , which are incorporated into these Terms by reference. If you do not agree, please do not
        use the Platform.
      </p>

      <H2 id="definitions">2. Definitions</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          <strong>&ldquo;User&rdquo; / &ldquo;Attendee&rdquo;</strong> — a person who browses the
          Platform or books tickets to an Event.
        </li>
        <li>
          <strong>&ldquo;Organizer&rdquo;</strong> — a person or entity that has registered,
          completed verification, and lists Events on the Platform.
        </li>
        <li>
          <strong>&ldquo;Talent&rdquo; / &ldquo;Artist&rdquo;</strong> — a person who registers a
          talent profile on the Platform.
        </li>
        <li>
          <strong>&ldquo;Event&rdquo;</strong> — any event, workshop, performance, meetup, or
          experience listed on the Platform by an Organizer.
        </li>
        <li>
          <strong>&ldquo;Ticket&rdquo;</strong> — the digital admission credential (including its
          QR code) issued through the Platform on a confirmed booking.
        </li>
      </ul>

      <H2 id="eligibility">3. Eligibility</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          You must be at least <strong>18 years old</strong> to create an account, make a booking,
          or transact on the Platform. Specific Events may impose their own additional age
          restrictions, which are shown on the Event page and enforced at entry.
        </li>
        <li>
          Organizers and Talent must be at least <strong>18 years old</strong> and legally capable
          of entering into binding contracts under the Indian Contract Act, 1872.
        </li>
        <li>
          By registering, you confirm that all information you provide is true, accurate, and
          complete, and that you will keep it up to date.
        </li>
      </ul>

      <H2 id="accounts">4. Accounts &amp; Security</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          You are responsible for maintaining the confidentiality of your login credentials and
          for all activity that occurs under your account.
        </li>
        <li>Do not share your credentials or allow others to access your account.</li>
        <li>
          Notify us immediately at{" "}
          <a className="text-blue-600 hover:underline" href="mailto:contact-us@baatasari.com">
            contact-us@baatasari.com
          </a>{" "}
          if you suspect unauthorised use of your account.
        </li>
        <li>
          One person may hold roles as a User, Organizer, and/or Talent under a single account;
          each role may require additional information and verification before it is activated.
        </li>
        <li>
          You may delete your account at any time via <strong>Profile → Security → Delete
          account</strong>. Deletion is subject to the retention obligations described in our
          Privacy Policy.
        </li>
      </ul>

      <H2 id="platform-role">5. Our Role as a Platform</H2>
      <p className="mb-4">
        Baatasari is a <strong>technology platform and intermediary</strong> that enables
        Organizers to list, promote, and sell tickets to their Events, and enables Users to
        discover and book those Events. <strong>Events are created, owned, and conducted by
        Organizers, not by Baatasari.</strong> The Organizer is the seller and supplier of the
        Event and the ticket; Baatasari provides booking, payment-collection, ticketing, and
        check-in technology, and charges a platform fee for that service. Except where we
        expressly state otherwise, we do not curate, endorse, or guarantee any Event, its
        quality, safety, legality, or its conformity with its description.
      </p>

      <H2 id="bookings">6. Bookings, Tickets &amp; Entry</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          <strong>Booking confirmation.</strong> A booking is confirmed only when payment is
          successfully captured (or, for free Events, when the order is confirmed) and a Ticket is
          issued. Until then, no contract for admission exists.
        </li>
        <li>
          <strong>Seat holds.</strong> When you begin checkout for a paid Event, the selected
          quantity is reserved for a limited window (approximately 15 minutes). If payment is not
          completed within that window, the reservation lapses and the seats are released.
        </li>
        <li>
          <strong>Booking limits.</strong> To keep sales fair, the Platform enforces a limit of{" "}
          <strong>10 tickets per person per Event</strong> (across all of that person&rsquo;s
          orders, by account or email).
        </li>
        <li>
          <strong>Tickets &amp; QR codes.</strong> Tickets are digital and carry a
          cryptographically signed QR code. The QR code is validated at the venue by the
          Organizer&rsquo;s check-in scanner. Each ticket admits the stated number of persons once;
          re-entry and over-admission are rejected by the system.
        </li>
        <li>
          <strong>Keep your ticket secure.</strong> Anyone presenting your QR code first may be
          admitted in your place. Do not share screenshots of your Ticket.
        </li>
        <li>
          <strong>Entry conditions.</strong> Admission remains subject to the Organizer&rsquo;s and
          venue&rsquo;s reasonable conditions (age limits, security checks, prohibited items,
          conduct). The Organizer or venue may refuse entry or remove any person for lawful
          reasons; in such cases no refund is due except as set out in the Refund &amp;
          Cancellation Policy.
        </li>
        <li>
          <strong>Resale.</strong> Tickets may not be resold commercially or used for promotions,
          contests, or bundling without the Organizer&rsquo;s written consent.
        </li>
      </ul>

      <H2 id="pricing">7. Pricing, Fees &amp; Taxes</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          Ticket prices are set by the Organizer. The checkout screen shows the full breakdown of
          what you pay — ticket price, Baatasari&rsquo;s platform fee, applicable taxes, and any
          payment-gateway charge — before you confirm.
        </li>
        <li>
          <strong>GST.</strong> Baatasari charges GST on its platform fee as required by law and
          issues a tax invoice for it (available from your booking history). GST on the ticket
          itself, where applicable, is the responsibility of the Organizer as the supplier of the
          Event.
        </li>
        <li>
          <strong>Business buyers.</strong> You may optionally provide your GSTIN at checkout to
          have it recorded on the invoice.
        </li>
        <li>
          Obvious pricing errors (for example, a price displayed incorrectly due to a technical
          fault) do not bind us or the Organizer; affected orders may be cancelled with a full
          refund of the amount paid.
        </li>
      </ul>

      <H2 id="payments">8. Payments</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          Payments are processed by our third-party payment gateway (currently{" "}
          <strong>Cashfree</strong>). Baatasari does not store your card, UPI, or banking
          credentials.
        </li>
        <li>
          Every payment is verified (amount, currency, and order reference) before a Ticket is
          issued. If money is debited but a Ticket cannot be issued — for example your seat hold
          expired before payment completed — the payment is flagged and refunded to your original
          payment method.
        </li>
        <li>
          You agree not to raise a chargeback for a transaction that was validly completed under
          these Terms without first contacting us through the grievance process in Section 21.
        </li>
      </ul>

      <H2 id="refunds">9. Cancellations &amp; Refunds</H2>
      <p className="mb-4">
        Cancellations and refunds are governed by our{" "}
        <a className="text-blue-600 hover:underline" href="/refund-policy">
          Refund &amp; Cancellation Policy
        </a>
        . In summary: confirmed tickets are non-refundable except where the Event is cancelled (or
        as otherwise stated in that policy), refunds go back to the original payment method, and
        non-refundable third-party gateway charges may be retained.
      </p>

      <H2 id="organizers">10. Terms for Event Organizers</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          <strong>Verification (KYC).</strong> Organizers must complete onboarding, verify their
          email, and submit the required identity, tax, and bank details (including PAN and, where
          applicable, GSTIN) together with the signed organizer agreement. Listings are enabled
          only after approval. Submitting forged or misleading documents is grounds for immediate
          termination.
        </li>
        <li>
          <strong>Accuracy of listings.</strong> The Organizer is solely responsible for the
          accuracy of every Event listing — date, time, venue, pricing, age restrictions, artwork,
          and description — and for having all licences, permissions, and insurances required to
          conduct the Event.
        </li>
        <li>
          <strong>Conduct of the Event.</strong> The Organizer is solely responsible for the
          conduct, safety, and quality of the Event and for compliance with all applicable laws at
          the venue.
        </li>
        <li>
          <strong>Attendee data.</strong> Booking data shared with the Organizer (names, contact
          details, ticket details) may be used <strong>only</strong> to fulfil and manage that
          Event, and must be handled in line with applicable data-protection law. It may not be
          sold or used for unrelated marketing.
        </li>
        <li>
          <strong>Settlement.</strong> Ticket proceeds are settled to the Organizer&rsquo;s
          registered bank account per the organizer agreement, after deduction of the platform
          fee, applicable taxes, and any amounts required to be deducted or collected at source
          under Indian tax law (including TDS under Section 194-O and GST TCS under Section 52,
          where applicable).
        </li>
        <li>
          <strong>Cancelling an Event.</strong> An Organizer who cancels an Event is responsible
          for the cost of refunding all paid attendees, as set out in the organizer agreement and
          the Refund &amp; Cancellation Policy.
        </li>
        <li>
          <strong>GST threshold.</strong> Organizers approaching or crossing the GST registration
          threshold on their Platform sales may be required to provide a GSTIN before continuing
          to sell.
        </li>
      </ul>

      <H2 id="talent">11. Terms for Talent / Artists</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          Creating a Talent profile requires submitting your talent details and paying the
          one-time registration fee shown at signup.
        </li>
        <li>
          A Talent profile is a listing service. Baatasari does <strong>not</strong> guarantee
          bookings, engagements, or income, and is not a party to any arrangement between Talent
          and Organizers or third parties.
        </li>
        <li>The registration fee is non-refundable once the profile has been activated.</li>
      </ul>

      <H2 id="conduct">12. User Content &amp; Acceptable Use</H2>
      <p className="mb-2">
        You are responsible for any content you submit (profile details, event listings, images,
        messages). You agree <strong>not</strong> to:
      </p>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>make fraudulent registrations, bookings, or payments, or misuse promotional mechanics;</li>
        <li>upload content that is unlawful, defamatory, obscene, infringing, or misleading;</li>
        <li>impersonate any person or misrepresent your affiliation with any entity;</li>
        <li>
          probe, scrape, reverse-engineer, overload, or otherwise interfere with the Platform, its
          security measures, or its ticketing/QR systems;
        </li>
        <li>use the Platform to send spam or unsolicited communications; or</li>
        <li>violate any applicable law or these Terms.</li>
      </ul>
      <p className="mb-4">
        We may remove content and/or suspend accounts that we reasonably believe breach this
        section.
      </p>

      <H2 id="ip">13. Intellectual Property</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          The Platform — including its software, design, branding, and the Baatasari name and logo
          — is owned by or licensed to us. These Terms grant you no rights in it other than the
          limited right to use the Platform as intended.
        </li>
        <li>
          You retain ownership of content you upload. You grant us a non-exclusive, royalty-free
          licence to host, display, and reproduce that content for the purpose of operating and
          promoting the Platform and the relevant Event.
        </li>
        <li>
          Organizers warrant that they hold all rights needed for the content in their listings
          (including artwork and performer names/images).
        </li>
      </ul>

      <H2 id="privacy">14. Privacy</H2>
      <p className="mb-4">
        Our collection and use of personal data is described in our{" "}
        <a className="text-blue-600 hover:underline" href="/privacy-policy">Privacy Policy</a>,
        prepared with reference to the Digital Personal Data Protection Act, 2023. By using the
        Platform you acknowledge that policy.
      </p>

      <H2 id="communications">15. Communications</H2>
      <p className="mb-4">
        By creating an account or booking you consent to receive transactional communications
        (booking confirmations, tickets, payment and refund updates, account and security notices)
        by email. These are necessary to provide the service and cannot be opted out of while you
        hold an account or active booking.
      </p>

      <H2 id="third-party">16. Third-Party Services</H2>
      <p className="mb-4">
        The Platform relies on third-party services — including payment processing (Cashfree),
        cloud hosting and storage, and sign-in with Google. Your use of those services may be
        subject to their own terms. We are not responsible for outages or acts of third-party
        providers, though we will make reasonable efforts to mitigate their impact.
      </p>

      <H2 id="availability">17. Availability &amp; Disclaimers</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          The Platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.
          We do not warrant that it will be uninterrupted, error-free, or free of harmful
          components, and we may modify, suspend, or discontinue features (including for
          maintenance) at any time.
        </li>
        <li>
          We make no warranty as to any Event, including its occurrence, quality, safety, or
          conformity with its listing — those are the Organizer&rsquo;s responsibility.
        </li>
      </ul>

      <H2 id="liability">18. Limitation of Liability</H2>
      <p className="mb-4">
        To the maximum extent permitted by law: (a) Baatasari is not liable for any indirect,
        incidental, special, consequential, or punitive damages, or for lost profits, revenue,
        data, or goodwill, arising from your use of the Platform or attendance at any Event; and
        (b) our total aggregate liability for any claim relating to a booking is limited to the
        amount you paid on the Platform for that booking. Nothing in these Terms limits liability
        that cannot be limited under applicable law, or your statutory rights as a consumer under
        the Consumer Protection Act, 2019.
      </p>

      <H2 id="indemnity">19. Indemnity</H2>
      <p className="mb-4">
        You agree to indemnify and hold harmless Baatasari and its proprietor, employees, and
        agents from any claim, demand, loss, or expense (including reasonable legal fees) arising
        out of your breach of these Terms, your content, your Event (if you are an Organizer), or
        your violation of any law or third-party right.
      </p>

      <H2 id="termination">20. Suspension &amp; Termination</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          We may suspend or terminate your account, withhold listings, or cancel bookings where we
          reasonably believe there is fraud, a breach of these Terms, a legal requirement, or a
          risk to other users.
        </li>
        <li>
          You may stop using the Platform and delete your account at any time. Provisions that by
          their nature should survive termination (including Sections 13, 18, 19, and 22) survive.
        </li>
      </ul>

      <H2 id="grievance">21. Grievance Redressal</H2>
      <p className="mb-4">
        Complaints and grievances are handled by our Grievance Officer in accordance with the
        Information Technology Rules, 2021 and the Consumer Protection (E-Commerce) Rules, 2020.
        Contact details, acknowledgement timelines (48 hours), and resolution timelines (30 days)
        are published on our{" "}
        <a className="text-blue-600 hover:underline" href="/grievance">Grievance Redressal</a>{" "}
        page.
      </p>

      <H2 id="law">22. Governing Law &amp; Jurisdiction</H2>
      <p className="mb-4">
        These Terms are governed by the laws of India. Subject to any mandatory consumer-forum
        rights you may have, the courts at Nellore, Andhra Pradesh shall have exclusive
        jurisdiction over disputes arising out of or relating to these Terms or the Platform.
      </p>

      <H2 id="changes">23. Changes to these Terms</H2>
      <p className="mb-4">
        We may update these Terms from time to time. The effective date at the top reflects the
        latest version. Material changes will be notified on the Platform. Continued use after a
        change takes effect constitutes acceptance of the updated Terms.
      </p>

      <H2 id="contact">24. Legal Entity &amp; Contact</H2>
      <ul className="mb-4 list-disc space-y-1 pl-6">
        <li>
          <strong>Legal name:</strong> Simha Karthik Reddy (sole proprietorship), trading as
          BAATASARI
        </li>
        <li>
          <strong>GSTIN:</strong> 37HRGPR8105H1ZD
        </li>
        <li>
          <strong>Registered address:</strong> 28/1A-4-145/41, Sathyamjee Layout, Navalak Gardens,
          Nellore, Sri Potti Sriramulu Nellore, Andhra Pradesh – 524002
        </li>
        <li>
          <strong>General contact:</strong>{" "}
          <a className="text-blue-600 hover:underline" href="mailto:contact-us@baatasari.com">
            contact-us@baatasari.com
          </a>{" "}
          · <strong>Grievances:</strong>{" "}
          <a className="text-blue-600 hover:underline" href="mailto:grievance@baatasari.com">
            grievance@baatasari.com
          </a>
        </li>
      </ul>

      <p className="mt-10 text-sm text-gray-500">Last updated: 7 July 2026</p>
    </div>
    <SiteFooter />
    </>
  )
}
