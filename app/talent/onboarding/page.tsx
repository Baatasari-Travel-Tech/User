"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowRight,
  Award,
  Briefcase,
  CalendarDays,
  Camera,
  Check,
  Globe,
  IndianRupee,
  Instagram,
  Link2,
  Loader2,
  MapPin,
  PenLine,
  Phone,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
  Youtube,
} from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { StateDistrictLocalityPicker } from "@/components/common/state-district-locality-picker"
import { useAuth } from "@/app/providers"
import { apiRequest } from "@/lib/api/client"
import { loadCashfree } from "@/lib/payments/cashfree"
import {
  getDobDateBounds,
  isDobWithinBounds,
  isPredefinedProfession,
  OTHER_PROFESSION_VALUE,
  PROFESSION_OPTIONS,
} from "@/lib/profile-validation"
import {
  CITY_SUGGESTIONS,
  MAIN_SKILLS,
  TALENT_FEE,
  VIDEO_LINK_PATTERN,
  normalizeInstagram,
  normalizeUrl,
  splitPortfolioLinks,
} from "@/lib/talent"
import type { TalentProfile } from "@/types/api"

/**
 * Talent sign-up — and, once paid, "Edit your talent profile".
 *
 * One page does the whole job (founder, 2026-10-01): a new performer signs
 * up from /talent, lands here, and this page also collects the account
 * details the general /onboarding would have asked for — so they never see
 * that page. Someone who already has a Baatasari account gets those details
 * filled in. Then: save the profile → pay ₹299 → dashboard. The profile is
 * saved BEFORE paying, so nothing typed can be lost between paying and the
 * confirmation.
 */

const dobBounds = getDobDateBounds()

const optionalVideo = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || VIDEO_LINK_PATTERN.test(normalizeUrl(v)), "Use a YouTube or Instagram link")

const schema = z
  .object({
  // Account (the general onboarding's fields) — only asked, and so only
  // checked, until the talent profile is paid (requireAccount).
  requireAccount: z.boolean(),
  fullName: z.string(),
  phone: z.string(),
  dob: z.string(),
  gender: z.string(),
  profession: z.string(),
  otherProfession: z.string().optional(),
  // Talent profile.
  stageName: z.string().trim().min(2, "Enter your stage name"),
  mainSkill: z.string().min(2, "Enter your main skill"),
  experienceLevel: z.string().min(2, "Select your professional level"),
  yearsOfExperience: z.string().min(1, "Select your experience"),
  bio: z.string().trim().min(20, "Tell us a bit more — at least 20 characters"),
  preferredSlots: z.string().min(1, "Pick at least one day"),
  availableFor: z.string().min(1, "Pick at least one work type"),
  city: z.string().trim().min(2, "Enter the city you're based in"),
  expectedPriceBand: z.string().min(1, "Enter your starting price"),
  contactPhone: z.string().regex(/^\d{10}$/, "Enter a 10-digit WhatsApp / phone number"),
  instagram: z.string().optional(),
  youtube: z.string().optional(),
  website: z.string().optional(),
  video1: optionalVideo,
  video2: optionalVideo,
  video3: optionalVideo,
  video4: optionalVideo,
})
  .superRefine((v, ctx) => {
    if (!v.requireAccount) return
    const fail = (path: keyof typeof v, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message })
    if (v.fullName.trim().length < 2) fail("fullName", "Enter your full name")
    if (!/^\d{10}$/.test(v.phone)) fail("phone", "Phone number must be exactly 10 digits")
    if (!v.dob) fail("dob", "Enter your date of birth")
    else if (!isDobWithinBounds(v.dob, dobBounds)) {
      fail("dob", `You must be at least ${dobBounds.minAge} years old`)
    }
    if (!v.gender) fail("gender", "Select your gender")
    if (!v.profession) fail("profession", "Select your profession")
    else if (v.profession === OTHER_PROFESSION_VALUE && !(v.otherProfession ?? "").trim()) {
      fail("otherProfession", "Tell us your profession")
    }
  })

type Values = z.infer<typeof schema>

