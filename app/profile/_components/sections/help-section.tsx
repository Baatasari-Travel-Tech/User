import Link from "next/link"
import { ChevronRight, HelpCircle, Lock, Mail, Shield } from "lucide-react"
import { SectionHeader } from "../field-primitives"

export function HelpSection() {
  return (
    <div className="space-y-5">
      <SectionHeader icon={HelpCircle} title="Help & support" subtitle="We&apos;re here to help." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/contact-us" className="group block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <Mail className="h-5 w-5 text-(--brand-blue)" />
          <p className="mt-3 text-sm font-semibold text-slate-900">Contact us</p>
          <p className="mt-1 text-xs text-slate-500">Reach out for support. We reply within 24 hours.</p>
          <p className="mt-3 inline-flex items-center text-xs font-semibold text-(--brand-blue) group-hover:underline">
            Open <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </p>
        </Link>
        <Link href="/terms-and-conditions" className="group block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <Shield className="h-5 w-5 text-(--brand-blue)" />
          <p className="mt-3 text-sm font-semibold text-slate-900">Terms &amp; policies</p>
          <p className="mt-1 text-xs text-slate-500">Read our terms of service and acceptable-use policy.</p>
          <p className="mt-3 inline-flex items-center text-xs font-semibold text-(--brand-blue) group-hover:underline">
            Open <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </p>
        </Link>
        <Link href="/privacy-policy" className="group block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <Lock className="h-5 w-5 text-(--brand-blue)" />
          <p className="mt-3 text-sm font-semibold text-slate-900">Privacy policy</p>
          <p className="mt-1 text-xs text-slate-500">How we collect, use, and protect your data.</p>
          <p className="mt-3 inline-flex items-center text-xs font-semibold text-(--brand-blue) group-hover:underline">
            Open <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </p>
        </Link>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-(--brand-navy) to-(--brand-blue) p-6 text-white shadow-lg">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">App version</p>
        <p className="mt-1 text-lg font-semibold">Baatasari · v1.0</p>
        <p className="mt-1 text-xs text-white/70">Built for personalized experiences in Vizag.</p>
      </div>
    </div>
  )
}
