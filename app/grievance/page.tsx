import type { Metadata } from "next"
import { SiteFooter } from "@/components/site-footer"

export const metadata: Metadata = {
  title: "Grievance Redressal",
  description:
    "Grievance Officer and complaint redressal details for Baatasari, as required under the Consumer Protection (E-Commerce) Rules, 2020 and the IT Rules, 2021.",
  alternates: { canonical: "/grievance" },
}

export default function GrievanceRedressal() {
  return (
    <>
    <div className="mx-auto max-w-5xl px-6 py-10 text-gray-800">
      <h1 className="mb-2 text-3xl font-bold">Grievance Redressal</h1>
      <p className="mb-8 text-sm text-gray-500">
        Published as required under the Consumer Protection (E-Commerce) Rules, 2020,
        the Information Technology (Intermediary Guidelines) Rules, 2021, and the
        Digital Personal Data Protection Act, 2023.
      </p>

      {/* Grievance Officer */}
      <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="mb-3 text-xl font-semibold">Grievance Officer</h2>
        <dl className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-[140px_1fr]">
          <dt className="font-semibold text-slate-600">Name</dt>
          <dd>Simha Karthik Reddy</dd>
          <dt className="font-semibold text-slate-600">Designation</dt>
          <dd>Proprietor &amp; Grievance Officer</dd>
          <dt className="font-semibold text-slate-600">Email</dt>
          <dd>
            <a className="text-blue-600 hover:underline" href="mailto:grievance@baatasari.com">
              grievance@baatasari.com
            </a>
          </dd>
          <dt className="font-semibold text-slate-600">Address</dt>
          <dd>
            28/1A-4-145/41, Sathyamjee Layout, Navalak Gardens, Nellore,
            Sri Potti Sriramulu Nellore, Andhra Pradesh – 524002
          </dd>
        </dl>
      </div>

      {/* How to raise */}
      <h2 className="mb-2 mt-6 text-xl font-semibold">How to raise a complaint</h2>
      <p className="mb-4">
        If you have any complaint or concern about an event, a booking, a payment, a
        refund, or how your personal data is handled, please write to the Grievance
        Officer at{" "}
        <a className="text-blue-600 hover:underline" href="mailto:grievance@baatasari.com">
          grievance@baatasari.com
        </a>{" "}
        with the following details:
      </p>
      <ul className="mb-4 list-disc pl-6">
        <li>Your name and registered email / phone</li>
        <li>The order number or event name</li>
        <li>A clear description of the issue and what you would like resolved</li>
        <li>Any supporting screenshots or documents</li>
      </ul>

      {/* Timelines */}
      <h2 className="mb-2 mt-6 text-xl font-semibold">Our response commitment</h2>
      <ul className="mb-4 list-disc pl-6">
        <li>
          We will <strong>acknowledge</strong> your complaint within{" "}
          <strong>48 hours</strong> of receipt.
        </li>
        <li>
          We will endeavour to <strong>resolve</strong> it within{" "}
          <strong>one (1) month</strong> from the date of receipt.
        </li>
        <li>
          For data-protection grievances under the DPDP Act, we will respond within
          the timelines prescribed under the Act.
        </li>
      </ul>

      {/* Business / operator details */}
      <h2 className="mb-2 mt-6 text-xl font-semibold">Business &amp; operator details</h2>
      <dl className="mb-4 grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-[180px_1fr]">
        <dt className="font-semibold text-slate-600">Platform</dt>
        <dd>Baatasari (baatasari.com)</dd>
        <dt className="font-semibold text-slate-600">Legal name</dt>
        <dd>Simha Karthik Reddy</dd>
        <dt className="font-semibold text-slate-600">Trade name</dt>
        <dd>BAATASARI</dd>
        <dt className="font-semibold text-slate-600">Constitution</dt>
        <dd>Proprietorship</dd>
        <dt className="font-semibold text-slate-600">GSTIN</dt>
        <dd>37HRGPR8105H1ZD</dd>
        <dt className="font-semibold text-slate-600">Principal place of business</dt>
        <dd>
          28/1A-4-145/41, Sathyamjee Layout, Navalak Gardens, Nellore,
          Sri Potti Sriramulu Nellore, Andhra Pradesh – 524002
        </dd>
      </dl>

      <p className="mt-10 text-sm text-gray-500">Last updated: June 2026</p>
    </div>
    <SiteFooter />
    </>
  )
}
