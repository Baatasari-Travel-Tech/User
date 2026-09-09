"use client"

import {
  ArrowRight,
  Handshake,
  Lock,
  ShieldCheck,
  Sparkles,
  Tag,
} from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion, type Variants } from "framer-motion"

const FEATURES = [
  { icon: Tag, title: "₹299 Lifetime", description: "One payment, once. No subscription, nothing to renew, nothing that lapses." },
  { icon: Handshake, title: "Direct Connections", description: "Connect directly with verified businesses and organizers." },
  { icon: ShieldCheck, title: "Verified Businesses", description: "Every business is verified for your safety and trust." },
  { icon: Lock, title: "Secure Payments", description: "Get paid securely with clear transactions and reports." },
] as const

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}

export function TalentInformationForm() {
  return (
    <section className="relative isolate flex min-h-[calc(100dvh-72px)] w-full flex-col md:h-[calc(100dvh-72px)] md:overflow-hidden">
      {/* Background image */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/talent-hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hidden object-cover object-bottom md:block"
        />
        <Image
          src="/talents-hero-mobile.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover md:hidden"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-background/25 md:via-background/45 md:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>

      {/* Hero copy */}
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 -translate-y-6 flex-col justify-center px-5 pt-6 pb-6 sm:translate-y-0 sm:px-6 lg:px-10">
        <motion.div variants={container} initial="hidden" animate="show" className="max-w-xl">
          <motion.span
            variants={item}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-(--gold-bar-border) bg-(--gold-bar-bg)/80 px-4 py-1.5 text-sm font-medium text-(--gold-text) backdrop-blur-sm sm:mb-6"
          >
            <Sparkles className="h-4 w-4" />
            For creators, performers &amp; pros
          </motion.span>

          <motion.h1
            variants={item}
            className="font-bricolage text-4xl font-bold leading-[1.03] tracking-[-0.02em] text-(--brand-navy) sm:text-6xl lg:text-7xl"
          >
            Turn Your Talent
            <br />
            Into <span className="text-(--gold)">Opportunities</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-4 max-w-md font-albert text-base leading-7 text-(--gray-600) sm:mt-7 sm:text-lg sm:leading-8"
          >
            Baatasari connects talented people with cafés, events, venues and
            brands across Vizag. Share your talent. Get discovered. Get booked.
          </motion.p>

          <motion.div variants={item} className="mt-6 sm:mt-9">
            <Link
              href="/talent/onboarding"
              className="group inline-flex h-14 items-center justify-center gap-3 rounded-full bg-(--brand-navy) px-8 font-poppins text-base font-semibold text-white shadow-lg shadow-(--brand-navy)/25 transition-all hover:scale-[1.03] hover:bg-(--brand-navy)/90"
            >
              Register as Talent
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Feature bar */}
      <div className="mx-auto w-full max-w-[1400px] px-5 pb-6 sm:px-6 lg:px-10 lg:pb-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-2 gap-0 overflow-hidden rounded-[1.5rem] border border-(--gold-bar-border) bg-(--gold-bar-bg)/90 p-0 shadow-[0_20px_50px_-25px_rgba(12,29,55,0.3)] backdrop-blur-sm sm:grid-cols-2 sm:gap-8 sm:p-8 lg:grid-cols-4"
        >
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className={`flex min-h-[6rem] items-center gap-2 p-2.5 sm:min-h-0 sm:items-start sm:gap-4 sm:border-0 sm:p-0 ${
                  i % 2 === 0 ? "border-r border-(--gold-icon)/40" : ""
                } ${i < 2 ? "border-b border-(--gold-icon)/40" : ""}`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--gold-soft-bg) text-(--gold-icon) sm:h-12 sm:w-12">
                  <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h3 className="font-albert text-[11px] font-bold leading-tight text-(--brand-navy) sm:text-base">
                    {f.title}
                  </h3>
                  <p className="font-albert mt-0.5 text-[10px] leading-[1.35] text-(--gray-500) sm:text-sm sm:leading-6">
                    {f.description}
                  </p>
                </div>
              </div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
