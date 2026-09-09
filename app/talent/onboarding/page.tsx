"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowRight,
  Award,
  Briefcase,
  CalendarDays,
  Check,
  Globe,
  IndianRupee,
  Instagram,
  Link2,
  Loader2,
  MapPin,
  PenLine,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
  Youtube,
} from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/app/providers"
import { apiRequest } from "@/lib/api/client"
import { loadRazorpayScript } from "@/lib/payments/razorpay"
import { loadCashfree } from "@/lib/payments/cashfree"

const schema = z.object({
  stageName: z.string().min(2, "Enter your stage name"),
  mainSkill: z.string().min(2, "Enter your main skill"),
  experienceLevel: z.string().min(2, "Select your professional level"),
  yearsOfExperience: z.string().min(1, "Select your experience"),
  bio: z.string().min(20, "Tell us a bit more — at least 20 characters"),
  preferredSlots: z.string().min(1, "Pick at least one day"),
  availableFor: z.string().min(1, "Pick at least one work type"),
  location: z.string().min(2, "Choose your base location"),
  expectedPriceBand: z.string().min(1, "Enter your starting price"),
  instagram: z.string().optional(),
  youtube: z.string().optional(),
  website: z.string().optional(),
})

type Values = z.infer<typeof schema>

type TalentOrderResponse = {
  provider: "razorpay" | "cashfree"
  providerKeyId: string
  providerOrderId: string
  paymentSessionId: string
  mode?: "sandbox" | "production"
  amount: number
  currency: string
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
const WORK_TYPES = [
  "Events",
  "Cafes",
  "Restaurants",
  "Corporate Events",
  "Pop-ups",
  "Private Parties",
] as const
const EXPERIENCE = ["Less than 1 year", "1–3 years", "3–5 years", "5+ years"] as const
const LEVELS = ["Beginner", "Intermediate", "Professional", "Expert"] as const
const CITIES = [
  "Visakhapatnam, Andhra Pradesh",
  "Vijayawada, Andhra Pradesh",
  "Hyderabad, Telangana",
  "Bengaluru, Karnataka",
  "Chennai, Tamil Nadu",
] as const
const WHAT_YOU_GET = [
  "Discoverable by cafés, events & brands",
  "Direct booking requests, no middlemen",
  "Verified talent profile & dashboard",
] as const

const MAIN_SKILLS: { group: string; options: string[] }[] = [
  { group: "Hosting & Speaking", options: ["Event Anchor", "Public Speaker"] },
  { group: "Music", options: ["Singer", "Band", "DJ"] },
  { group: "Dance", options: ["Dancer", "Choreographer", "Flash Mob Team", "Cultural Performer"] },
  { group: "Comedy & Variety", options: ["Stand-up Comedian", "Mimicry Artist", "Ventriloquist", "Beatboxer"] },
  { group: "Art", options: ["Live Painter", "Sketch Artist", "Calligraphy Artist", "Caricature Artist", "Craft Artist", "Face Painter"] },
  { group: "Photo & Video", options: ["Photographer", "Videographer", "Cinematographer", "Video Editor", "Content Creator"] },
  { group: "Fashion & Beauty", options: ["Makeup Artist", "Hair Stylist", "Fashion Stylist", "Model", "Fashion Choreographer"] },
  { group: "Other", options: ["Event Coordinator", "Fitness Trainer"] },
]

const inputClass =
  "mt-2 w-full rounded-xl border border-(--gold-bar-border) bg-(--gold-bar-bg)/30 px-4 py-3 font-albert text-sm text-(--brand-navy) outline-none transition placeholder:text-(--gray-400) focus:border-(--brand-navy) focus:bg-white focus:ring-4 focus:ring-(--brand-navy)/10"

function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <label className="flex items-center gap-1.5 font-albert text-sm font-semibold text-(--brand-navy)">
      <Icon className="h-4 w-4 text-(--gold-icon)" />
      {children}
    </label>
  )
}