type TalentOrderResponse =
  | {
      alreadyPaid: false
      provider: "cashfree"
      providerOrderId: string
      paymentSessionId: string
      mode?: "sandbox" | "production"
      amount: number
      currency: string
    }
  | { alreadyPaid: true; profile: TalentProfile }

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
const WHAT_YOU_GET = [
  "Your own public profile page",
  "Listed in the Baatasari talent directory",
  "Organizers reach you directly — no middlemen",
] as const

const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]
const MAX_PHOTO_BYTES = 8 * 1024 * 1024

const inputClass =
  "mt-2 w-full rounded-xl border border-(--gold-bar-border) bg-(--gold-bar-bg)/30 px-4 py-3 font-albert text-sm text-(--brand-navy) outline-none transition placeholder:text-(--gray-400) focus:border-(--brand-navy) focus:bg-white focus:ring-4 focus:ring-(--brand-navy)/10"

const tenDigits = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "").slice(-10)

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

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1.5 font-albert text-xs text-rose-600">{message}</p> : null
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

type Loc = {
  location: string
  locationArea: string
  locationCity: string
  locationState: string
  locationPincode: string
  locationLat: number | null
  locationLng: number | null
}

function locFrom(profile: ReturnType<typeof useAuth>["profile"]): Loc {
  return {
    location: profile?.location ?? "",
    locationArea: profile?.locationArea ?? "",
    locationCity: profile?.locationCity ?? "",
    locationState: profile?.locationState ?? "",
    locationPincode: profile?.locationPincode ?? "",
    locationLat: profile?.locationLat ?? null,
    locationLng: profile?.locationLng ?? null,
  }
}

/** The form's values from what's saved — account details from the user's
 *  profile, talent details from the talent profile. */
function valuesFrom(
  profile: ReturnType<typeof useAuth>["profile"],
  talent: TalentProfile | null,
): Values {
  const links = splitPortfolioLinks(talent?.portfolioLinks ?? [])
  const videos = talent?.videoLinks ?? []
  const savedProfession = (profile?.profession ?? "").trim()
  const predefined = savedProfession && isPredefinedProfession(savedProfession)
  return {
    requireAccount: talent?.paymentStatus !== "PAID",
    fullName: profile?.full_name ?? "",
    phone: tenDigits(profile?.phone),
    dob: profile?.dob ?? "",
    gender: profile?.gender ?? "",
    profession: predefined ? savedProfession : savedProfession ? OTHER_PROFESSION_VALUE : "",
    otherProfession: predefined ? "" : savedProfession,
    stageName: talent?.stageName ?? "",
    mainSkill: talent?.mainSkill ?? "",
    experienceLevel: talent?.experienceLevel ?? "",
    yearsOfExperience: talent?.yearsOfExperience ?? "",
    bio: talent?.bio ?? "",
    preferredSlots: talent?.preferredSlots.join(", ") ?? "",
    availableFor: talent?.availableFor.join(", ") ?? "",
    city: talent?.location ?? profile?.locationCity ?? "",
    expectedPriceBand: talent?.expectedPriceBand ?? "",
    // Defaults to the account phone — most performers take bookings on it.
    contactPhone: tenDigits(talent?.contactPhone) || tenDigits(profile?.phone),
    instagram: links.instagram,
    youtube: links.youtube,
    website: links.website,
    video1: videos[0] ?? "",
    video2: videos[1] ?? "",
    video3: videos[2] ?? "",
    video4: videos[3] ?? "",
  }
}

export default function TalentOnboardingPage() {
  return (
    // No account-onboarding gate: this page collects those details itself.
    <ProtectedRoute requireOnboarding={false}>
      <TalentOnboardingForm />
    </ProtectedRoute>
  )
}

