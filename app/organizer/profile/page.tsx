"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"
import { FormProvider, useForm, useFormContext, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Camera,
  Globe,
  Instagram,
  Linkedin,
  Lock,
  MapPin,
  ShieldCheck,
} from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { StateDistrictLocalityPicker } from "@/components/common/state-district-locality-picker"
import { useAuth } from "@/app/providers"
import { AvatarCropDialog, useAvatarCrop } from "@/app/profile/_components/avatar-crop-dialog"
import { apiRequest } from "@/lib/api/client"
import { uploadFile, uploadOrganizerAvatarImage } from "@/lib/api/uploads"
import { DEFAULT_AVATAR_IMAGE, getAvatarImageUrl } from "@/lib/avatar"
import {
  getDobDateBounds,
  getProfessionFormValues,
  isDobWithinBounds,
  ORGANIZER_MIN_AGE,
  OTHER_PROFESSION_VALUE,
  PROFESSION_OPTIONS,
} from "@/lib/profile-validation"

const EASE = [0.22, 1, 0.36, 1] as const

// Computed once per module load. The organizer floor is 18, so `max` is the
// newest DOB that still satisfies it; the date input and the schema both use
// these bounds, so the constraint holds whether the user picks or pastes.
const DOB_BOUNDS = getDobDateBounds(new Date(), ORGANIZER_MIN_AGE)

/**
 * Links are https-only. The inputs render the scheme as a fixed prefix and store
 * it in the value, so this should never fail from the UI; it is here to reject
 * an http:// value arriving from an older saved profile or a pasted string.
 */
const httpsUrl = z
  .string()
  .url("Enter a valid link")
  .startsWith("https://", "Only https links are accepted")
  .or(z.literal(""))

// Legal identity fields (legal name, trade name, PAN, GSTIN, registered
// address) are locked after onboarding — changing them needs a manual,
// verified update, not a silent self-service edit. Routes into the same
// tracked support-ticket flow used elsewhere (see app/history/[id]/page.tsx's
// cancel-ticket link) instead of a cold email.
const buildLegalChangeRequestHref = (): string => {
  const lines = [
    "I need to update a legal/organization detail on my organizer profile",
    "(legal name, trade name, PAN, GSTIN, or registered address).",
    "",
    "Field(s) to change: ",
    "New value(s): ",
    "Reason: ",
  ]
  return `/contact-us?problem=${encodeURIComponent(lines.join("\n"))}`
}

/**
 * The backend only *requires* orgName/description/contact/address for
 * ORGANIZATION (see organizer.schemas.ts superRefine); for INDIVIDUAL every one
 * of them is optional-and-nullable. So an individual is free to fill in a
 * description, city and links, and should: they are what fill the public card.
 * Only orgName is genuinely organization-only, since an individual is shown by
 * their own name.
 *
 * Hence one schema shape, two strictnesses. Fields an individual may leave blank
 * still validate once they type something, so a half-filled description or a
 * malformed email cannot be saved either way.
 */
const makeSchema = (isIndividual: boolean) => {
  /** Required for an organization; optional for an individual, but valid if given. */
  const softForIndividual = <T extends z.ZodString>(field: T) =>
    isIndividual ? (field.or(z.literal("")) as unknown as T) : field

  return z.object({
    fullName: z.string().min(2, "Enter your full name"),
    personalPhone: z.string().regex(/^\d{10}$/, "Enter a valid 10 digit phone number"),
    dob: z
      .string()
      .min(1, "Select your date of birth")
      .refine((value) => isDobWithinBounds(value, DOB_BOUNDS), `You must be at least ${ORGANIZER_MIN_AGE} years old`),
    location: z.string().min(2, "Enter your location"),
    locationArea: z.string().optional(),
    locationCity: z.string().optional(),
    locationState: z.string().optional(),
    locationPincode: z.string().optional(),
    locationLat: z.number().optional().nullable(),
    locationLng: z.number().optional().nullable(),
    gender: z.string().min(1, "Select your gender"),
    profession: z.string().min(1, "Select your profession"),
    otherProfession: z.string().optional(),
    // Individuals have no organization name; the field is not rendered for them.
    orgName: isIndividual ? z.string() : z.string().min(2, "Enter your organization name"),
    // Legal name/trade name are locked (read-only) once set — see
    // buildLegalChangeRequestHref. Kept in the schema/payload so saving the
    // rest of the form round-trips them unchanged.
    tradeName: z.string().optional(),
    description: softForIndividual(z.string().min(20, "Add at least 20 characters")),
    contactEmail: softForIndividual(z.string().email("Enter a valid contact email")),
    contactPhone: softForIndividual(z.string().min(6, "Enter a valid contact number")),
    primaryContactName: z.string().optional(),
    secondaryContactPhone: z.string().optional(),
    landlineNumber: z.string().optional(),
    address: softForIndividual(z.string().min(4, "Enter your address")),
    city: softForIndividual(z.string().min(2, "Enter your city")),
    state: softForIndividual(z.string().min(2, "Enter your state")),
    pincode: softForIndividual(z.string().min(4, "Enter your pincode")),
    websiteUrl: httpsUrl,
    instagramUrl: httpsUrl,
    linkedinUrl: httpsUrl,
    // Payout identity is required of everyone.
    panNumber: z.string().min(5, "Enter the PAN number"),
    gstNumber: z.string().optional(),
    bankAccountName: z.string().min(2, "Enter the account holder name"),
    bankAccountNumber: z.string().min(6, "Enter a valid account number"),
    bankIfsc: z.string().min(4, "Enter a valid IFSC code"),
  }).superRefine((value, ctx) => {
    if (value.profession === OTHER_PROFESSION_VALUE && (!value.otherProfession || value.otherProfession.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherProfession"],
        message: "Enter your profession",
      })
    }
  })
}

type Values = z.infer<ReturnType<typeof makeSchema>>

type LinkField = "websiteUrl" | "instagramUrl" | "linkedinUrl"

const EMPTY_VALUES: Values = {
  fullName: "",
  personalPhone: "",
  dob: "",
  location: "",
  locationArea: "",
  locationCity: "",
  locationState: "",
  locationPincode: "",
  locationLat: null,
  locationLng: null,
  gender: "",
  profession: "",
  otherProfession: "",
  orgName: "",
  tradeName: "",
  description: "",
  contactEmail: "",
  contactPhone: "",
  primaryContactName: "",
  secondaryContactPhone: "",
  landlineNumber: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  websiteUrl: "",
  instagramUrl: "",
  linkedinUrl: "",
  panNumber: "",
  gstNumber: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankIfsc: "",
}

