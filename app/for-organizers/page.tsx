import { Fragment } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleMinus,
  ClipboardList,
  Compass,
  FileText,
  Heart,
  IndianRupee,
  Instagram,
  Mail,
  MessageCircle,
  MonitorSmartphone,
  QrCode,
  Rocket,
  ShieldCheck,
  Smartphone,
  Smile,
  Sparkles,
  Star,
  Target,
  Ticket,
  UserCheck,
  UserRound,
  Users,
  Zap,
} from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'
import { Illustration } from './illustration'

export const metadata: Metadata = {
  title: 'For Organizers',
  description:
    'Baatasari quietly handles bookings, payments, tickets and check-ins, so you can focus on what people came for. Create your first event in under 5 minutes — free.',
  alternates: { canonical: '/for-organizers' },
}

const REGISTER_HREF = '/for-organizers?auth=register&role=organizer'

const TRUST_POINTS = ['Takes less than 5 minutes', 'No setup fee', 'Start free']

const ATTENDEE_PAINS = [
  'Fill the same details every time',
  'Switch between apps to register',
  'Send payment screenshots',
  'Wait for confirmation from you',
  'Wonder if the ticket is really confirmed',
]

const ORGANIZER_PAINS = [
  'Hundreds of WhatsApp messages',
  'Verify every payment manually',
  'Send tickets one by one',
  'Manage spreadsheets and lists',
  'Answer the same questions repeatedly',
]

const OLD_WAY_STEPS = [
  { label: 'Instagram Post', icon: Instagram },
  { label: 'Google Form', icon: FileText },
  { label: 'UPI Payment', icon: IndianRupee },
  { label: 'Screenshot', icon: Smartphone },
  { label: 'WhatsApp Message', icon: MessageCircle },
  { label: 'Manual Verification', icon: UserCheck },
  { label: 'Ticket Sent Manually', icon: Mail },
  { label: 'Manual Entry', icon: ClipboardList },
]

const NEW_WAY_STEPS = [
  { label: 'Discover Event', icon: Compass },
  { label: 'Register', icon: UserRound },
  { label: 'Secure Payment', icon: ShieldCheck },
  { label: 'Instant Ticket', icon: Ticket },
  { label: 'QR Check-in', icon: QrCode },
  { label: 'Enjoy the Event', icon: Smile },
]

const AUTOMATIC_POINTS = [
  'No screenshots',
  'No spreadsheets',
  'No manual verification',
  'No repeated questions',
  'No WhatsApp chaos',
  'No waiting',
]

const WHY_CARDS = [
  {
    title: 'Reach people already looking for events',
    body: 'Get discovered by the right audience.',
    icon: Target,
    iconClass: 'bg-rose-50 text-rose-600',
  },
  {
    title: 'Deliver tickets instantly',
    body: 'Tickets are generated and delivered in seconds.',
    icon: Zap,
    iconClass: 'bg-amber-50 text-amber-500',
  },
  {
    title: 'Beautiful event page',
    body: 'A professional page that builds trust and increases conversions.',
    icon: MonitorSmartphone,
    iconClass: 'bg-blue-50 text-blue-600',
  },
  {
    title: 'Know your sales in real time',
    body: 'Track tickets, revenue and attendance as it happens.',
    icon: BarChart3,
    iconClass: 'bg-indigo-50 text-indigo-600',
  },
  {
    title: 'QR check-ins in seconds',
    body: 'Welcome attendees in seconds with secure QR entry.',
    icon: QrCode,
    iconClass: 'bg-emerald-50 text-emerald-600',
  },
  {
    title: 'Give attendees a premium experience',
    body: 'Smooth, fast and hassle-free from start to finish.',
    icon: Star,
    iconClass: 'bg-(--gold-soft-bg) text-(--gold)',
  },
]

function CreateEventCta() {
  return (
    <Link
      href={REGISTER_HREF}
      className="inline-flex items-center gap-2 rounded-full bg-(--brand-navy) px-7 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-(--brand-navy-hover) hover:shadow-lg active:scale-95"
    >
      Create Your First Event
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  )
}