function SectionCard({
  icon: Icon,
  step,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  step: number
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-(--gold-bar-border) bg-white/90 p-5 shadow-[0_18px_50px_-32px_rgba(12,29,55,0.4)] backdrop-blur-sm sm:p-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--gold-soft-bg) text-(--gold-icon)">
          <Icon className="h-5 w-5" />
        </span>
        <div className="pt-0.5">
          <h2 className="font-bricolage text-lg font-bold leading-tight text-(--brand-navy) sm:text-xl">
            <span className="text-(--gold)">{step}.</span> {title}
          </h2>
          {hint ? (
            <p className="mt-0.5 font-albert text-xs text-(--gray-500) sm:text-sm">{hint}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 font-albert text-sm font-semibold transition active:scale-[0.98] ${
        active
          ? "border-(--gold) bg-(--gold-soft-bg) text-(--brand-navy) shadow-sm"
          : "border-(--gold-bar-border) bg-white text-(--gray-600) hover:border-(--gold)/60 hover:text-(--brand-navy)"
      }`}
    >
      {children}
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition ${
          active ? "bg-(--gold) text-white" : "border border-(--gold-bar-border)"
        }`}
      >
        {active ? <Check className="h-3 w-3" /> : null}
      </span>
    </button>
  )
}

export default function TalentOnboardingPage() {
  const router = useRouter()
  const { talentProfile } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      stageName: talentProfile?.stageName ?? "",
      mainSkill: talentProfile?.mainSkill ?? "",
      experienceLevel: talentProfile?.experienceLevel ?? "",
      yearsOfExperience: talentProfile?.yearsOfExperience ?? "",
      bio: talentProfile?.bio ?? "",
      preferredSlots: talentProfile?.preferredSlots.join(", ") ?? "",
      availableFor: talentProfile?.availableFor.join(", ") ?? "",
      location: talentProfile?.location ?? "",
      expectedPriceBand: talentProfile?.expectedPriceBand ?? "",
      instagram: "",
      youtube: "",
      website: talentProfile?.portfolioLinks?.[0] ?? "",
    },
  })

  useEffect(() => {
    form.reset({
      stageName: talentProfile?.stageName ?? "",
      mainSkill: talentProfile?.mainSkill ?? "",
      experienceLevel: talentProfile?.experienceLevel ?? "",
      yearsOfExperience: talentProfile?.yearsOfExperience ?? "",
      bio: talentProfile?.bio ?? "",
      preferredSlots: talentProfile?.preferredSlots.join(", ") ?? "",
      availableFor: talentProfile?.availableFor.join(", ") ?? "",
      location: talentProfile?.location ?? "",
      expectedPriceBand: talentProfile?.expectedPriceBand ?? "",
      instagram: "",
      youtube: "",
      website: talentProfile?.portfolioLinks?.[0] ?? "",
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [talentProfile])

  const errors = form.formState.errors
  const bio = form.watch("bio") ?? ""
  const slots = (form.watch("preferredSlots") ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  const work = (form.watch("availableFor") ?? "").split(",").map((s) => s.trim()).filter(Boolean)

  const toggleList = (field: "preferredSlots" | "availableFor", value: string) => {
    const current = field === "preferredSlots" ? slots : work
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    form.setValue(field, next.join(", "), { shouldValidate: true })
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    setSuccess(null)

    try {
      const orderId = crypto.randomUUID()
      const portfolioLinks = [values.website, values.instagram, values.youtube]
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item))

      const finish = async (extra: Record<string, unknown>) => {
        await apiRequest("/talent/onboarding/complete", {
          method: "POST",
          auth: true,
          body: JSON.stringify({
            orderId,
            stageName: values.stageName,
            mainSkill: values.mainSkill,
            experienceLevel: values.experienceLevel,
            yearsOfExperience: values.yearsOfExperience,
            bio: values.bio,
            preferredSlots: values.preferredSlots.split(",").map((i) => i.trim()).filter(Boolean),
            availableFor: values.availableFor.split(",").map((i) => i.trim()).filter(Boolean),
            location: values.location,
            expectedPriceBand: values.expectedPriceBand,
            portfolioLinks,
            ...extra,
          }),
        })
        setSuccess("Your talent profile is live. Redirecting to your dashboard.")
        router.push("/talent/dashboard")
      }

      const orderResponse = await apiRequest<{ data: { order: TalentOrderResponse } }>(
        "/talent/onboarding/order",
        { method: "POST", auth: true },
      )
      const order = orderResponse.data.order

      if (order.provider === "cashfree") {
        const cashfree = await loadCashfree(order.mode ?? "sandbox")
        const result = await cashfree.checkout({
          paymentSessionId: order.paymentSessionId,
          redirectTarget: "_modal",
        })
        if (result?.error && !result?.paymentDetails && !result?.redirect) {
          setError(result.error.message || "Your payment didn't go through. You can try again.")
          return
        }
        await finish({})
        return
      }

      await loadRazorpayScript()
      const Razorpay = window.Razorpay
      if (!Razorpay) {
        throw new Error("Razorpay failed to load. Please try again.")
      }

      const razorpay = new Razorpay({
        key: order.providerKeyId,
        amount: order.amount * 100,
        currency: order.currency,
        name: "Baatasari Talent",
        description: "Talent onboarding fee",
        order_id: order.providerOrderId,
        theme: { color: "#0c1d37" },
        handler: async (payment: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          await finish({
            razorpayOrderId: payment.razorpay_order_id,
            razorpayPaymentId: payment.razorpay_payment_id,
            razorpaySignature: payment.razorpay_signature,
          })
        },
      })

      razorpay.open()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.",
      )
    }
  })

  const submitting = form.formState.isSubmitting

  return (
    <ProtectedRoute>
      <main className="bg-(--background)">
        <form
          onSubmit={onSubmit}
          className="lg:grid lg:min-h-[calc(100dvh-72px)] lg:grid-cols-[23rem_minmax(0,1fr)] xl:grid-cols-[27rem_minmax(0,1fr)]"
        >
          {/* ===================== Desktop context / checkout rail ===================== */}
          <aside className="relative hidden overflow-hidden bg-(--brand-navy) lg:sticky lg:top-[72px] lg:flex lg:h-[calc(100dvh-72px)] lg:flex-col">
            {/* dot-grid texture */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.15]"
              style={{
                backgroundImage:
                  "radial-gradient(color-mix(in srgb, var(--gold) 55%, transparent) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
                maskImage: "radial-gradient(ellipse 75% 60% at 30% 35%, black 20%, transparent 75%)",
                WebkitMaskImage: "radial-gradient(ellipse 75% 60% at 30% 35%, black 20%, transparent 75%)",
              }}
            />
            {/* warm glow */}
            <div
              aria-hidden
              className="absolute -left-1/4 top-1/4 h-96 w-96 rounded-full opacity-40 blur-[120px]"
              style={{
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--gold) 55%, transparent) 0%, transparent 70%)",
              }}
            />
            {/* gold hairline on the seam */}
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-(--gold)/50 to-transparent" />

            <div className="relative z-10 flex h-full flex-col overflow-y-auto p-10 xl:p-12">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 font-poppins text-[11px] font-semibold uppercase tracking-[0.18em] text-(--gold)">
                  <Sparkles className="h-3.5 w-3.5" />
                  Talent onboarding
                </span>
                <h1 className="mt-7 font-bricolage text-4xl font-bold leading-[1.04] text-white xl:text-5xl">
                  Build your
                  <br />
                  talent profile
                </h1>
                <p className="mt-4 max-w-xs font-albert text-sm leading-6 text-white/60">
                  A few details and a one-time fee — then cafés, events and brands across
                  Vizag can discover and book you.
                </p>
              </div>

              <div className="mt-auto space-y-7 pt-12">
                <ul className="space-y-3.5">
                  {WHAT_YOU_GET.map((t) => (
                    <li key={t} className="flex items-start gap-3 font-albert text-sm text-white/80">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--gold)/20 text-(--gold)">
                        <Check className="h-3 w-3" />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>

                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bricolage text-3xl font-bold text-white">₹299</span>
                    <span className="font-albert text-xs text-white/55">lifetime</span>
                  </div>
                  <p className="mt-1 font-albert text-[11px] leading-4 text-white/55">
                    Inclusive of all taxes &amp; payment charges
                  </p>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="group mt-4 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-(--gold) px-6 font-poppins text-base font-bold text-(--brand-navy) shadow-[0_14px_40px_-12px_rgba(194,150,46,0.9)] transition-all hover:scale-[1.02] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Processing…
                      </>
                    ) : (
                      <>
                        Pay ₹299 &amp; submit
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                  <p className="mt-3 flex items-center justify-center gap-1.5 font-albert text-[11px] text-white/55">
                    <ShieldCheck className="h-3.5 w-3.5 text-(--gold)" />
                    Reviewed by our curation team
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* ===================== Form fields ===================== */}
          <div className="px-4 pb-28 pt-10 sm:px-6 sm:pt-12 lg:px-12 lg:pb-16 lg:pt-16">
            <div className="mx-auto w-full max-w-2xl">
              {/* Mobile header (desktop uses the rail) */}
              <div className="mb-8 text-center lg:hidden">
                <span className="inline-flex items-center gap-2 rounded-full border border-(--gold-bar-border) bg-(--gold-bar-bg)/80 px-4 py-1.5 font-poppins text-xs font-semibold uppercase tracking-[0.18em] text-(--gold-text)">
                  <Sparkles className="h-3.5 w-3.5" />
                  Talent onboarding
                </span>
                <h1 className="mt-4 font-bricolage text-3xl font-bold tracking-tight text-(--brand-navy)">
                  Build your talent profile
                </h1>
                <p className="mx-auto mt-3 max-w-md font-albert text-sm leading-6 text-(--gray-600)">
                  A few details and a one-time fee — then you&apos;re discoverable by cafés,
                  events and brands across Vizag.
                </p>
              </div>

              <div className="grid gap-5">
                {/* 1 — About */}
                <SectionCard icon={User} step={1} title="Tell us about yourself">
                  <div className="grid gap-5">
                    <div>
                      <FieldLabel icon={User}>Stage name</FieldLabel>
                      <input
                        className={inputClass}
                        placeholder="The name you perform under"
                        {...form.register("stageName")}
                      />
                      {errors.stageName ? (
                        <p className="mt-1.5 font-albert text-xs text-rose-600">{errors.stageName.message}</p>
                      ) : null}
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <FieldLabel icon={Sparkles}>Main skill</FieldLabel>
                        <select className={inputClass} defaultValue="" {...form.register("mainSkill")}>
                          <option value="" disabled>Select your skill</option>
                          {MAIN_SKILLS.map((g) => (
                            <optgroup key={g.group} label={g.group}>
                              {g.options.map((o) => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        {errors.mainSkill ? (
                          <p className="mt-1.5 font-albert text-xs text-rose-600">{errors.mainSkill.message}</p>
                        ) : null}
                      </div>
                      <div>
                        <FieldLabel icon={Briefcase}>Experience</FieldLabel>
                        <select className={inputClass} defaultValue="" {...form.register("yearsOfExperience")}>
                          <option value="" disabled>Select experience</option>
                          {EXPERIENCE.map((e) => (
                            <option key={e} value={e}>{e}</option>
                          ))}
                        </select>
                        {errors.yearsOfExperience ? (
                          <p className="mt-1.5 font-albert text-xs text-rose-600">{errors.yearsOfExperience.message}</p>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <FieldLabel icon={Award}>Professional level</FieldLabel>
                      <select className={inputClass} defaultValue="" {...form.register("experienceLevel")}>
                        <option value="" disabled>Select level</option>
                        {LEVELS.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                      {errors.experienceLevel ? (
                        <p className="mt-1.5 font-albert text-xs text-rose-600">{errors.experienceLevel.message}</p>
                      ) : null}
                    </div>

                    <div>
                      <FieldLabel icon={PenLine}>Short bio</FieldLabel>
                      <p className="mt-1 font-albert text-xs text-(--gray-500)">
                        Tell us about your journey, style and what makes your work unique.
                      </p>
                      <div className="relative">
                        <textarea
                          maxLength={500}
                          className={`${inputClass} min-h-32 resize-none`}
                          placeholder="Share your story…"
                          {...form.register("bio")}
                        />
                        <span className="pointer-events-none absolute bottom-3 right-4 font-albert text-xs text-(--gray-400)">
                          {bio.length}/500
                        </span>
                      </div>
                      {errors.bio ? (
                        <p className="mt-1.5 font-albert text-xs text-rose-600">{errors.bio.message}</p>
                      ) : null}
                    </div>
                  </div>
                </SectionCard>

                {/* 2 — Availability */}
                <SectionCard icon={CalendarDays} step={2} title="Availability" hint="When are you typically available, and for what?">
                  <div className="grid gap-6">
                    <div>
                      <FieldLabel icon={CalendarDays}>Preferred days</FieldLabel>
                      <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
                        {DAYS.map((d) => (
                          <Chip key={d} active={slots.includes(d)} onClick={() => toggleList("preferredSlots", d)}>
                            {d}
                          </Chip>
                        ))}
                      </div>
                      {errors.preferredSlots ? (
                        <p className="mt-2 font-albert text-xs text-rose-600">{errors.preferredSlots.message}</p>
                      ) : null}
                    </div>

                    <div>
                      <FieldLabel icon={Tag}>Available for</FieldLabel>
                      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        {WORK_TYPES.map((w) => (
                          <Chip key={w} active={work.includes(w)} onClick={() => toggleList("availableFor", w)}>
                            {w}
                          </Chip>
                        ))}
                      </div>
                      {errors.availableFor ? (
                        <p className="mt-2 font-albert text-xs text-rose-600">{errors.availableFor.message}</p>
                      ) : null}
                    </div>
                  </div>
                </SectionCard>

                {/* 3 — Pricing & location */}
                <SectionCard icon={IndianRupee} step={3} title="Pricing & base location">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel icon={IndianRupee}>Starting price</FieldLabel>
                      <div className="relative mt-2">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-albert text-sm font-semibold text-(--gold-icon)">₹</span>
                        <input
                          inputMode="numeric"
                          className={`${inputClass} mt-0 pl-8`}
                          placeholder="Enter starting price"
                          value={form.watch("expectedPriceBand")}
                          onChange={(e) =>
                            form.setValue("expectedPriceBand", e.target.value.replace(/\D/g, ""), {
                              shouldValidate: true,
                            })
                          }
                        />
                      </div>
                      <p className="mt-1.5 font-albert text-xs text-(--gray-500)">Prices can be discussed later.</p>
                      {errors.expectedPriceBand ? (
                        <p className="mt-1 font-albert text-xs text-rose-600">{errors.expectedPriceBand.message}</p>
                      ) : null}
                    </div>
                    <div>
                      <FieldLabel icon={MapPin}>Base location</FieldLabel>
                      <select className={inputClass} defaultValue="" {...form.register("location")}>
                        <option value="" disabled>Where are you based?</option>
                        {CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      {errors.location ? (
                        <p className="mt-1.5 font-albert text-xs text-rose-600">{errors.location.message}</p>
                      ) : null}
                    </div>
                  </div>
                </SectionCard>

                {/* 4 — Portfolio & social */}
                <SectionCard icon={Link2} step={4} title="Portfolio & social links" hint="Add your work so we can feature you better. (Optional)">
                  <div className="grid gap-4">
                    <div className="flex items-center gap-3 rounded-xl border border-(--gold-bar-border) bg-(--gold-bar-bg)/30 px-4 py-2.5 transition focus-within:border-(--brand-navy) focus-within:bg-white">
                      <Instagram className="h-5 w-5 shrink-0 text-(--gold-icon)" />
                      <input
                        className="w-full bg-transparent py-1.5 font-albert text-sm text-(--brand-navy) outline-none placeholder:text-(--gray-400)"
                        placeholder="Instagram — @yourusername"
                        {...form.register("instagram")}
                      />
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-(--gold-bar-border) bg-(--gold-bar-bg)/30 px-4 py-2.5 transition focus-within:border-(--brand-navy) focus-within:bg-white">
                      <Youtube className="h-5 w-5 shrink-0 text-(--gold-icon)" />
                      <input
                        className="w-full bg-transparent py-1.5 font-albert text-sm text-(--brand-navy) outline-none placeholder:text-(--gray-400)"
                        placeholder="YouTube channel link"
                        {...form.register("youtube")}
                      />
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-(--gold-bar-border) bg-(--gold-bar-bg)/30 px-4 py-2.5 transition focus-within:border-(--brand-navy) focus-within:bg-white">
                      <Globe className="h-5 w-5 shrink-0 text-(--gold-icon)" />
                      <input
                        className="w-full bg-transparent py-1.5 font-albert text-sm text-(--brand-navy) outline-none placeholder:text-(--gray-400)"
                        placeholder="Portfolio or website link"
                        {...form.register("website")}
                      />
                    </div>
                  </div>
                </SectionCard>

                {/* Status messages */}
                {error ? (
                  <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 font-albert text-sm text-rose-700">
                    {error}
                  </p>
                ) : null}
                {success ? (
                  <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-albert text-sm text-emerald-700">
                    {success}
                  </p>
                ) : null}

                {/* Mobile sticky pay bar (desktop uses the rail) */}
                <div className="sticky bottom-4 z-20 mt-2 lg:hidden">
                  <div className="relative overflow-hidden rounded-3xl border border-(--gold)/30 bg-(--brand-navy) p-4 shadow-[0_24px_60px_-20px_rgba(12,29,55,0.6)] sm:p-5">
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-(--gold) to-transparent opacity-70" />
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bricolage text-2xl font-bold text-white">₹299</span>
                          <span className="font-albert text-xs text-white/55">lifetime</span>
                        </div>
                        <p className="font-albert text-[11px] leading-4 text-white/60">
                          Inclusive of all taxes &amp; payment charges
                        </p>
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-(--gold) px-6 font-poppins text-sm font-bold text-(--brand-navy) shadow-[0_14px_40px_-12px_rgba(194,150,46,0.9)] transition-all active:scale-[0.98] disabled:opacity-70"
                      >
                        {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                          <>
                            Pay ₹299
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
    </ProtectedRoute>
  )
}