const GENDER_OPTIONS = ["Male", "Female", "Prefer not to say"]

const stripIndianCode = (value: string | null | undefined) => (value ?? "").replace(/^\+91/, "")

/**
 * Baseline rule instead of a box. Darkens to navy on focus. Rules are tinted
 * with the navy foreground rather than cool slate, so they sit correctly on the
 * warm cream --background instead of reading blue against it.
 */
const quietInput =
  "w-full border-b border-slate-900/15 bg-transparent px-0 py-1.5 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-500 hover:border-slate-900/30 focus:border-brand-900"

/**
 * Steps drive the rail, the scroll-spy targets and the jump-to-first-error on a
 * failed save. `fields` is everything living on that step, used to locate which
 * step an error belongs to.
 */
const CHAPTERS = [
  {
    id: "personal",
    title: "Personal",
    short: "Personal",
    standfirst: "Who we contact about this account. Never shown to attendees.",
    fields: ["fullName", "personalPhone", "dob", "location", "gender", "profession", "otherProfession"],
  },
  {
    id: "organization",
    title: "Organization",
    short: "Organization",
    standfirst: "How your brand reads on event pages and in confirmation emails.",
    fields: [
      "orgName",
      "tradeName",
      "description",
      "contactEmail",
      "contactPhone",
      "primaryContactName",
      "secondaryContactPhone",
      "landlineNumber",
    ],
  },
  {
    id: "address",
    title: "Address",
    short: "Address",
    standfirst: "Your registered address, used on invoices and tax filings.",
    fields: ["address", "city", "state", "pincode"],
  },
  {
    id: "links",
    title: "Social",
    short: "Social",
    standfirst: "Optional. Attendees check these before they buy.",
    fields: ["websiteUrl", "instagramUrl", "linkedinUrl"],
  },
  {
    id: "bank",
    title: "Bank and compliance",
    // The stepper label is nav, not a heading. The card itself still carries the
    // full name, so the label can be short enough to sit under a 28px circle.
    short: "Compliance",
    standfirst: "Encrypted at rest. Changing these pauses payouts for 24 hours while we re-verify.",
    fields: ["panNumber", "gstNumber", "bankAccountName", "bankAccountNumber", "bankIfsc"],
  },
] as const satisfies ReadonlyArray<{
  id: string
  title: string
  short: string
  standfirst: string
  fields: ReadonlyArray<keyof Values>
}>

/* ---------------------------------------------------------------- primitives */

