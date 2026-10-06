import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms for using Baatasari as an attendee or as talent: accounts, bookings and tickets, fees and taxes, payments, refunds, and how disputes are handled.",
  alternates: { canonical: "/terms-and-conditions" },
}

const SECTIONS = [
  ["acceptance", "Acceptance of these Terms"],
  ["definitions", "Definitions"],
  ["eligibility", "Eligibility"],
  ["accounts", "Your account"],
  ["platform-role", "Our role"],
  ["bookings", "Bookings, tickets and entry"],
  ["pricing", "Prices, fees and taxes"],
  ["payments", "Payments"],
  ["refunds", "Cancellations and refunds"],
  ["talent", "Talent registrations"],
  ["conduct", "Content and acceptable use"],
  ["ip", "Intellectual property"],
  ["privacy", "Privacy"],
  ["communications", "Communications"],
  ["third-party", "Third-party services"],
  ["reporting", "Reporting content and takedowns"],
  ["disclaimers", "Availability and disclaimers"],
  ["liability", "Limitation of liability"],
  ["indemnity", "Indemnity"],
  ["termination", "Suspension and termination"],
  ["grievance", "Grievance redressal"],
  ["law", "Governing law and disputes"],
  ["changes", "Changes to these Terms"],
  ["contact", "Who we are and how to reach us"],
] as const

