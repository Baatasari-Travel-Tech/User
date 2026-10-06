import type { Metadata } from "next"
import { LegalPage } from "@/components/legal-page"

export const metadata: Metadata = {
  title: "Grievance Redressal",
  description: "How to complain to Baatasari's Grievance Officer, how fast we respond, and where else you can take a complaint.",
  alternates: { canonical: "/grievance" },
}

export default function Page() {
  return (
    <LegalPage
      title="Grievance Redressal"
      standfirst="Effective 6 October 2026. Published as the Consumer Protection (E-Commerce) Rules, 2020, the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the Digital Personal Data Protection Act, 2023 require."
      updated="6 October 2026"
    >
      <h2 id="officer" className="scroll-mt-6">Grievance Officer</h2>
      <div className="legal-card"><dl>
      <dt>Name</dt><dd>Simha Karthik Reddy</dd>
      <dt>Designation</dt><dd>Proprietor and Grievance Officer</dd>
      <dt>Email</dt><dd><a href="mailto:grievance@baatasari.com">grievance@baatasari.com</a></dd>
      <dt>Address</dt><dd>Sathyamjee Layout, Navalak Gardens, Nellore, Andhra Pradesh – 524002</dd>
      </dl></div>
      <h2 id="raise" className="scroll-mt-6">How to complain</h2>
      <p>Write to <a href="mailto:grievance@baatasari.com">grievance@baatasari.com</a>, or raise a ticket from Help while signed in. Please include:</p>
      <ul>
      <li>your name and the email or phone number on your account;</li>
      <li>the order number, event or fee the complaint is about;</li>
      <li>what went wrong and what you would like us to do; and</li>
      <li>any screenshots or documents that help.</li>
      </ul>
      <p>The same address takes complaints about content on the Platform, about refunds and payments, and about your personal data.</p>
      <h2 id="timelines" className="scroll-mt-6">How fast we respond</h2>
      <ul>
      <li>We <strong>acknowledge</strong> your complaint within <strong>24 hours</strong>.</li>
      <li>We <strong>resolve</strong> it within <strong>15 days</strong> of receiving it.</li>
      <li>For a request to see, correct or delete your personal data, we aim to finish within <strong>30 days</strong>; the DPDP Rules allow at most 90 days for a grievance about your data.</li>
      </ul>
      <h2 id="elsewhere" className="scroll-mt-6">If you are not satisfied</h2>
      <ul>
      <li><strong>Consumer complaints:</strong> you can call the National Consumer Helpline on 1915, or file a case with the Consumer Commission, including online at e-daakhil.nic.in.</li>
      <li><strong>Personal data:</strong> after raising it with us, you may complain to the Data Protection Board of India under the DPDP Act.</li>
      <li><strong>Decisions on content complaints:</strong> you may appeal to the Grievance Appellate Committee under Rule 3A of the IT Rules, 2021, within 30 days of our decision.</li>
      </ul>
      <h2 id="operator" className="scroll-mt-6">Business and operator details</h2>
      <div className="legal-card"><dl>
      <dt>Platform</dt><dd>Baatasari (baatasari.com, organizer.baatasari.com, venue.baatasari.com)</dd>
      <dt>Legal name</dt><dd>Simha Karthik Reddy</dd>
      <dt>Trade name</dt><dd>BAATASARI</dd>
      <dt>Constitution</dt><dd>Proprietorship</dd>
      <dt>GSTIN</dt><dd>37HRGPR8105H1ZD</dd>
      <dt>Principal place of business</dt><dd>Sathyamjee Layout, Navalak Gardens, Nellore, Andhra Pradesh – 524002</dd>
      <dt>General contact</dt><dd><a href="mailto:contact-us@baatasari.com">contact-us@baatasari.com</a></dd>
      </dl></div>
    </LegalPage>
  )
}