function TalentOnboardingForm() {
  const router = useRouter()
  const { user, profile, talentProfile, refreshRoles, completeOnboarding, updateProfile } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(talentProfile?.photoUrl ?? null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const paid = talentProfile?.paymentStatus === "PAID"
  const accountDone = profile?.global_onboarding_completed === true

  // The account location (state / district / locality picker) lives outside
  // react-hook-form, same as on /onboarding.
  const [loc, setLoc] = useState(() => locFrom(profile))

  // Seed from data that arrives after the first render (a cold load), during
  // render rather than in an effect — React's "adjust state when a prop
  // changes", same as /onboarding. Location once; the photo whenever the
  // saved one changes (a fresh upload sets photoUrl directly).
  const [locSeeded, setLocSeeded] = useState(Boolean(profile))
  if (!locSeeded && profile) {
    setLocSeeded(true)
    setLoc(locFrom(profile))
  }
  const [savedPhoto, setSavedPhoto] = useState(talentProfile?.photoUrl ?? null)
  if ((talentProfile?.photoUrl ?? null) !== savedPhoto) {
    setSavedPhoto(talentProfile?.photoUrl ?? null)
    setPhotoUrl(talentProfile?.photoUrl ?? null)
  }

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: valuesFrom(profile, talentProfile),
  })

  // The form's own values re-seed when the saved data arrives — skipped once
  // the performer has started typing.
  useEffect(() => {
    if (form.formState.isDirty) return
    form.reset(valuesFrom(profile, talentProfile))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, talentProfile])

  const errors = form.formState.errors
  // useWatch, not form.watch(): the React Compiler can't optimise a component
  // that calls watch() during render.
  const bio = useWatch({ control: form.control, name: "bio" }) ?? ""
  const slots = (useWatch({ control: form.control, name: "preferredSlots" }) ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  const expectedPriceBand = useWatch({ control: form.control, name: "expectedPriceBand" })
  const work = (useWatch({ control: form.control, name: "availableFor" }) ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  const profession = useWatch({ control: form.control, name: "profession" })

  const toggleList = (field: "preferredSlots" | "availableFor", value: string) => {
    const current = field === "preferredSlots" ? slots : work
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    form.setValue(field, next.join(", "), { shouldValidate: true, shouldDirty: true })
  }

  const onPhotoPicked = async (file: File | null) => {
    setPhotoError(null)
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError("Use a PNG, JPG or WEBP photo.")
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Photo must be 8MB or less.")
      return
    }
    setPhotoBusy(true)
    try {
      const res = await apiRequest<{ data: { profile: TalentProfile } }>("/talent/photo", {
        method: "PUT",
        auth: true,
        headers: { "Content-Type": file.type },
        body: file,
        timeoutMs: 60000,
      })
      setPhotoUrl(res.data.profile.photoUrl)
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Could not upload the photo. Try again.")
    } finally {
      setPhotoBusy(false)
      if (photoInputRef.current) photoInputRef.current.value = ""
    }
  }

  const goToDashboard = async (message: string) => {
    // ProtectedRoute gates /talent/dashboard on the cached talentProfile's
    // paymentStatus — refresh it first, or the dashboard bounces the
    // freshly-paid performer straight back here.
    await refreshRoles()
    setSuccess(message)
    router.push("/talent/dashboard")
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    setSuccess(null)

    if (!photoUrl) {
      setError("Add a profile photo — it's the first thing organizers see.")
      return
    }
    if (!paid && !loc.location.trim()) {
      setError("Pick your location in “Your details”.")
      return
    }
    const resolvedProfession =
      values.profession === OTHER_PROFESSION_VALUE ? (values.otherProfession ?? "").trim() : values.profession

    try {
      // 1. Account details — completes the general onboarding for a new
      //    account; keeps an existing one up to date.
      if (!paid) {
        const account = {
          fullName: values.fullName.trim(),
          phone: `+91${values.phone}`,
          dob: values.dob,
          gender: values.gender,
          profession: resolvedProfession,
          location: loc.location.trim(),
          locationArea: loc.locationArea.trim(),
          locationCity: loc.locationCity.trim(),
          locationState: loc.locationState.trim(),
          locationPincode: loc.locationPincode.trim(),
          locationLat: loc.locationLat,
          locationLng: loc.locationLng,
        }
        if (accountDone) await updateProfile(account)
        else await completeOnboarding(account)
      }

      // 2. Talent profile — saved before any payment.
      const portfolioLinks = [
        normalizeInstagram(values.instagram ?? ""),
        normalizeUrl(values.youtube ?? ""),
        normalizeUrl(values.website ?? ""),
      ].filter(Boolean)
      const videoLinks = [values.video1, values.video2, values.video3, values.video4]
        .map((v) => normalizeUrl(v ?? ""))
        .filter(Boolean)
      await apiRequest("/talent/profile", {
        method: "PUT",
        auth: true,
        body: JSON.stringify({
          stageName: values.stageName.trim(),
          mainSkill: values.mainSkill,
          experienceLevel: values.experienceLevel,
          yearsOfExperience: values.yearsOfExperience,
          bio: values.bio.trim(),
          preferredSlots: values.preferredSlots.split(",").map((i) => i.trim()).filter(Boolean),
          availableFor: values.availableFor.split(",").map((i) => i.trim()).filter(Boolean),
          location: values.city.trim(),
          expectedPriceBand: values.expectedPriceBand,
          contactPhone: `+91${values.contactPhone}`,
          portfolioLinks,
          videoLinks,
        }),
      })

      if (paid) {
        await goToDashboard("Saved. Your profile is updated.")
        return
      }

      // 3. Pay ₹299. An earlier payment that never got confirmed is picked
      //    up instead of charging again.
      const orderResponse = await apiRequest<{ data: { order: TalentOrderResponse } }>(
        "/talent/onboarding/order",
        { method: "POST", auth: true },
      )
      const order = orderResponse.data.order
      if (order.alreadyPaid) {
        await goToDashboard("Payment received — your talent profile is live.")
        return
      }

      const cashfree = await loadCashfree(order.mode ?? "sandbox")
      const result = await cashfree.checkout({
        paymentSessionId: order.paymentSessionId,
        redirectTarget: "_modal",
      })

      // Closing the checkout also reports an error — the backend is the only
      // one that knows whether money moved, so ask it either way.
      try {
        await apiRequest("/talent/onboarding/complete", {
          method: "POST",
          auth: true,
          // A live gateway round-trip plus a DB write — more than the
          // client's default 12s.
          timeoutMs: 30000,
          body: JSON.stringify({}),
        })
      } catch (confirmError) {
        if (result?.error && !result?.paymentDetails && !result?.redirect) {
          setError(
            result.error.message ||
              "Your payment didn't go through. Your profile is saved — you can pay whenever you're ready.",
          )
          return
        }
        throw confirmError
      }
      await goToDashboard("Payment received — your talent profile is live.")
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.",
      )
    }
  })

  const submitting = form.formState.isSubmitting
  const heading = paid ? "Edit your talent profile" : "Build your talent profile"
  const submitLabel = paid ? "Save changes" : `Pay ₹${TALENT_FEE} & go live`
  let step = 0

  return (
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
                {paid ? "Talent profile" : "Talent onboarding"}
              </span>
              <h1 className="mt-7 font-bricolage text-4xl font-bold leading-[1.04] text-white xl:text-5xl">
                {paid ? "Edit your" : "Build your"}
                <br />
                talent profile
              </h1>
              <p className="mt-4 max-w-xs font-albert text-sm leading-6 text-white/60">
                {paid
                  ? "Changes show on your public profile as soon as you save."
                  : "A few details and a one-time fee — then cafés, events and brands can discover and book you."}
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
                {!paid ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="font-bricolage text-3xl font-bold text-white">₹{TALENT_FEE}</span>
                      <span className="font-albert text-xs text-white/55">lifetime</span>
                    </div>
                    <p className="mt-1 font-albert text-[11px] leading-4 text-white/55">
                      Inclusive of all taxes &amp; payment charges
                    </p>
                  </>
                ) : null}
                <button
                  type="submit"
                  disabled={submitting || photoBusy}
                  className="group mt-4 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full bg-(--gold) px-6 font-poppins text-base font-bold text-(--brand-navy) shadow-[0_14px_40px_-12px_rgba(194,150,46,0.9)] transition-all hover:scale-[1.02] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      {submitLabel}
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
                <p className="mt-3 flex items-center justify-center gap-1.5 font-albert text-[11px] text-white/55">
                  <ShieldCheck className="h-3.5 w-3.5 text-(--gold)" />
                  {paid ? "Your number is shown only to verified organizers" : "Live as soon as you've paid"}
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
                {paid ? "Talent profile" : "Talent onboarding"}
              </span>
              <h1 className="mt-4 font-bricolage text-3xl font-bold tracking-tight text-(--brand-navy)">
                {heading}
              </h1>
              <p className="mx-auto mt-3 max-w-md font-albert text-sm leading-6 text-(--gray-600)">
                {paid
                  ? "Changes show on your public profile as soon as you save."
                  : "A few details and a one-time fee — then you're discoverable by cafés, events and brands."}
              </p>
            </div>

            <div className="grid gap-5">
              {/* Account details — the general onboarding, folded in */}
              {!paid ? (
                <SectionCard
                  icon={User}
                  step={++step}
                  title="Your details"
                  hint={accountDone ? "From your Baatasari account — check they're right." : "This sets up your Baatasari account too."}
                >
                  <div className="grid gap-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <FieldLabel icon={User}>Full name</FieldLabel>
                        <input className={inputClass} placeholder="Your legal name" {...form.register("fullName")} />
                        <FieldError message={errors.fullName?.message} />
                      </div>
                      <div>
                        <FieldLabel icon={Globe}>Email</FieldLabel>
                        <input className={`${inputClass} opacity-70`} value={user?.email ?? ""} readOnly />
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <FieldLabel icon={Phone}>Phone</FieldLabel>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-4 top-1/2 mt-1 -translate-y-1/2 font-albert text-sm font-semibold text-(--gray-500)">+91</span>
                          <input
                            inputMode="numeric"
                            maxLength={10}
                            className={`${inputClass} pl-12`}
                            placeholder="10-digit mobile"
                            {...form.register("phone", {
                              onChange: (e) => {
                                e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10)
                              },
                            })}
                          />
                        </div>
                        <FieldError message={errors.phone?.message} />
                      </div>
                      <div>
                        <FieldLabel icon={CalendarDays}>Date of birth</FieldLabel>
                        <input
                          type="date"
                          min={dobBounds.min}
                          max={dobBounds.max}
                          className={inputClass}
                          {...form.register("dob")}
                        />
                        <FieldError message={errors.dob?.message} />
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <FieldLabel icon={User}>Gender</FieldLabel>
                        <select className={inputClass} {...form.register("gender")}>
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                        <FieldError message={errors.gender?.message} />
                      </div>
                      <div>
                        <FieldLabel icon={Briefcase}>Profession</FieldLabel>
                        <select className={inputClass} {...form.register("profession")}>
                          <option value="">Select profession</option>
                          {PROFESSION_OPTIONS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <FieldError message={errors.profession?.message} />
                        {profession === OTHER_PROFESSION_VALUE ? (
                          <>
                            <input
                              className={inputClass}
                              placeholder="Your profession"
                              {...form.register("otherProfession")}
                            />
                            <FieldError message={errors.otherProfession?.message} />
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div>
                      <FieldLabel icon={MapPin}>Where you live</FieldLabel>
                      <div className="mt-2">
                        <StateDistrictLocalityPicker
                          // Remount once the saved location arrives — its
                          // initial* props are read on mount only.
                          key={locSeeded ? "seeded" : "empty"}
                          initialState={loc.locationState}
                          initialDistrict={loc.locationCity}
                          initialLocalityLabel={loc.location}
                          onSelect={(l) =>
                            setLoc({
                              location: l.label,
                              locationArea: l.area,
                              locationCity: l.city ?? "",
                              locationState: l.state ?? "",
                              locationPincode: l.pincode ?? "",
                              locationLat: l.lat,
                              locationLng: l.lng,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </SectionCard>
              ) : null}

              {/* Photo */}
              <SectionCard icon={Camera} step={++step} title="Profile photo" hint="A clear photo of you performing or a good headshot.">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="relative flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-(--gold-bar-border) bg-(--gold-bar-bg)/30 transition hover:border-(--gold)"
                    aria-label={photoUrl ? "Change photo" : "Add photo"}
                  >
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- just-uploaded S3 photo
                      <img src={photoUrl} alt="Your profile photo" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-8 w-8 text-(--gold-icon)" />
                    )}
                    {photoBusy ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <Loader2 className="h-6 w-6 animate-spin text-(--brand-navy)" />
                      </span>
                    ) : null}
                  </button>
                  <div className="text-center sm:text-left">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={photoBusy}
                      className="rounded-full border border-(--gold-bar-border) px-5 py-2.5 font-poppins text-sm font-semibold text-(--brand-navy) transition hover:border-(--gold)"
                    >
                      {photoUrl ? "Change photo" : "Upload photo"}
                    </button>
                    <p className="mt-2 font-albert text-xs text-(--gray-500)">PNG, JPG or WEBP, up to 8MB.</p>
                    <FieldError message={photoError ?? undefined} />
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept={PHOTO_TYPES.join(",")}
                    className="hidden"
                    onChange={(e) => onPhotoPicked(e.target.files?.[0] ?? null)}
                  />
                </div>
              </SectionCard>

              {/* About */}
              <SectionCard icon={Sparkles} step={++step} title="About your act">
                <div className="grid gap-5">
                  <div>
                    <FieldLabel icon={User}>Stage name</FieldLabel>
                    <input
                      className={inputClass}
                      placeholder="The name you perform under"
                      {...form.register("stageName")}
                    />
                    <FieldError message={errors.stageName?.message} />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel icon={Sparkles}>Main skill</FieldLabel>
                      <select className={inputClass} {...form.register("mainSkill")}>
                        <option value="" disabled>Select your skill</option>
                        {MAIN_SKILLS.map((g) => (
                          <optgroup key={g.group} label={g.group}>
                            {g.options.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <FieldError message={errors.mainSkill?.message} />
                    </div>
                    <div>
                      <FieldLabel icon={Briefcase}>Experience</FieldLabel>
                      <select className={inputClass} {...form.register("yearsOfExperience")}>
                        <option value="" disabled>Select experience</option>
                        {EXPERIENCE.map((e) => (
                          <option key={e} value={e}>{e}</option>
                        ))}
                      </select>
                      <FieldError message={errors.yearsOfExperience?.message} />
                    </div>
                  </div>

                  <div>
                    <FieldLabel icon={Award}>Professional level</FieldLabel>
                    <select className={inputClass} {...form.register("experienceLevel")}>
                      <option value="" disabled>Select level</option>
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    <FieldError message={errors.experienceLevel?.message} />
                  </div>

                  <div>
                    <FieldLabel icon={PenLine}>Short bio</FieldLabel>
                    <p className="mt-1 font-albert text-xs text-(--gray-500)">
                      Tell organizers about your journey, style and what makes your work unique.
                    </p>
                    <div className="relative">
                      <textarea
                        maxLength={1000}
                        className={`${inputClass} min-h-32 resize-none`}
                        placeholder="Share your story…"
                        {...form.register("bio")}
                      />
                      <span className="pointer-events-none absolute bottom-3 right-4 font-albert text-xs text-(--gray-400)">
                        {bio.length}/1000
                      </span>
                    </div>
                    <FieldError message={errors.bio?.message} />
                  </div>
                </div>
              </SectionCard>

              {/* Availability */}
              <SectionCard icon={CalendarDays} step={++step} title="Availability" hint="When are you typically available, and for what?">
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
                    <FieldError message={errors.preferredSlots?.message} />
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
                    <FieldError message={errors.availableFor?.message} />
                  </div>
                </div>
              </SectionCard>

              {/* Pricing, city & contact */}
              <SectionCard icon={IndianRupee} step={++step} title="Pricing, city & contact">
                <div className="grid gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <FieldLabel icon={IndianRupee}>Starting price</FieldLabel>
                      <div className="relative mt-2">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-albert text-sm font-semibold text-(--gold-icon)">₹</span>
                        <input
                          inputMode="numeric"
                          className={`${inputClass} mt-0 pl-8`}
                          placeholder="Enter starting price"
                          value={expectedPriceBand}
                          onChange={(e) =>
                            form.setValue("expectedPriceBand", e.target.value.replace(/\D/g, ""), {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          }
                        />
                      </div>
                      <p className="mt-1.5 font-albert text-xs text-(--gray-500)">Prices can be discussed later.</p>
                      <FieldError message={errors.expectedPriceBand?.message} />
                    </div>
                    <div>
                      <FieldLabel icon={MapPin}>City you perform in</FieldLabel>
                      <input
                        className={inputClass}
                        list="talent-city-suggestions"
                        placeholder="Start typing your city"
                        {...form.register("city")}
                      />
                      <datalist id="talent-city-suggestions">
                        {CITY_SUGGESTIONS.map((c) => (
                          <option key={c} value={c} />
                        ))}
                      </datalist>
                      <FieldError message={errors.city?.message} />
                    </div>
                  </div>
                  <div>
                    <FieldLabel icon={Phone}>WhatsApp / phone for bookings</FieldLabel>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 mt-1 -translate-y-1/2 font-albert text-sm font-semibold text-(--gray-500)">+91</span>
                      <input
                        inputMode="numeric"
                        maxLength={10}
                        className={`${inputClass} pl-12`}
                        placeholder="10-digit number"
                        {...form.register("contactPhone", {
                          onChange: (e) => {
                            e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10)
                          },
                        })}
                      />
                    </div>
                    <p className="mt-1.5 font-albert text-xs text-(--gray-500)">
                      Shown only to verified organizers on Baatasari — never on your public page.
                    </p>
                    <FieldError message={errors.contactPhone?.message} />
                  </div>
                </div>
              </SectionCard>

              {/* Videos */}
              <SectionCard icon={PlayCircle} step={++step} title="Videos of your work" hint="Up to 4 YouTube or Instagram links — they play right on your profile. (Optional)">
                <div className="grid gap-3">
                  {(["video1", "video2", "video3", "video4"] as const).map((name, i) => (
                    <div key={name}>
                      <input
                        className={`${inputClass} mt-0`}
                        placeholder={i === 0 ? "https://youtube.com/watch?v=… or https://instagram.com/reel/…" : `Video ${i + 1} (optional)`}
                        {...form.register(name)}
                      />
                      <FieldError message={errors[name]?.message} />
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* Portfolio & social */}
              <SectionCard icon={Link2} step={++step} title="Social & portfolio links" hint="Where organizers can see more of you. (Optional)">
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

              {/* Mobile sticky bar (desktop uses the rail) */}
              <div className="sticky bottom-4 z-20 mt-2 lg:hidden">
                <div className="relative overflow-hidden rounded-3xl border border-(--gold)/30 bg-(--brand-navy) p-4 shadow-[0_24px_60px_-20px_rgba(12,29,55,0.6)] sm:p-5">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-(--gold) to-transparent opacity-70" />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      {!paid ? (
                        <>
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-bricolage text-2xl font-bold text-white">₹{TALENT_FEE}</span>
                            <span className="font-albert text-xs text-white/55">lifetime</span>
                          </div>
                          <p className="font-albert text-[11px] leading-4 text-white/60">
                            Inclusive of all taxes &amp; payment charges
                          </p>
                        </>
                      ) : (
                        <p className="font-albert text-sm text-white/80">Your profile is live</p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={submitting || photoBusy}
                      className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-(--gold) px-6 font-poppins text-sm font-bold text-(--brand-navy) shadow-[0_14px_40px_-12px_rgba(194,150,46,0.9)] transition-all active:scale-[0.98] disabled:opacity-70"
                    >
                      {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <>
                          {paid ? "Save" : `Pay ₹${TALENT_FEE}`}
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
  )
}