function TrustRow() {
  return (
    <ul className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
      {TRUST_POINTS.map((point) => (
        <li key={point} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
          {point}
        </li>
      ))}
    </ul>
  )
}

const WAY_TONES = {
  old: {
    strip: 'border-rose-100/80 bg-rose-50/70',
    pill: 'bg-rose-100 text-rose-700',
    tile: 'border-rose-100 text-rose-500',
    badge: 'bg-rose-500 text-white',
  },
  new: {
    strip: 'border-emerald-100/80 bg-emerald-50/70',
    pill: 'bg-emerald-100 text-emerald-700',
    tile: 'border-emerald-100 text-emerald-600',
    badge: 'bg-emerald-600 text-white',
  },
} as const

function WayRow({
  title,
  steps,
  tone,
}: {
  title: string
  steps: readonly { label: string; icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }[]
  tone: keyof typeof WAY_TONES
}) {
  const t = WAY_TONES[tone]
  return (
    <div className={`rounded-2xl border p-5 sm:p-6 ${t.strip}`}>
      <div className="mb-5">
        <span className={`inline-block rounded-full px-3.5 py-1 text-xs font-bold ${t.pill}`}>{title}</span>
      </div>
      {/* ≥lg: one even row joined by arrows · <lg: numbered wrapping grid (badges keep the order readable) */}
      <ol className="flex flex-wrap gap-y-5 lg:flex-nowrap lg:items-start">
        {steps.map(({ label, icon: Icon }, index) => (
          <Fragment key={label}>
            {index > 0 && (
              <ArrowRight
                className="mt-3.5 hidden h-4 w-4 shrink-0 self-start text-slate-300 lg:block"
                aria-hidden
              />
            )}
            <li className="flex w-1/4 min-w-0 flex-col items-center gap-2 px-1 text-center sm:w-1/5 lg:w-auto lg:flex-1">
              <span
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm ${t.tile}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                <span
                  className={`absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none lg:hidden ${t.badge}`}
                >
                  {index + 1}
                </span>
              </span>
              <span className="text-[11px] font-medium leading-tight text-slate-600">{label}</span>
            </li>
          </Fragment>
        ))}
      </ol>
    </div>
  )
}

function HeroCopy() {
  return (
    <>
      <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
        <span className="text-(--brand-navy)">Create unforgettable experiences.</span>
        <span className="block text-(--gold)">Leave the operations to us.</span>
      </h1>
      <p className="max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
        Baatasari quietly handles bookings, payments, tickets and check-ins, so you can focus
        on what people came for.
      </p>
      <CreateEventCta />
      <TrustRow />
    </>
  )
}

function SparkleHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center justify-center gap-3 text-center text-2xl font-bold text-(--brand-navy) sm:text-3xl">
      <Sparkles className="h-5 w-5 shrink-0 text-(--gold)" aria-hidden />
      {children}
      <Sparkles className="h-5 w-5 shrink-0 text-(--gold)" aria-hidden />
    </h2>
  )
}

