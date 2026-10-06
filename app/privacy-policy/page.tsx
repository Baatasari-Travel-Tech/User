import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Baatasari collects, uses, shares, protects and keeps your personal data on baatasari.com, and how to use your rights under the DPDP Act, 2023.",
  alternates: { canonical: "/privacy-policy" },
}

const SECTIONS = [
  ["who-we-are", "Who we are"],
  ["data-we-collect", "Personal data we collect"],
  ["how-we-use", "Why we use it"],
  ["consent", "Consent and other lawful grounds"],
  ["sharing", "Who we share data with"],
  ["outside-india", "Where your data is kept and transfers outside India"],
  ["cookies", "Cookies and analytics"],
  ["retention", "How long we keep data"],
  ["security", "How we protect it"],
  ["rights", "Your rights and how to use them"],
  ["children", "Children"],
  ["complaints", "Complaints and the Data Protection Board"],
  ["changes", "Changes to this notice"],
] as const

export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      standfirst="Effective 6 October 2026. This notice explains, in plain language, what personal data we collect, why, who gets it, how long we keep it, and what you can do. It follows the Digital Personal Data Protection Act, 2023 (“DPDP Act”) and its Rules, 2025."
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
      <h2 id="who-we-are" className="scroll-mt-6">1. Who we are</h2>
      <p>This site, baatasari.com, is run by <strong>Simha Karthik Reddy</strong>, a sole proprietor trading as <strong>BAATASARI</strong> (GSTIN 37HRGPR8105H1ZD), of Sathyamjee Layout, Navalak Gardens, Nellore, Andhra Pradesh – 524002. Under the DPDP Act we are the <strong>data fiduciary</strong> for the personal data described here. Contact us at <a href="mailto:contact-us@baatasari.com">contact-us@baatasari.com</a>; privacy complaints go to our Grievance Officer at <a href="mailto:grievance@baatasari.com">grievance@baatasari.com</a>.</p>
      <p>Baatasari runs three sites (baatasari.com, organizer.baatasari.com and venue.baatasari.com) on one account system, so one account and one set of records may be used across them. This notice covers all of them; it is shown on each with the details that matter for that site.</p>
      <h2 id="data-we-collect" className="scroll-mt-6">2. Personal data we collect</h2>
      <p>We collect only what we need for the purposes in the next section. Specifically:</p>
      <ul>
      <li><strong>Account:</strong> name, email, password (kept only as a secure hash), and, if you use Google sign-in, the name, email and profile identifier Google shares.</li>
      <li><strong>Profile:</strong> phone number, date of birth, gender, location (area, city, state, pincode), profession, interests, and a profile photo if you add one.</li>
      <li><strong>Bookings:</strong> the events you book, ticket quantity and type, the attendee name, email and phone you give at checkout (also for guest bookings), order and invoice records, and check-in status.</li>
      <li><strong>Payments:</strong> amount, status and the payment gateway’s reference numbers. <strong>We never see or store your card, UPI or bank credentials</strong>; you give them directly to Cashfree.</li>
      <li><strong>Talent profile (if you register):</strong> your name or stage name, photo, city, category, description, links to up to four videos, your phone, WhatsApp and email for bookings, and the registration payment record.</li>
      <li><strong>Support:</strong> what you send us when you contact us or raise a ticket: name, email, phone, category and description.</li>
      <li><strong>Technical:</strong> sign-in cookies, your IP address and device and browser details in our server logs, and de-duplicated page-view counts for event pages.</li>
      </ul>
      <h2 id="how-we-use" className="scroll-mt-6">3. Why we use it</h2>
      <ul>
      <li>Create and secure your account and sign you in.</li>
      <li>Process bookings and payments, issue tickets and tax invoices, run entry check-in, and process refunds.</li>
      <li>Show your talent profile in the directory and, with your consent, share your contact details with approved Organizers.</li>
      <li>Send service messages: confirmations, tickets, payment and refund updates, verification codes and security notices.</li>
      <li>Suggest events using your stated location and interests.</li>
      <li>Give Organizers aggregate analytics for their events (for example views against purchases), not your individual browsing.</li>
      <li>Answer support requests and complaints, and keep records of them.</li>
      <li>Detect and prevent fraud and abuse, and keep the Platform secure.</li>
      <li>Meet legal duties, including tax, accounting and record-keeping.</li>
      </ul>
      <h2 id="consent" className="scroll-mt-6">4. Consent and other lawful grounds</h2>
      <p>We process your data on the basis of your <strong>consent</strong>, given when you sign up (we record the time and the version of the terms you accepted) and when you take actions such as booking or submitting a form, and for the limited uses the DPDP Act allows without consent, such as meeting a legal duty or responding to a medical or safety emergency. Your consent is for the purposes listed above only.</p>
      <p><strong>You can withdraw consent at any time</strong>, as easily as you gave it: delete your account (see <em>Your rights</em>). Withdrawing does not affect what we did before, and does not remove records we must keep by law. If you withdraw consent for something we need to provide the service, we may no longer be able to provide it.</p>
      <h2 id="sharing" className="scroll-mt-6">5. Who we share data with</h2>
      <p><strong>We do not sell your personal data.</strong> We share it only like this:</p>
      <ul>
      <li><strong>Organizers:</strong> when you book, the details needed to run the event (attendee name, contact details, ticket details and check-in status) go to that event’s Organizer. The Organizer becomes an independent data fiduciary for that data, may use it only to run that event, and may not sell it or use it for unrelated marketing.</li>
      <li><strong>Approved Organizers, if you are Talent:</strong> your phone, WhatsApp and email, through our “Find talent” tool, so they can offer you work. Everyone else sees only your public profile.</li>
      <li><strong>Payment gateway (Cashfree):</strong> to take payments and make refunds. You give your payment details directly to them.</li>
      <li><strong>Service providers who process data for us:</strong> Hetzner (our servers and database), Cloudflare (website delivery, security and analytics), Amazon Web Services (storage of uploaded images and documents) and our own mail server (email). They act on our instructions under their service terms and must keep the data secure.</li>
      <li><strong>Google:</strong> if you choose “Sign in with Google”, sign-in is handled by Google under its own privacy policy.</li>
      <li><strong>Authorities:</strong> where the law, a court order or a lawful request requires, or to protect the rights and safety of users or the public.</li>
      </ul>
      <h2 id="outside-india" className="scroll-mt-6">6. Where your data is kept and transfers outside India</h2>
      <p>Our database and application servers are hosted with Hetzner in <strong>Germany</strong>. Website delivery runs on Cloudflare’s global network, so pages and files may pass through or be cached at locations around the world. Uploaded images and documents are stored in India (Amazon Web Services, Mumbai). The DPDP Act allows transfer of personal data outside India except to countries the Central Government restricts; we will not transfer data to any country it restricts, and we will follow any further rule it makes.</p>
      <h2 id="cookies" className="scroll-mt-6">7. Cookies and analytics</h2>
      <ul>
      <li><strong>Essential cookies:</strong> secure, httpOnly cookies keep you signed in. The site cannot work without them, and we do not use them for advertising.</li>
      <li><strong>Analytics:</strong> we measure page performance and overall usage through our hosting provider, and count event-page views once per visitor per day. We do not run third-party advertising trackers.</li>
      </ul>
      <h2 id="retention" className="scroll-mt-6">8. How long we keep data</h2>
      <ul>
      <li><strong>Account and profile:</strong> while your account exists. When you delete it, it is removed after a 24-hour grace period.</li>
      <li><strong>Orders, invoices, credit notes, tax and payout records:</strong> we must keep these for the period tax and accounting law requires (at least six years), even after you delete your account. Where possible we keep them without your profile details.</li>
      <li><strong>Talent and booking records:</strong> with your account, and with the order records above where money is involved.</li>
      <li><strong>Server and access logs:</strong> at least one year, as the DPDP Rules require, then deleted.</li>
      <li><strong>Support tickets and complaints:</strong> three years after they are closed.</li>
      <li><strong>Backups:</strong> database backups are kept for a limited period (currently up to 60 days). Data deleted from our live systems leaves the backups when they expire.</li>
      </ul>
      <h2 id="security" className="scroll-mt-6">9. How we protect it</h2>
      <p>We use reasonable safeguards for the data we hold: passwords are stored hashed; sessions use short-lived signed tokens in httpOnly cookies; tickets carry signed QR codes; traffic is encrypted in transit (HTTPS); our database is not reachable from the internet; uploaded identity and agreement documents are stored privately; access to production systems is limited to authorised people and our administrators use two-step verification; keys and passwords are rotated; we keep backups only for a limited time; and we keep logs so that misuse can be detected and investigated. No system is perfectly secure.</p>
      <p><strong>If there is a personal data breach</strong>, we will tell each affected person without delay, in plain language, what happened, what it may mean for you, what we are doing, and what you can do. We will also report it to the Data Protection Board of India as the DPDP Rules require, including a detailed report within 72 hours.</p>
      <h2 id="rights" className="scroll-mt-6">10. Your rights and how to use them</h2>
      <p>Under the DPDP Act you have the right to:</p>
      <ul>
      <li><strong>Access:</strong> get a summary of the personal data we hold about you, what we do with it, and who we have shared it with.</li>
      <li><strong>Correction and updating:</strong> correct inaccurate data, complete incomplete data, and update it.</li>
      <li><strong>Erasure:</strong> ask us to delete your data, other than data we must keep by law.</li>
      <li><strong>Grievance redressal:</strong> complain to us about how we handle your data (see below).</li>
      <li><strong>Nomination:</strong> name someone to exercise these rights for you if you die or cannot act. Write to <a href="mailto:grievance@baatasari.com">grievance@baatasari.com</a> to record a nomination.</li>
      </ul>
      <p>You can see and edit your details under <a href="/profile">Profile</a>. You can delete your account under <strong>Profile → Security → Delete account</strong>, confirmed with a one-time code. For anything else, email <a href="mailto:grievance@baatasari.com">grievance@baatasari.com</a> from the email address on your account (we need it, or your phone number, to be sure it is you) and say what you want. We acknowledge within 24 hours and complete rights requests within 30 days.</p><p><strong>Guest bookings:</strong> if you booked without an account, email us from the address you booked with and quote the order number; we can then give you access to, or delete, that data (apart from records we must keep).</p>
      <h2 id="children" className="scroll-mt-6">11. Children</h2>
      <p>The Platform is for people aged <strong>18 and over</strong>. We do not knowingly collect children’s personal data and we do not offer accounts to anyone under 18. If you believe a child has given us data, tell the Grievance Officer and we will delete it.</p>
      <h2 id="complaints" className="scroll-mt-6">12. Complaints and the Data Protection Board</h2>
      <p>Please first raise any complaint about your personal data with our Grievance Officer at <a href="mailto:grievance@baatasari.com">grievance@baatasari.com</a>. We acknowledge within 24 hours and aim to resolve it within 15 days, and in any case within the 90 days the DPDP Rules allow at most. If you are not satisfied, you may complain to the Data Protection Board of India under the DPDP Act once it is receiving complaints. More on our <a href="/grievance">Grievance Redressal</a> page.</p>
      <h2 id="changes" className="scroll-mt-6">13. Changes to this notice</h2>
      <p>We will update this notice when our practices change. The effective date above shows the latest version, and we tell you about material changes on the Platform and by email.</p>
    </LegalPage>
  )
}