export default function Page() {
  return (
    <LegalPage
      title="Terms & Conditions"
      standfirst="Effective 6 October 2026. These Terms are a legally binding agreement between you and Baatasari. Please read them before you book."
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
      <h2 id="acceptance" className="scroll-mt-6">1. Acceptance of these Terms</h2>
      <p>These Terms &amp; Conditions (“<strong>Terms</strong>”) govern your use of the Baatasari websites and apps (together, the “<strong>Platform</strong>”), operated by <strong>Simha Karthik Reddy</strong>, a sole proprietor trading as <strong>BAATASARI</strong> (“Baatasari”, “we”, “us”). By creating an account, booking, listing or otherwise using the Platform you accept these Terms, our <a href="/privacy-policy">Privacy Policy</a> and our <a href="/refund-policy">Refund Policy</a>, which are part of them. If you do not agree, please do not use the Platform.</p>
      <p>These Terms apply to you when you browse, book tickets or register as Talent on baatasari.com. Baatasari runs three sites, each with terms for the role it serves: baatasari.com (attendees and talent), organizer.baatasari.com (organizers) and venue.baatasari.com (venue partners). The terms of the site you are using apply to what you do on it.</p>
      <h2 id="definitions" className="scroll-mt-6">2. Definitions</h2>
      <ul>
      <li><strong>“Attendee”</strong>: a person who browses the Platform or books tickets to an Event.</li>
      <li><strong>“Organizer”</strong>: a person or business that has registered, been approved, and lists Events on the Platform.</li>
      <li><strong>“Venue Partner”</strong>: a person or business that lists a venue on the Platform.</li>
      <li><strong>“Talent”</strong>: a performer or artist who registers a profile in the Platform’s talent directory.</li>
      <li><strong>“Event”</strong>: any event, workshop, performance, meetup or experience listed on the Platform by an Organizer.</li>
      <li><strong>“Ticket”</strong>: the digital admission, including its QR code, issued on a confirmed booking.</li>
      </ul>
      <h2 id="eligibility" className="scroll-mt-6">3. Eligibility</h2>
      <ul>
      <li>You must be at least <strong>18 years old</strong> and able to enter into a binding contract under the Indian Contract Act, 1872 to create an account or transact on the Platform. Individual events may set higher age limits, which are shown on the event page and enforced at entry.</li>
      <li>If you act for a business, you confirm you are authorised to bind it.</li>
      <li>Everything you give us must be true, accurate and complete, and you must keep it up to date.</li>
      </ul>
      <h2 id="accounts" className="scroll-mt-6">4. Your account</h2>
      <ul>
      <li>You can sign up with an email and password, or with Google. Keep your login details confidential; you are responsible for everything done through your account. Tell us at once at <a href="mailto:contact-us@baatasari.com">contact-us@baatasari.com</a> if you suspect someone else has used it.</li>
      <li><strong>One signed-in device per site.</strong> If you sign in on a second device on the same Baatasari site, the first device is signed out. Each of our three sites (baatasari.com, organizer.baatasari.com, venue.baatasari.com) is separate, so signing in on one does not sign you out of another.</li>
      <li>You stay signed in until you sign out, or until 30 days pass without you using the site.</li>
      <li>One account can be an attendee, an Organizer, a Venue Partner and Talent. Each role has its own sign-up, checks and approval, and approval for one does not give you the others.</li>
      <li>You can delete your account at any time from <strong>Profile → Security → Delete account</strong> (confirmed by a one-time code). Deletion takes effect after a 24-hour grace period, after which it cannot be undone, and does not remove records we must keep by law (see the <a href="/privacy-policy">Privacy Policy</a>). We may delay deletion while money, a refund, an event or a dispute is still open.</li>
      </ul>
      <h2 id="platform-role" className="scroll-mt-6">5. Our role</h2>
      <p>Baatasari is a <strong>technology platform and intermediary</strong>, and a marketplace e-commerce entity under the Consumer Protection (E-Commerce) Rules, 2020. <strong>Events are created, owned and run by Organizers, not by Baatasari.</strong> The Organizer is the seller of the Event and the Ticket. We provide the booking, payment-collection, ticketing and check-in technology, and charge a platform fee for it. Seller details required by law, such as the Organizer’s name and contact information, are shown with the Event or available from us on request. Unless we say so expressly, we do not vet, endorse or guarantee any Event, its quality, safety, legality or whether it matches its description.</p>
      <h2 id="bookings" className="scroll-mt-6">6. Bookings, tickets and entry</h2>
      <ul>
      <li><strong>Confirmation.</strong> A booking is confirmed only when payment is successfully captured (or, for a free Event, when the order is confirmed) and a Ticket is issued. Until then there is no contract for admission.</li>
      <li><strong>Seat holds.</strong> When you start checkout for a paid Event, your seats are held for about 15 minutes. If payment is not completed in that time, the hold ends and the seats are released.</li>
      <li><strong>Limit.</strong> To keep sales fair, you can buy at most <strong>10 tickets per Event</strong>, counted across all your orders by account or email.</li>
      <li><strong>Tickets and QR codes.</strong> Tickets are digital and carry a signed QR code, checked at the entrance with the Organizer’s scanner. A Ticket admits the stated number of people once; re-entry and extra people are rejected by the system. Door staff can also look up a booking by its code.</li>
      <li><strong>Keep your Ticket private.</strong> The first valid scan is admitted. Do not share screenshots or the QR code.</li>
      <li><strong>Entry conditions.</strong> Entry is subject to the Organizer’s and venue’s reasonable conditions (age limits, security checks, prohibited items, conduct). They may refuse entry or remove anyone for lawful reasons, and no refund is due in that case except as our <a href="/refund-policy">Refund Policy</a> says.</li>
      <li><strong>Resale.</strong> You may not resell Tickets commercially, or use them in promotions, contests or bundles, without the Organizer’s written consent.</li>
      </ul>
      <h2 id="pricing" className="scroll-mt-6">7. Prices, fees and taxes</h2>
      <ul>
      <li>The Organizer sets the ticket price. Before you pay, checkout shows the full breakdown: ticket price, Baatasari’s platform fee, taxes, and any payment-gateway charge.</li>
      <li><strong>Platform fee.</strong> Baatasari charges a platform fee on each paid ticket. It is currently a flat <strong>₹10 per ticket, inclusive of GST</strong>, and is always shown at checkout. A change applies only to bookings made after the change.</li>
      <li><strong>GST.</strong> We charge GST on our platform fee and issue a tax invoice for it, available in your booking history. GST on the ticket itself, where it applies, is the Organizer’s responsibility as the supplier of the Event.</li>
      <li><strong>Business buyers.</strong> You can add your GSTIN at checkout to have it recorded on the invoice.</li>
      <li>If a price is shown wrongly because of a technical fault, it does not bind us or the Organizer; we may cancel the affected orders and refund everything you paid.</li>
      </ul>
      <h2 id="payments" className="scroll-mt-6">8. Payments</h2>
      <ul>
      <li>Payments are processed by our payment gateway, currently <strong>Cashfree</strong>. Baatasari does not store your card, UPI or bank credentials.</li>
      <li>We verify each payment (amount, currency and order reference) before issuing a Ticket. If money is taken but a Ticket cannot be issued, for example because your seat hold ended before payment completed, the payment is flagged and refunded in full to your original payment method.</li>
      <li>Please contact us through the <a href="/grievance">grievance process</a> before raising a chargeback with your bank for a payment that was validly completed; it is faster for you, and tickets on a disputed payment are suspended while the dispute is open.</li>
      </ul>
      <h2 id="refunds" className="scroll-mt-6">9. Cancellations and refunds</h2>
      <p>Our <a href="/refund-policy">Refund Policy</a> sets out the rules. In short: if an Organizer or Baatasari cancels an Event, you get back everything you paid for the unused tickets; otherwise a confirmed ticket is not refundable unless the Organizer agrees; and refunds go to the original payment method.</p>
      <h2 id="talent" className="scroll-mt-6">10. Talent registrations</h2>
      <ul>
      <li>To list a talent profile you submit your details and pay a one-time registration fee, currently <strong>₹299</strong>. We issue a GST invoice for it. We may waive the fee for a profile at our discretion; a waived profile is treated as paid.</li>
      <li>The profile goes live after payment (or waiver) and stays live until you or we hide or remove it. We can hide or remove a profile that breaches these Terms.</li>
      <li><strong>Who sees your contact details.</strong> Your public profile shows your name, photo, city, category and videos. Your phone, WhatsApp and email are shown <strong>only to Organizers we have approved</strong>, through the “Find talent” tool, so that they can offer you work. By registering you consent to this.</li>
      <li>A talent profile is a listing service. We do not guarantee any booking or income, and we are not a party to any arrangement between you and an Organizer or anyone else.</li>
      <li>The registration fee is not refundable once the profile is live, except as the <a href="/refund-policy">Refund Policy</a> says.</li>
      </ul>
      <h2 id="conduct" className="scroll-mt-6">11. Content and acceptable use</h2>
      <p>You are responsible for what you submit (profile details, listings, images, messages). Do not:</p>
      <ul>
      <li>make fraudulent registrations, bookings or payments, or abuse promotions or refunds;</li>
      <li>upload content that is unlawful, obscene, defamatory, hateful, harmful to children, misleading, or that infringes anyone’s intellectual property or privacy;</li>
      <li>impersonate anyone or misstate your affiliation with a person or business;</li>
      <li>scrape, probe, reverse-engineer, overload or interfere with the Platform, its security, or its ticketing and QR systems;</li>
      <li>send spam or unsolicited promotions through the Platform, or use other people’s details from the Platform for anything but the purpose they were shared for; or</li>
      <li>break any law or these Terms.</li>
      </ul>
      <p>We may remove content and suspend accounts that we reasonably believe breach this section.</p>
      <h2 id="ip" className="scroll-mt-6">12. Intellectual property</h2>
      <ul>
      <li>The Platform, including its software, design, branding and the Baatasari name and logo, belongs to us or our licensors. These Terms give you no rights in it beyond using the Platform as intended.</li>
      <li>You keep ownership of what you upload. You give us a non-exclusive, royalty-free, worldwide licence to host, display, reproduce and promote that content on the Platform (including in search results, our social channels and promotional material for the relevant event, listing or profile) for as long as it stays on the Platform.</li>
      <li>You confirm that you hold every right needed in what you upload and that it does not infringe anyone else’s rights.</li>
      </ul>
      <h2 id="privacy" className="scroll-mt-6">13. Privacy</h2>
      <p>How we collect and use personal data is described in our <a href="/privacy-policy">Privacy Policy</a>, written to follow the Digital Personal Data Protection Act, 2023 and its Rules. Please read it; it forms part of these Terms.</p>
      <h2 id="communications" className="scroll-mt-6">14. Communications</h2>
      <p>By creating an account or transacting, you agree to receive service messages by email (and, where we have asked, by SMS or app notification): confirmations, tickets, payment and refund updates, approvals, support replies, and account and security notices. These are necessary to run your account and cannot be switched off while your account or an order is active. We do not send promotional messages unless you have separately agreed to receive them, and you can withdraw that agreement at any time.</p>
      <h2 id="third-party" className="scroll-mt-6">15. Third-party services</h2>
      <p>The Platform relies on third parties: Cashfree for payments, Cloudflare for website delivery and security, cloud servers and storage providers, and Google for “Sign in with Google”. Their own terms apply to your use of their services, and we are not responsible for their outages or acts, though we will make reasonable efforts to limit the effect on you. Our <a href="/privacy-policy">Privacy Policy</a> lists who receives your data.</p>
      <h2 id="reporting" className="scroll-mt-6">16. Reporting content and takedowns</h2>
      <p>Baatasari is an intermediary under the Information Technology Act, 2000. If you see content that is unlawful or breaches these Terms, write to <a href="mailto:grievance@baatasari.com">grievance@baatasari.com</a> with a link to it and the reason. We remove or disable access to unlawful content when we receive a court order or a notice from the appropriate government authority, or otherwise become aware of it, within the time the law requires, and we may remove content that breaches these Terms. We keep the records the law requires and may share them with the authorities when lawfully asked.</p>
      <h2 id="disclaimers" className="scroll-mt-6">17. Availability and disclaimers</h2>
      <ul>
      <li>The Platform is provided “as is” and “as available”. We do not promise it will be uninterrupted or error-free, and we may change, suspend or withdraw features, including for maintenance or security.</li>
      <li>We give no warranty about any event: whether it takes place, its quality, safety, legality, or whether it matches its description. Those are the Organizer’s responsibility.</li>
      <li>Nothing here excludes a warranty or right you have under law that cannot be excluded.</li>
      </ul>
      <h2 id="liability" className="scroll-mt-6">18. Limitation of liability</h2>
      <p>To the maximum extent the law allows: (a) we are not liable for indirect, incidental, special, consequential or punitive loss, or for lost profit, revenue, data or goodwill; and (b) our total liability for any claim is limited to the amount you paid on the Platform for the booking or fee the claim relates to. Nothing in these Terms limits liability that cannot be limited by law, or your rights as a consumer under the Consumer Protection Act, 2019.</p>
      <h2 id="indemnity" className="scroll-mt-6">19. Indemnity</h2>
      <p>You will indemnify and hold harmless Baatasari, its proprietor, employees and agents against any claim, loss or expense (including reasonable legal fees) arising from your use of the Platform, your content, or your breach of these Terms or of any law or third-party right.</p>
      <h2 id="termination" className="scroll-mt-6">20. Suspension and termination</h2>
      <ul>
      <li>We may suspend or end your account, hide your listings, or cancel orders where we reasonably believe there is fraud, a breach of these Terms, a legal requirement, or a risk to other users. Where we can, we will tell you why and give you a chance to respond.</li>
      <li>You may stop using the Platform and delete your account at any time. Clauses that by their nature should continue (including intellectual property, liability, indemnity, and governing law) continue after your account ends.</li>
      </ul>
      <h2 id="grievance" className="scroll-mt-6">21. Grievance redressal</h2>
      <p>Our Grievance Officer is Simha Karthik Reddy (<a href="mailto:grievance@baatasari.com">grievance@baatasari.com</a>). We acknowledge every complaint within <strong>24 hours</strong> and resolve it within <strong>15 days</strong> of receiving it, as the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the Consumer Protection (E-Commerce) Rules, 2020 require. Full details, and what else you can do if you are not satisfied, are on our <a href="/grievance">Grievance Redressal</a> page.</p>
      <h2 id="law" className="scroll-mt-6">22. Governing law and disputes</h2>
      <p>These Terms are governed by the laws of India. The courts at <strong>Nellore, Andhra Pradesh</strong> have exclusive jurisdiction. Nothing in these Terms limits your right as a consumer to approach a Consumer Commission under the Consumer Protection Act, 2019 where the law allows you to.</p>
      <h2 id="changes" className="scroll-mt-6">23. Changes to these Terms</h2>
      <p>We may update these Terms. The effective date and version at the top show the latest one. We will tell you about material changes on the Platform and, where we hold your email address, by email. We also remind every account holder of these Terms and our policies by email at least once a year. If you keep using the Platform after a change takes effect, you accept the updated Terms; if you do not agree, stop using the Platform and, if you wish, delete your account.</p>
      <h2 id="contact" className="scroll-mt-6">24. Who we are and how to reach us</h2>
      <ul>
      <li><strong>Legal name:</strong> Simha Karthik Reddy (sole proprietorship), trading as BAATASARI</li>
      <li><strong>GSTIN:</strong> 37HRGPR8105H1ZD</li>
      <li><strong>Principal place of business:</strong> Sathyamjee Layout, Navalak Gardens, Nellore, Andhra Pradesh – 524002</li>
      <li><strong>General contact:</strong> <a href="mailto:contact-us@baatasari.com">contact-us@baatasari.com</a></li>
      <li><strong>Grievances:</strong> <a href="mailto:grievance@baatasari.com">grievance@baatasari.com</a></li>
      </ul>
    </LegalPage>
  )
}