export default function ForOrganizersPage() {
  return (
    <main className="bg-white text-slate-900">
      {/* ============ HERO ============ */}
      <section className="bg-[#fbf6f2]">
        {/* Mobile: artwork shown in full (its height sets the section); text layered on top.
            Both children share one grid cell, so the section can never crop the image nor
            clip the text — it's as tall as the taller of the two. */}
        <div className="grid lg:hidden">
          <Illustration
            src="/for-organizers/hero-mobile.png"
            alt="Organizer relaxing at a laptop while their event runs itself"
            width={750}
            height={1200}
            className="col-start-1 row-start-1 w-full"
          />
          <div className="z-10 col-start-1 row-start-1 space-y-4 px-4 pt-8 sm:px-6">
            <HeroCopy />
          </div>
        </div>

        {/* Desktop: two-column hero */}
        <div className="page-x hidden items-center gap-14 pb-20 pt-8 lg:grid lg:grid-cols-[1fr_1.05fr]">
          <div className="space-y-6">
            <HeroCopy />
          </div>
          <Illustration
            src="/for-organizers/hero.png"
            alt="Organizer relaxing at a laptop while their event runs itself"
            width={1016}
            height={981}
            className="-mt-8 w-full"
          />
        </div>
      </section>

      {/* ============ ATTENDEE vs ORGANIZER PAIN ============ */}
      <section className="page-x py-16">
        <div className="max-w-2xl text-left sm:mx-auto sm:text-center">
          <h2 className="text-2xl font-bold text-(--brand-navy) sm:text-3xl">
            Every Event Starts With Excitement.
          </h2>
          <p className="mt-2 text-lg font-semibold text-(--gold)">
            Your attendees remember the registration process.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* Attendees */}
          <div className="relative overflow-hidden rounded-3xl border border-rose-100 bg-rose-50/60 py-6 pl-4 pr-4 sm:p-8">
            <div className="relative z-10 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <Users className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="text-base font-bold text-rose-600">
                What your attendees experience
              </h3>
            </div>
            <div className="mt-5 sm:grid sm:grid-cols-[1.3fr_1fr] sm:items-end sm:gap-6">
              <ul className="relative z-10 space-y-3.5">
                {ATTENDEE_PAINS.map((pain) => (
                  <li
                    key={pain}
                    className="flex items-start gap-2 whitespace-nowrap text-xs text-slate-700 sm:gap-2.5 sm:whitespace-normal sm:text-sm"
                  >
                    <CircleMinus className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden />
                    {pain}
                  </li>
                ))}
              </ul>
              <Illustration
                src="/for-organizers/attendee.png"
                alt="Attendee frustrated with a confusing registration on their phone"
                width={900}
                height={1200}
                className="absolute -right-2 top-[58%] w-[36%] -translate-y-1/2 sm:static sm:right-auto sm:top-auto sm:-mb-8 sm:w-full sm:translate-y-0"
              />
            </div>
          </div>

          {/* Organizers */}
          <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-blue-50/60 py-6 pl-4 pr-4 sm:p-8">
            <div className="relative z-10 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <UserRound className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="text-base font-bold text-blue-700">What you experience</h3>
            </div>
            <div className="mt-5 sm:grid sm:grid-cols-[1.3fr_1fr] sm:items-end sm:gap-6">
              <ul className="relative z-10 space-y-3.5">
                {ORGANIZER_PAINS.map((pain) => (
                  <li
                    key={pain}
                    className="flex items-start gap-2 whitespace-nowrap text-xs text-slate-700 sm:gap-2.5 sm:whitespace-normal sm:text-sm"
                  >
                    <CircleMinus className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" aria-hidden />
                    {pain}
                  </li>
                ))}
              </ul>
              <Illustration
                src="/for-organizers/organizer.png"
                alt="Organizer buried in WhatsApp messages and spreadsheets"
                width={900}
                height={1200}
                className="absolute -right-2 top-[58%] w-[36%] -translate-y-1/2 sm:static sm:right-auto sm:top-auto sm:-mb-8 sm:w-full sm:translate-y-0"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============ OLD WAY vs BAATASARI WAY ============ */}
      <section className="page-x pb-16">
        <SparkleHeading>The Old Way vs The Baatasari Way</SparkleHeading>

        <div className="mt-10 space-y-4">
          <WayRow title="The Old Way" steps={OLD_WAY_STEPS} tone="old" />
          <WayRow title="The Baatasari Way" steps={NEW_WAY_STEPS} tone="new" />

          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-[#fbf4e4] px-6 py-6 text-center text-sm sm:flex-row sm:flex-wrap sm:bg-emerald-50 sm:py-4">
            <Heart className="h-6 w-6 text-(--gold) sm:h-4 sm:w-4 sm:text-emerald-600" aria-hidden />
            <p>
              <span className="block font-bold text-(--brand-navy) sm:inline">
                The best events feel effortless.
              </span>{' '}
              <span className="block font-bold text-(--brand-navy) sm:inline sm:font-normal sm:text-slate-600">
                Your registration process should too.
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* ============ IMAGINE IT'S AUTOMATIC ============ */}
      <section className="page-x pb-16">
        <div className="grid items-center gap-10 overflow-hidden rounded-3xl bg-[#fbf4e4] px-8 pt-8 sm:px-10 sm:pt-10 lg:grid-cols-[1fr_1.1fr] lg:px-14 lg:py-0">
          <div>
            <h2 className="text-2xl font-bold leading-snug text-(--brand-navy) sm:text-3xl">
              Imagine If All Of This Happened Automatically
            </h2>
            <ul className="mt-7 space-y-3.5">
              {AUTOMATIC_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <Illustration
            src="/for-organizers/relaxed.png"
            alt="Relaxed organizer enjoying coffee while Baatasari runs the event"
            width={1280}
            height={800}
            className="w-full"
          />
        </div>
      </section>

      {/* ============ WHY ORGANIZERS CHOOSE BAATASARI ============ */}
      <section className="page-x pb-16">
        <SparkleHeading>Why Organizers Choose Baatasari</SparkleHeading>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {WHY_CARDS.map(({ title, body, icon: Icon, iconClass }) => (
            <div
              key={title}
              className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm transition hover:shadow-md"
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-full ${iconClass}`}>
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="text-sm font-bold leading-snug text-(--brand-navy)">{title}</h3>
              <p className="text-xs leading-relaxed text-slate-500">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ CLOSING CTA ============ */}
      <section className="mx-auto w-full max-w-[1400px] pb-16 lg:px-10 lg:pb-20">
        {/* Mobile: full-bleed artwork with centered copy on top, overlapping trust card + CTA */}
        <div className="lg:hidden">
          <div className="grid">
            <Illustration
              src="/for-organizers/crowd-mobile.png"
              alt="Happy crowd enjoying an evening event"
              width={1000}
              height={1560}
              className="col-start-1 row-start-1 w-full"
            />
            <div className="z-10 col-start-1 row-start-1 px-6 pt-8 text-center">
              <h2 className="text-3xl font-bold leading-tight tracking-tight">
                <span className="text-(--brand-navy)">
                  Your attendees should remember your event.
                </span>
                <span className="block text-(--gold)">Not your registration process.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xs text-base leading-relaxed text-slate-600">
                Baatasari handles the details. You create the memories.
              </p>
            </div>
          </div>

          <div className="relative z-10 mx-4 -mt-14 grid grid-cols-4 divide-x divide-slate-100 rounded-3xl border border-slate-100 bg-white/95 py-5 shadow-[0_18px_40px_-20px_rgba(15,23,42,0.25)] backdrop-blur-sm">
            {[
              { label: 'Takes less than 5 minutes', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600' },
              { label: 'No setup fee', icon: IndianRupee, cls: 'bg-amber-50 text-(--gold)' },
              { label: 'Start free', icon: Rocket, cls: 'bg-violet-50 text-violet-600' },
              { label: 'Loved by organizers', icon: Heart, cls: 'bg-rose-50 text-rose-500' },
            ].map(({ label, icon: Icon, cls }) => (
              <div key={label} className="flex flex-col items-center gap-2.5 px-2 text-center">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${cls}`}>
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-[11px] font-medium leading-tight text-slate-800">{label}</span>
              </div>
            ))}
          </div>

          <div className="px-4 pt-6">
            <Link
              href={REGISTER_HREF}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-(--brand-navy) py-4 text-base font-semibold text-white shadow-md transition hover:bg-(--brand-navy-hover) active:scale-95"
            >
              Create Your First Event
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
              Secure. Reliable. Made for organizers like you.
            </p>
          </div>
        </div>

        {/* Desktop: cream two-column card */}
        <div className="hidden items-center gap-10 overflow-hidden rounded-3xl bg-[#fbf4e4] px-14 lg:grid lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              <span className="text-(--brand-navy)">Your attendees should remember your event.</span>{' '}
              <span className="text-(--gold)">Not your registration process.</span>
            </h2>
            <CreateEventCta />
            <TrustRow />
          </div>
          <Illustration
            src="/for-organizers/crowd.png"
            alt="Happy crowd enjoying an evening event"
            width={1280}
            height={800}
            className="w-full"
          />
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