function Field({
  label,
  name,
  required,
  hint,
  className,
  children,
}: {
  label: string
  name?: keyof Values
  required?: boolean
  hint?: string
  className?: string
  children: React.ReactNode
}) {
  const { formState } = useFormContext<Values>()
  const error = name ? formState.errors[name]?.message : undefined
  return (
    <div className={className}>
      <label className="text-[13px] font-medium text-slate-500">
        {label}
        {required ? <span className="ml-0.5 text-slate-300">*</span> : null}
      </label>
      <div className="mt-1">{children}</div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-rose-600">{String(error)}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}

/**
 * Link field with a fixed `https://` prefix, mirroring the `+91` phone field.
 * The form value is the full URL; the input only ever shows and edits the part
 * after the scheme, so the scheme cannot be deleted or typed as http.
 * Pasting a full URL still works: any scheme in the pasted text is stripped.
 */
function HttpsField({ name, label, placeholder }: { name: LinkField; label: string; placeholder: string }) {
  const { control, setValue } = useFormContext<Values>()
  const value = useWatch({ control, name }) ?? ""
  return (
    <Field label={label} name={name}>
      <div className="flex items-baseline border-b border-slate-900/15 transition focus-within:border-brand-900 hover:border-slate-900/30">
        <span className="shrink-0 text-[15px] text-slate-400">https://</span>
        <input
          className="w-full bg-transparent py-1.5 text-[15px] text-slate-900 outline-none placeholder:text-slate-500"
          placeholder={placeholder}
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          value={value.replace(/^https?:\/\//, "")}
          onChange={(event) => {
            const rest = event.target.value.replace(/^https?:\/\//, "").trimStart()
            setValue(name, rest ? `https://${rest}` : "", { shouldValidate: true, shouldDirty: true })
          }}
        />
      </div>
    </Field>
  )
}

function Chapter({
  chapter,
  title,
  standfirst,
  className,
  children,
}: {
  chapter: (typeof CHAPTERS)[number]
  /** Overrides for wording that differs for an individual. */
  title?: string
  standfirst?: string
  /** Mobile wizard hides every step but the active one; desktop shows them all. */
  className?: string
  children: React.ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <motion.section
      id={chapter.id}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.55, ease: EASE }}
      className={`scroll-mt-32 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-25px_rgba(12,29,55,0.2)] sm:p-7 md:p-8 ${className ?? ""}`}
    >
      <div className="max-w-[54ch]">
        <h2 className="font-bricolage text-2xl font-bold tracking-tight text-slate-900">{title ?? chapter.title}</h2>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">{standfirst ?? chapter.standfirst}</p>
      </div>
      <div className="mt-7 grid gap-x-10 gap-y-6 sm:grid-cols-2">{children}</div>
    </motion.section>
  )
}

/* ------------------------------------------------------------ preview card */

/** The public organizer card as attendees see it, bound to live form values. */
function PublicPreview({
  displayName,
  logoUrl,
  onLogoPick,
}: {
  displayName: string
  logoUrl: string | null
  onLogoPick: (file: File | null) => void
}) {
  const logoInputRef = useRef<HTMLInputElement>(null)
  const { control } = useFormContext<Values>()
  const description = useWatch({ control, name: "description" })
  const city = useWatch({ control, name: "city" })
  const state = useWatch({ control, name: "state" })
  const websiteUrl = useWatch({ control, name: "websiteUrl" })
  const instagramUrl = useWatch({ control, name: "instagramUrl" })
  const linkedinUrl = useWatch({ control, name: "linkedinUrl" })
  const place = [city, state].filter(Boolean).join(", ")

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_45px_-25px_rgba(12,29,55,0.2)]">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Attendees see</p>

      {/* Logo above the name rather than beside it: in a 18rem rail, a side-by-side
          layout leaves the name about 9rem and forces it to truncate. Stacked, the
          name gets the full width and can run to two lines at display size. */}
      <button
        type="button"
        onClick={() => logoInputRef.current?.click()}
        aria-label="Change organization logo"
        className="group relative mt-4 h-16 w-16 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:border-brand-900"
      >
        {logoUrl ? (
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-slate-300">
            <Building2 className="h-6 w-6" />
          </span>
        )}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-brand-900/70 opacity-0 transition group-hover:opacity-100">
          <Camera className="h-4 w-4 text-white" />
        </span>
      </button>
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          onLogoPick(event.target.files?.[0] ?? null)
          event.target.value = ""
        }}
      />

      <div className="mt-3.5 flex items-start gap-1.5">
        <h3 className="line-clamp-2 font-bricolage text-xl font-bold leading-tight tracking-tight text-slate-900">
          {displayName}
        </h3>
        <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-sky-500" />
      </div>

      {place ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
          <MapPin className="h-3 w-3 shrink-0" />
          {place}
        </p>
      ) : (
        <p className="mt-1.5 text-xs italic text-slate-300">Add a city</p>
      )}

      {description ? (
        <p className="mt-3 line-clamp-4 text-[13px] leading-6 text-slate-500">{description}</p>
      ) : (
        <p className="mt-3 text-[13px] italic leading-6 text-slate-300">
          Your description appears here. Attendees read this before they buy.
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
        {[
          { url: websiteUrl, icon: Globe, label: "Website" },
          { url: instagramUrl, icon: Instagram, label: "Instagram" },
          { url: linkedinUrl, icon: Linkedin, label: "LinkedIn" },
        ].map((link) => (
          <span
            key={link.label}
            aria-label={link.label}
            title={link.label}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
              link.url ? "border-slate-200 text-slate-600" : "border-dashed border-slate-200 text-slate-200"
            }`}
          >
            <link.icon className="h-3.5 w-3.5" />
          </span>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- page */

export default function OrganizerProfilePage() {
  const { session, user, profile, organizerProfile, updateProfile, refreshProfile, refreshOrganizerStatus } = useAuth()
  const reduce = useReducedMotion()

  const [activeId, setActiveId] = useState<string>("personal")
  const [error, setError] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const avatarUrlRef = useRef<string | null>(null)
  const orgLogoInputRef = useRef<HTMLInputElement>(null)

  // Set when a link was clicked while dirty: holds where the user was trying to
  // go until they choose save / leave / stay.
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const router = useRouter()

  // State, not a plain ref: `ProtectedRoute` renders a loader on the first
  // mount, so the <form> doesn't exist yet when this component's effects
  // first run. A plain ref would stay null forever (empty-deps effects don't
  // re-run once the form actually appears); this callback ref updates state,
  // which the scroll-spy effect below depends on, so it correctly reattaches
  // once the form is real.
  const [formNode, setFormNode] = useState<HTMLFormElement | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null)
  const logoPreviewRef = useRef<string | null>(null)
  // handleSubmit swallows its result, and formState is stale inside the closure
  // right after awaiting it, so the outcome is recorded here instead.
  const saveSucceededRef = useRef(false)

  // Individuals have no organization, so the organization-only fields are theirs
  // to fill in or leave, not requirements. Resolver is rebuilt when this flips
  // (it arrives async with the profile); react-hook-form reads the current
  // resolver on each validation, so swapping it is safe.
  const isIndividual = (organizerProfile?.entityType ?? "ORGANIZATION") === "INDIVIDUAL"
  const resolver = useMemo(() => zodResolver(makeSchema(isIndividual)), [isIndividual])

  const form = useForm<Values>({
    resolver,
    mode: "onBlur",
    defaultValues: EMPTY_VALUES,
  })
  const { register, setValue, control } = form

  const values = useWatch({ control }) as Partial<Values>
  const description = values.description ?? ""

  // Picking a logo does not touch form state, so fold it into the dirty check or
  // the Save control would never appear for a logo-only change. The avatar is not
  // here: it uploads on crop, independently of this form.
  const isDirty = form.formState.isDirty || Boolean(logoFile)

  const activeIndex = Math.max(
    0,
    CHAPTERS.findIndex((chapter) => chapter.id === activeId),
  )

  // Hydrate from the loaded profile. Depends on individual fields rather than the
  // object identities: a refresh that returns an equal-but-new object would
  // otherwise reset() over whatever the user is currently typing.
  useEffect(() => {
    form.reset({
      fullName: profile?.full_name ?? "",
      personalPhone: stripIndianCode(profile?.phone),
      dob: profile?.dob ?? "",
      location: profile?.location ?? "",
      locationArea: profile?.locationArea ?? "",
      locationCity: profile?.locationCity ?? "",
      locationState: profile?.locationState ?? "",
      locationPincode: profile?.locationPincode ?? "",
      locationLat: profile?.locationLat ?? null,
      locationLng: profile?.locationLng ?? null,
      gender: profile?.gender ?? "",
      ...getProfessionFormValues(profile?.profession),
      orgName: organizerProfile?.orgName ?? "",
      tradeName: organizerProfile?.tradeName ?? "",
      description: organizerProfile?.description ?? "",
      contactEmail: organizerProfile?.contactEmail ?? session?.user?.email ?? "",
      contactPhone: organizerProfile?.contactPhone ?? stripIndianCode(profile?.phone),
      primaryContactName: organizerProfile?.primaryContactName ?? "",
      secondaryContactPhone: organizerProfile?.secondaryContactPhone ?? "",
      landlineNumber: organizerProfile?.landlineNumber ?? "",
      address: organizerProfile?.address ?? "",
      city: organizerProfile?.city ?? "",
      state: organizerProfile?.state ?? "",
      pincode: organizerProfile?.pincode ?? "",
      websiteUrl: organizerProfile?.websiteUrl ?? "",
      instagramUrl: organizerProfile?.instagramUrl ?? "",
      linkedinUrl: organizerProfile?.linkedinUrl ?? "",
      panNumber: organizerProfile?.panNumber ?? "",
      gstNumber: organizerProfile?.gstNumber ?? "",
      bankAccountName: organizerProfile?.bankAccountName ?? "",
      bankAccountNumber: organizerProfile?.bankAccountNumber ?? "",
      bankIfsc: organizerProfile?.bankIfsc ?? "",
    })
  }, [
    form,
    organizerProfile?.address,
    organizerProfile?.bankAccountName,
    organizerProfile?.bankAccountNumber,
    organizerProfile?.bankIfsc,
    organizerProfile?.city,
    organizerProfile?.contactEmail,
    organizerProfile?.contactPhone,
    organizerProfile?.description,
    organizerProfile?.gstNumber,
    organizerProfile?.instagramUrl,
    organizerProfile?.landlineNumber,
    organizerProfile?.linkedinUrl,
    organizerProfile?.orgName,
    organizerProfile?.panNumber,
    organizerProfile?.pincode,
    organizerProfile?.primaryContactName,
    organizerProfile?.secondaryContactPhone,
    organizerProfile?.state,
    organizerProfile?.tradeName,
    organizerProfile?.websiteUrl,
    profile?.dob,
    profile?.full_name,
    profile?.gender,
    profile?.location,
    profile?.locationArea,
    profile?.locationCity,
    profile?.locationLat,
    profile?.locationLng,
    profile?.locationPincode,
    profile?.locationState,
    profile?.phone,
    profile?.profession,
    session?.user?.email,
  ])

  // Seed the avatar from the saved profile. Skipped once a local preview exists,
  // so an in-flight upload is not clobbered by a profile refresh.
  useEffect(() => {
    if (avatarUrlRef.current) return
    setAvatarPreview(profile?.avatar_url ?? DEFAULT_AVATAR_IMAGE)
  }, [profile?.avatar_url])

  // Revoke the object URLs on unmount so the picked blobs are not leaked.
  useEffect(() => {
    return () => {
      if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current)
      if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current)
    }
  }, [])

  // Leaving with unsaved changes, part 1: hard navigation (refresh, tab close,
  // typing a new address). Only the browser's own prompt can stop these.
  useEffect(() => {
    if (!isDirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [isDirty])

  // Leaving with unsaved changes, part 2: in-app links (Back to dashboard, the
  // organizer sidebar). The App Router has no navigation-blocking API, so catch
  // the click on the way down and hold the destination instead.
  useEffect(() => {
    if (!isDirty) return
    const intercept = (event: MouseEvent) => {
      // Ignore anything the browser would not treat as a plain in-page nav:
      // new-tab modifier clicks, middle clicks, already-handled events.
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const anchor = (event.target as HTMLElement | null)?.closest?.("a")
      if (!anchor || anchor.target === "_blank") return

      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return

      const url = new URL(anchor.href, window.location.href)
      // External links unload the document, so beforeunload above covers them.
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname) return

      event.preventDefault()
      event.stopPropagation()
      setPendingHref(`${url.pathname}${url.search}`)
    }
    // Capture phase: must run before the Link's own click handler navigates.
    document.addEventListener("click", intercept, true)
    return () => document.removeEventListener("click", intercept, true)
  }, [isDirty])

  // Description grows to fit its text rather than scrolling inside a fixed box.
  // Height is reset to auto first so the box can shrink as well as grow.
  // `activeId` is a dependency because a hidden step (display:none) reports a
  // scrollHeight of 0, so the measurement has to be retaken once it is shown.
  useEffect(() => {
    const node = descriptionRef.current
    if (!node || node.offsetParent === null) return
    node.style.height = "auto"
    node.style.height = `${node.scrollHeight}px`
  }, [description, activeId])

  // Scroll-spy for the desktop rail. IntersectionObserver rather than a scroll
  // handler, so nothing runs per frame.
  useEffect(() => {
    const root = formNode
    if (!root) return
    const targets = CHAPTERS.map((chapter) => root.querySelector(`#${chapter.id}`)).filter(
      (node): node is Element => Boolean(node),
    )
    if (targets.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target.id) setActiveId(visible[0].target.id)
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    )
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [formNode])

  // Avatar uploads as soon as it is cropped, the same way the user profile does,
  // rather than waiting for Save. It is not part of the organizer payload, so
  // tying it to this form's dirty state would only make it feel stuck.
  const crop = useAvatarCrop({
    onError: setError,
    onCropped: async (croppedFile) => {
      if (avatarUrlRef.current) URL.revokeObjectURL(avatarUrlRef.current)
      const localUrl = URL.createObjectURL(croppedFile)
      avatarUrlRef.current = localUrl
      setAvatarPreview(localUrl)

      setError(null)
      setAvatarUploading(true)
      try {
        const upload = await uploadOrganizerAvatarImage(croppedFile)
        const fallback = user?.id ? getAvatarImageUrl("users", user.id, upload.version) : null
        const nextUrl = upload.publicUrl ?? fallback
        if (nextUrl) setAvatarPreview(nextUrl)
        try {
          await refreshProfile()
        } catch {
          // Non-fatal: the local preview already shows the new photo.
        }
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Could not upload photo.")
      } finally {
        setAvatarUploading(false)
      }
    },
  })

  const pickLogo = (file: File | null) => {
    if (!file) return
    if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current)
    const url = URL.createObjectURL(file)
    logoPreviewRef.current = url
    setLogoPreview(url)
    setLogoFile(file)
  }

  // Discards form edits and the pending logo. The avatar is deliberately left
  // alone: it has already uploaded, so there is nothing local to throw away.
  const discard = () => {
    form.reset()
    setLogoFile(null)
    if (logoPreviewRef.current) {
      URL.revokeObjectURL(logoPreviewRef.current)
      logoPreviewRef.current = null
    }
    setLogoPreview(null)
    setError(null)
  }

  // form.handleSubmit(...) is invoked HERE, during render, and the callbacks it
  // is handed read refs. react-hooks/refs rejects that: from the compiler's
  // point of view a function receiving a ref might read it during render, and
  // a ref read during render is a value React cannot track.
  //
  // The callbacks genuinely only run on submit, so the fix is to stop building
  // the handler during render. onSubmit now calls handleSubmit at EVENT time,
  // which is when it was always meant to run.
  const submitValid = async (submitted: Values) => {
    setError(null)
    saveSucceededRef.current = false
    try {
      let logoUrl = organizerProfile?.logoUrl ?? null
      let logoPublicId = organizerProfile?.logoPublicId ?? null

      if (logoFile) {
        const upload = await uploadFile(logoFile, "organizerLogo")
        logoUrl = upload.secureUrl
        logoPublicId = upload.publicId
      }

      await updateProfile({
        fullName: submitted.fullName.trim(),
        phone: `+91${submitted.personalPhone.trim()}`,
        dob: submitted.dob,
        location: submitted.location.trim(),
        locationArea: (submitted.locationArea ?? "").trim(),
        locationCity: (submitted.locationCity ?? "").trim(),
        locationState: (submitted.locationState ?? "").trim(),
        locationPincode: (submitted.locationPincode ?? "").trim(),
        locationLat: submitted.locationLat ?? undefined,
        locationLng: submitted.locationLng ?? undefined,
        gender: submitted.gender,
        profession:
          submitted.profession === OTHER_PROFESSION_VALUE
            ? (submitted.otherProfession ?? "").trim()
            : submitted.profession.trim(),
      })

      const entityType = organizerProfile?.entityType ?? "ORGANIZATION"

      await apiRequest("/organizer/profile", {
        method: "PUT",
        auth: true,
        body: JSON.stringify({
          entityType,
          // Only orgName is genuinely organization-only: an individual is shown
          // by their own name. Everything else is sent for both, because these
          // are exactly the fields that fill the public card, and the API allows
          // them for individuals.
          // orgName/tradeName/address/city/state/pincode/panNumber/gstNumber are
          // locked on this page (read-only inputs) — sent back unchanged so
          // saving the rest of the form cannot alter them.
          orgName: isIndividual ? null : submitted.orgName.trim() || null,
          tradeName: isIndividual ? null : submitted.tradeName?.trim() || null,
          description: submitted.description.trim() || null,
          contactEmail: submitted.contactEmail.trim() || null,
          contactPhone: submitted.contactPhone.trim() || null,
          landlineNumber: submitted.landlineNumber?.trim() || null,
          address: submitted.address.trim() || null,
          city: submitted.city.trim() || null,
          state: submitted.state.trim() || null,
          pincode: submitted.pincode.trim() || null,
          panNumber: submitted.panNumber.trim() || null,
          gstNumber: submitted.gstNumber?.trim() || null,
          bankAccountName: submitted.bankAccountName.trim() || null,
          bankAccountNumber: submitted.bankAccountNumber.trim() || null,
          bankIfsc: submitted.bankIfsc.trim() || null,
          websiteUrl: submitted.websiteUrl?.trim() || null,
          instagramUrl: submitted.instagramUrl?.trim() || null,
          linkedinUrl: submitted.linkedinUrl?.trim() || null,
          primaryContactName: submitted.primaryContactName?.trim() || null,
          secondaryContactPhone: submitted.secondaryContactPhone?.trim() || null,
          logoUrl,
          logoPublicId,
          // KYC is captured in /organizer/document-upload, not here. Send the
          // stored values straight back so saving this form cannot wipe them.
          kycDocUrl: organizerProfile?.kycDocUrl ?? null,
          kycDocPublicId: organizerProfile?.kycDocPublicId ?? null,
        }),
      })

      await refreshOrganizerStatus()
      setLogoFile(null)
      // reset() re-baselines the form as clean, which drops isDirty and swaps the
      // controls back to Back/Next. That swap is the confirmation.
      form.reset(submitted)
      saveSucceededRef.current = true
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Profile update failed.")
    }
  }

  // Validation failed. On mobile only one step is on screen, so an error on
  // another step would render on a hidden card and the save would look like it
  // silently did nothing. Jump to the first step that actually has an error.
  const submitInvalid = (fieldErrors: Record<string, unknown>) => {
    const firstBadStep = CHAPTERS.find((chapter) => chapter.fields.some((field) => field in fieldErrors))
    if (!firstBadStep) return
    setActiveId(firstBadStep.id)
    contentRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
  }

  // Built per event, not per render. Nothing here touches a ref until the user
  // actually submits.
  const onSubmit = (event?: React.BaseSyntheticEvent) =>
    form.handleSubmit(submitValid, submitInvalid)(event)

  /**
   * Mobile step change. Scrolls to the top of the content column, NOT the top of
   * the page: the page top is the preview card, which would leave the user above
   * the form having to scroll down to the step they just picked.
   */
  const goToStep = (index: number) => {
    const next = CHAPTERS[index]
    if (!next) return
    setActiveId(next.id)
    contentRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
  }

  const scrollToSection = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (!document.getElementById(id)) return
    event.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
    window.history.replaceState(null, "", `#${id}`)
  }

  /** Mobile shows one step; `lg:block` puts every card back on desktop. */
  const stepClass = (id: string) => (activeId === id ? "" : "hidden lg:block")

  /** Abandon the edits and go. Reset first so beforeunload stops arming. */
  const leaveWithoutSaving = () => {
    const href = pendingHref
    setPendingHref(null)
    discard()
    if (href) router.push(href)
  }

  /** Save, then go only if it actually succeeded. */
  const saveAndLeave = async () => {
    const href = pendingHref
    await onSubmit()
    if (!saveSucceededRef.current) {
      // Invalid or the request failed. Close the dialog and leave the user on the
      // page: onInvalid has already moved them to the offending step, and a
      // request error is showing in the banner.
      setPendingHref(null)
      return
    }
    setPendingHref(null)
    if (href) router.push(href)
  }

  const displayLogo = logoPreview ?? organizerProfile?.logoUrl ?? null

  // Individuals are shown by their own name. An ORGANIZATION still falls back to
  // the person's name while orgName is empty, so the heading is never the
  // placeholder once we know who they are.
  const displayName =
    (isIndividual ? values.fullName : values.orgName || values.fullName) || profile?.full_name || "Your profile"

  return (
    <ProtectedRoute requireOrganizer allowPendingOrganizer>
      <FormProvider {...form}>
        <div className="min-h-[100dvh] bg-background">
          <div className="mx-auto w-full max-w-[1280px] px-5 pb-32 pt-8 md:px-10 md:pt-12">
            <motion.header
              initial={reduce ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="pb-8 md:pb-12"
            >
              <Link
                href="/organizer/dashboard"
                className="group -ml-1 mb-6 inline-flex items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-[13px] font-medium text-slate-500 transition hover:text-slate-900"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-900/15 bg-white transition group-hover:border-brand-900 group-hover:bg-brand-900 group-hover:text-white">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </span>
                Back to dashboard
              </Link>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Organizer profile</p>
              <h1 className="mt-4 max-w-[16ch] font-bricolage text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 md:text-[3.25rem]">
                {displayName}
              </h1>
            </motion.header>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-14">
              {/* RAIL */}
              <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                <PublicPreview displayName={displayName} logoUrl={displayLogo} onLogoPick={pickLogo} />

                {/* Steps, desktop. Vertical, with a navy rule marking position. */}
                <div className="hidden rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-25px_rgba(12,29,55,0.2)] lg:block">
                  <nav>
                    {CHAPTERS.map((chapter) => {
                      const active = activeId === chapter.id
                      return (
                        <a
                          key={chapter.id}
                          href={`#${chapter.id}`}
                          onClick={(event) => scrollToSection(event, chapter.id)}
                          className={`flex items-center gap-3 border-l-2 py-2.5 pl-4 text-[13px] transition ${
                            active
                              ? "border-brand-900 font-semibold text-slate-900"
                              : "border-slate-900/10 text-slate-500 hover:border-slate-900/30 hover:text-slate-900"
                          }`}
                        >
                          <span className="flex-1">
                            {isIndividual && chapter.id === "organization" ? "About you" : chapter.title}
                          </span>
                        </a>
                      )
                    })}
                  </nav>
                </div>
              </aside>

              {/* CONTENT */}
              {/* scroll-mt clears the sticky site header when goToStep lands here. */}
              <div ref={contentRef} className="min-w-0 scroll-mt-[4.5rem]">
                {/* Steps, mobile. A numbered stepper, and only the active step's
                    card renders below it, so a phone shows one step at a time. */}
                <nav
                  aria-label="Profile steps"
                  className="sticky top-[4.5rem] z-30 -mx-5 mb-6 border-b border-slate-900/10 bg-background/90 px-4 py-3 backdrop-blur-lg lg:hidden"
                >
                  <ol className="grid grid-cols-5">
                    {CHAPTERS.map((chapter, index) => {
                      const active = activeId === chapter.id
                      // Steps behind you read as navy; ahead of you, grey.
                      const passed = index < activeIndex
                      const hasError = chapter.fields.some((field) => field in form.formState.errors)
                      return (
                        <li key={chapter.id} className="relative flex flex-col items-center gap-1.5">
                          {/* Connector runs from the previous circle's centre to
                              this one: the cell is 1/5 wide, so -50% to +50% of
                              it spans exactly centre to centre. */}
                          {index > 0 ? (
                            <span
                              aria-hidden
                              className={`absolute left-[-50%] top-[13px] h-0.5 w-full transition-colors ${
                                index <= activeIndex ? "bg-brand-900" : "bg-slate-900/15"
                              }`}
                            />
                          ) : null}
                          {/* Jumping between steps keeps edits: every step's fields
                              belong to one form, so switching only hides cards. */}
                          <button
                            type="button"
                            onClick={() => goToStep(index)}
                            aria-current={active ? "step" : undefined}
                            aria-label={`Go to ${chapter.title}${hasError ? " (has errors)" : ""}`}
                            className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold tabular-nums transition ${
                              active
                                ? "border-brand-900 bg-brand-900 text-white"
                                : hasError
                                  ? "border-rose-400 bg-white text-rose-600"
                                  : passed
                                    ? "border-brand-900 bg-white text-brand-900"
                                    : "border-slate-900/20 bg-white text-slate-400"
                            }`}
                          >
                            {index + 1}
                          </button>
                          <span
                            className={`text-center text-[9px] font-semibold leading-tight transition-colors ${
                              active ? "text-slate-900" : hasError ? "text-rose-600" : "text-slate-400"
                            }`}
                          >
                            {isIndividual && chapter.id === "organization" ? "About" : chapter.short}
                          </span>
                        </li>
                      )
                    })}
                  </ol>
                </nav>

                <form ref={setFormNode} onSubmit={onSubmit} className="space-y-5">
                  <Chapter chapter={CHAPTERS[0]} className={stepClass(CHAPTERS[0].id)}>
                    <Field label="Profile photo" hint="PNG, JPG or WEBP, up to 5MB. Saves as soon as you crop." className="sm:col-span-2">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={avatarUploading}
                          aria-label="Change profile photo"
                          className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 transition hover:border-brand-900 disabled:cursor-wait"
                        >
                          <img
                            src={avatarPreview || DEFAULT_AVATAR_IMAGE}
                            alt=""
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.onerror = null
                              event.currentTarget.src = DEFAULT_AVATAR_IMAGE
                            }}
                          />
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-brand-900/70 opacity-0 transition group-hover:opacity-100">
                            <Camera className="h-4 w-4 text-white" />
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={avatarUploading}
                          className="rounded-full border border-slate-900/15 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 transition hover:border-brand-900 hover:text-brand-900 disabled:opacity-60"
                        >
                          {avatarUploading ? "Uploading..." : "Change photo"}
                        </button>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(event) => {
                            crop.handleAvatarChange(event.target.files?.[0] ?? null)
                            event.target.value = ""
                          }}
                        />
                      </div>
                    </Field>
                    <Field label="Full name" name="fullName" required>
                      <input className={quietInput} {...register("fullName")} />
                    </Field>
                    <Field label="Account email" hint="Locked to your login.">
                      <input className={`${quietInput} text-slate-400`} value={session?.user?.email ?? ""} readOnly />
                    </Field>
                    <Field label="Phone" name="personalPhone" required>
                      <div className="flex items-baseline gap-2 border-b border-slate-900/15 transition focus-within:border-brand-900 hover:border-slate-900/30">
                        <span className="text-[15px] text-slate-500">+91</span>
                        <input
                          className="w-full bg-transparent py-1.5 text-[15px] text-slate-900 outline-none placeholder:text-slate-500"
                          placeholder="10 digit number"
                          inputMode="numeric"
                          maxLength={10}
                          {...register("personalPhone")}
                          onChange={(event) =>
                            setValue("personalPhone", event.target.value.replace(/\D/g, "").slice(0, 10), {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          }
                        />
                      </div>
                    </Field>
                    <Field label="Date of birth" name="dob" required hint={`You must be ${ORGANIZER_MIN_AGE} or older.`}>
                      <input
                        type="date"
                        min={DOB_BOUNDS.min}
                        max={DOB_BOUNDS.max}
                        className={quietInput}
                        {...register("dob")}
                      />
                    </Field>
                    <Field label="Location" name="location" required className="sm:col-span-2">
                      <StateDistrictLocalityPicker
                        initialState={values.locationState ?? ""}
                        initialDistrict={values.locationCity ?? ""}
                        initialLocalityLabel={values.location ?? ""}
                        onSelect={(loc) => {
                          setValue("location", loc.label, { shouldValidate: true, shouldDirty: true })
                          setValue("locationArea", loc.area, { shouldDirty: true })
                          setValue("locationCity", loc.city ?? "", { shouldDirty: true })
                          setValue("locationState", loc.state ?? "", { shouldDirty: true })
                          setValue("locationPincode", loc.pincode ?? "", { shouldDirty: true })
                          setValue("locationLat", loc.lat, { shouldDirty: true })
                          setValue("locationLng", loc.lng, { shouldDirty: true })
                        }}
                      />
                    </Field>
                    <Field label="Gender" name="gender" required>
                      <select className={quietInput} {...register("gender")}>
                        <option value="">Select gender</option>
                        {GENDER_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Profession" name="profession" required>
                      <select className={quietInput} {...register("profession")}>
                        <option value="">Select</option>
                        {PROFESSION_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {values.profession === OTHER_PROFESSION_VALUE ? (
                      <Field label="Other profession" name="otherProfession" required>
                        <input className={quietInput} placeholder="Enter your profession" {...register("otherProfession")} />
                      </Field>
                    ) : null}
                  </Chapter>

                  <Chapter
                    chapter={CHAPTERS[1]}
                    className={stepClass(CHAPTERS[1].id)}
                    title={isIndividual ? "About you" : undefined}
                    standfirst={
                      isIndividual
                        ? "How you appear to attendees on event pages. Optional, but this is what fills your public card."
                        : undefined
                    }
                  >
                    <Field
                      label={isIndividual ? "Your photo on events" : "Organization logo"}
                      hint="Square works best. Uploads when you save."
                      className="sm:col-span-2"
                    >
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => orgLogoInputRef.current?.click()}
                          aria-label="Change organization logo"
                          className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:border-brand-900"
                        >
                          {displayLogo ? (
                            <img src={displayLogo} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-slate-300">
                              <Building2 className="h-6 w-6" />
                            </span>
                          )}
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-brand-900/70 opacity-0 transition group-hover:opacity-100">
                            <Camera className="h-4 w-4 text-white" />
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => orgLogoInputRef.current?.click()}
                          className="rounded-full border border-slate-900/15 bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 transition hover:border-brand-900 hover:text-brand-900"
                        >
                          {logoFile ? "Change again" : displayLogo ? "Change logo" : "Add logo"}
                        </button>
                        {logoFile ? <span className="truncate text-xs text-slate-400">{logoFile.name}</span> : null}
                        <input
                          ref={orgLogoInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            pickLogo(event.target.files?.[0] ?? null)
                            event.target.value = ""
                          }}
                        />
                      </div>
                    </Field>

                    {/* An individual has no organization name; they are shown by
                        their own name, so the field would be meaningless. Legal
                        name/trade name are locked — see buildLegalChangeRequestHref
                        and the "Legal details" note near Bank & compliance. */}
                    {!isIndividual ? (
                      <>
                        <Field label="Legal name" name="orgName" hint="Locked — set at onboarding.">
                          <input className={`${quietInput} cursor-default text-slate-400`} readOnly tabIndex={-1} {...register("orgName")} />
                        </Field>
                        <Field label="Trade name" name="tradeName" hint="Locked — set at onboarding.">
                          <input className={`${quietInput} cursor-default text-slate-400`} readOnly tabIndex={-1} {...register("tradeName")} />
                        </Field>
                      </>
                    ) : null}
                    <Field
                      label={isIndividual ? "About you" : "Description"}
                      name="description"
                      required={!isIndividual}
                      className="sm:col-span-2"
                      hint={`${description.length} characters. Minimum 20. The preview trims after three lines.`}
                    >
                      {(() => {
                        // react-hook-form owns the ref, so take it and forward the
                        // node to both it and the auto-grow measurement.
                        const { ref: registerRef, ...field } = register("description")
                        return (
                          <textarea
                            {...field}
                            ref={(node) => {
                              registerRef(node)
                              descriptionRef.current = node
                            }}
                            rows={2}
                            className={`${quietInput} resize-none overflow-hidden leading-7`}
                          />
                        )
                      })()}
                    </Field>
                    <Field label="Contact email" name="contactEmail" required={!isIndividual}>
                      <input className={quietInput} {...register("contactEmail")} />
                    </Field>
                    <Field label="Contact phone" name="contactPhone" required={!isIndividual}>
                      <input className={quietInput} {...register("contactPhone")} />
                    </Field>
                    <Field label="Primary contact" name="primaryContactName">
                      <input className={quietInput} placeholder="Optional" {...register("primaryContactName")} />
                    </Field>
                    <Field label="Secondary phone" name="secondaryContactPhone">
                      <input className={quietInput} placeholder="Optional" {...register("secondaryContactPhone")} />
                    </Field>
                    <Field label="Landline" name="landlineNumber">
                      <input className={quietInput} placeholder="Optional, e.g. 040-12345678" {...register("landlineNumber")} />
                    </Field>
                  </Chapter>

                  <Chapter
                    chapter={CHAPTERS[2]}
                    className={stepClass(CHAPTERS[2].id)}
                    standfirst="Your registered legal address, used on invoices and tax filings. Locked — set at onboarding."
                  >
                    {/* Legal/registered address — locked, same as legal/trade name.
                        See buildLegalChangeRequestHref and the note near Bank &
                        compliance. */}
                    <Field label="Area" name="address" hint="Locked — set at onboarding." className="sm:col-span-2">
                      <input className={`${quietInput} cursor-default text-slate-400`} readOnly tabIndex={-1} {...register("address")} />
                    </Field>
                    <Field label="City" name="city" hint="Locked — set at onboarding.">
                      <input className={`${quietInput} cursor-default text-slate-400`} readOnly tabIndex={-1} {...register("city")} />
                    </Field>
                    <Field label="State" name="state" hint="Locked — set at onboarding.">
                      <input className={`${quietInput} cursor-default text-slate-400`} readOnly tabIndex={-1} {...register("state")} />
                    </Field>
                    <Field label="Pincode" name="pincode" hint="Locked — set at onboarding.">
                      <input
                        className={`${quietInput} cursor-default font-mono text-slate-400`}
                        readOnly
                        tabIndex={-1}
                        {...register("pincode")}
                      />
                    </Field>
                  </Chapter>

                  <Chapter chapter={CHAPTERS[3]} className={stepClass(CHAPTERS[3].id)}>
                    <HttpsField name="websiteUrl" label="Website" placeholder="yourdomain.com" />
                    <HttpsField name="instagramUrl" label="Instagram" placeholder="instagram.com/yourhandle" />
                    <HttpsField name="linkedinUrl" label="LinkedIn" placeholder="linkedin.com/company/you" />
                  </Chapter>

                  <Chapter chapter={CHAPTERS[4]} className={stepClass(CHAPTERS[4].id)}>
                    <Field label="PAN number" name="panNumber" hint="Locked — set at onboarding.">
                      <input className={`${quietInput} cursor-default font-mono uppercase text-slate-400`} readOnly tabIndex={-1} {...register("panNumber")} />
                    </Field>
                    <Field label="GST number" name="gstNumber" hint="Locked — set at onboarding.">
                      <input className={`${quietInput} cursor-default font-mono uppercase text-slate-400`} readOnly tabIndex={-1} {...register("gstNumber")} />
                    </Field>
                    <Field label="Account holder" name="bankAccountName" required className="sm:col-span-2">
                      <input className={quietInput} {...register("bankAccountName")} />
                    </Field>
                    <Field label="Account number" name="bankAccountNumber" required>
                      <input
                        className={`${quietInput} font-mono`}
                        inputMode="numeric"
                        {...register("bankAccountNumber")}
                      />
                    </Field>
                    <Field label="IFSC code" name="bankIfsc" required>
                      <input className={`${quietInput} font-mono uppercase`} {...register("bankIfsc")} />
                    </Field>
                  </Chapter>

                  {/* Legal details are locked once submitted (verified manually by
                      our team) — a change needs a tracked request, not a silent
                      self-service edit. Rides with the last step on mobile; sits at
                      the bottom of the stack on desktop. */}
                  <div
                    className={`rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-7 md:p-8 ${stepClass(
                      CHAPTERS[4].id,
                    )}`}
                  >
                    <h2 className="flex items-center gap-2 font-bricolage text-lg font-bold tracking-tight text-slate-900">
                      <Lock className="h-4 w-4 text-slate-500" />
                      Legal details are locked
                    </h2>
                    <p className="mt-1.5 max-w-[54ch] text-sm leading-6 text-slate-500">
                      Legal name, trade name, PAN, GSTIN, and registered address were verified at onboarding and can&apos;t
                      be edited here. To correct one, send a request and our team will verify and update it.
                    </p>
                    <Link
                      href={buildLegalChangeRequestHref()}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100 active:translate-y-px"
                    >
                      Request a change
                    </Link>
                  </div>

                  {error ? (
                    <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {error}
                    </p>
                  ) : null}

                  {/* Step controls, mobile only. Desktop scrolls the full stack and
                      saves from the sticky bar.
                      Clean step: Back / Next moves you along.
                      Edited step: the same two slots become Cancel / Save, so the
                      only ways out of a step are saving or discarding. */}
                  <div className="flex items-center gap-3 lg:hidden">
                    {isDirty ? (
                      <>
                        <button
                          type="button"
                          onClick={discard}
                          disabled={form.formState.isSubmitting}
                          className="rounded-full border border-slate-900/15 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition disabled:opacity-40"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={form.formState.isSubmitting}
                          className="flex flex-1 items-center justify-center rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 active:translate-y-px disabled:opacity-60"
                        >
                          {form.formState.isSubmitting ? "Saving..." : "Save"}
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Hidden rather than disabled at the ends of the run:
                            there is no first-step Back or last-step Next. */}
                        {activeIndex > 0 ? (
                          <button
                            type="button"
                            onClick={() => goToStep(activeIndex - 1)}
                            className="flex items-center gap-1.5 rounded-full border border-slate-900/15 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            Back
                          </button>
                        ) : null}
                        {activeIndex < CHAPTERS.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => goToStep(activeIndex + 1)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 active:translate-y-px"
                          >
                            Next
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Quiet sticky bar. Desktop only: on mobile the step controls already
              carry Cancel/Save, so this would be a duplicate. */}
          {isDirty ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-slate-900/10 bg-background/90 backdrop-blur-lg lg:block"
            >
              <div className="mx-auto flex w-full max-w-[1280px] items-center gap-4 px-5 py-3 md:px-10">
                <p className="flex-1 text-xs text-slate-500">Unsaved changes</p>
                <button
                  type="button"
                  onClick={discard}
                  className="text-xs font-semibold text-slate-400 transition hover:text-slate-900"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => void onSubmit()}
                  disabled={form.formState.isSubmitting}
                  className="rounded-full bg-brand-900 px-5 py-2 text-xs font-bold text-white transition hover:bg-brand-800 active:translate-y-px disabled:opacity-60"
                >
                  {form.formState.isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </motion.div>
          ) : null}

          <AvatarCropDialog crop={crop} />

          {/* Raised when a link is clicked with unsaved changes. */}
          {pendingHref ? (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
              // Clicking the backdrop is the "stay" action: the safe default.
              onClick={() => setPendingHref(null)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="unsaved-title"
            >
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: EASE }}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_30px_70px_-20px_rgba(12,29,55,0.45)]"
              >
                <h2 id="unsaved-title" className="font-bricolage text-xl font-bold tracking-tight text-slate-900">
                  You have unsaved changes
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Save them before leaving, or they will be lost.
                </p>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={() => void saveAndLeave()}
                    disabled={form.formState.isSubmitting}
                    className="rounded-full bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 active:translate-y-px disabled:opacity-60 sm:flex-1"
                  >
                    {form.formState.isSubmitting ? "Saving..." : "Save and leave"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingHref(null)}
                    className="rounded-full border border-slate-900/15 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 sm:flex-1"
                  >
                    Stay
                  </button>
                  <button
                    type="button"
                    onClick={leaveWithoutSaving}
                    className="rounded-full px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    Leave without saving
                  </button>
                </div>
              </motion.div>
            </div>
          ) : null}
        </div>
      </FormProvider>
    </ProtectedRoute>
  )
}
