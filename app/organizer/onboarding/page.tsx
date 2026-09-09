"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import NextImage from "next/image"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, CalendarIcon, Landmark, ShieldCheck, UploadCloud } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { StateDistrictLocalityPicker } from "@/components/common/state-district-locality-picker"
import { useAuth } from "@/app/providers"
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

const DRAFT_STORAGE_KEY = "organizer-onboarding-draft-v3"
const GST_CHOICE_STORAGE_KEY = "organizer-onboarding-gst-choice-v2"
const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]
const DOB_BOUNDS = getDobDateBounds(new Date(), ORGANIZER_MIN_AGE)
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TEN_DIGIT_PHONE_PATTERN = /^\d{10}$/
const PINCODE_PATTERN = /^\d{6}$/
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/

// Official CBIC GST state/UT codes — the first 2 digits of any GSTIN. Kept in
// sync with Backend/src/services/kyc.service.ts's copy.
const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
  "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "25": "Daman and Diu", "26": "Dadra and Nagar Haveli", "27": "Maharashtra", "28": "Andhra Pradesh",
  "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
  "34": "Puducherry", "35": "Andaman and Nicobar Islands", "36": "Telangana", "37": "Andhra Pradesh",
  "38": "Ladakh", "97": "Other Territory", "99": "Centre"
}

// Return the exact state the GSTIN's state code maps to (no normalization).
const stateFromGstin = (gstin: string): string => GST_STATE_CODES[gstin.slice(0, 2)] ?? ""

const GSTN_CODEPOINT_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

// Validates the GSTIN check digit (15th char) so fabricated-but-well-formatted
// GSTINs are rejected before/independent of the server verification call.
const isValidGstinChecksum = (gstin: string): boolean => {
  if (gstin.length !== 15) return false
  const body = gstin.slice(0, 14)
  const providedCheck = gstin[14]
  const mod = GSTN_CODEPOINT_CHARS.length
  let factor = 2
  let sum = 0

  for (let i = body.length - 1; i >= 0; i -= 1) {
    const codePoint = GSTN_CODEPOINT_CHARS.indexOf(body[i])
    if (codePoint < 0) return false
    let digit = factor * codePoint
    factor = factor === 2 ? 1 : 2
    digit = Math.floor(digit / mod) + (digit % mod)
    sum += digit
  }

  const checkCodePoint = (mod - (sum % mod)) % mod
  return GSTN_CODEPOINT_CHARS[checkCodePoint] === providedCheck
}

const schema = z
  .object({
    fullName: z.string().min(2, "Enter your full name"),
    personalPhone: z.string().regex(/^\d{10}$/, "Enter a valid 10 digit phone number"),
    dob: z.string().min(1, "Select your date of birth"),
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
    // Organization Details — organizer types these themselves (there is no
    // live GSTIN lookup); the Baatasari team verifies and approves manually.
    // Required-when-GSTIN-present is enforced procedurally in saveStepThree,
    // not here, since this step is skipped entirely for PAN-only organizers.
    orgName: z.string().optional(),
    tradeName: z.string().optional(),
    description: z.string().optional(),
    contactEmail: z.string().optional(),
    contactPhone: z.string().optional(),
    secondaryContactPhone: z.string().optional(),
    landlineNumber: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    websiteUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
    instagramUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
    linkedinUrl: z.string().url("Enter a valid URL").or(z.literal("")).optional(),
    panNumber: z.string().min(1, "Enter your PAN number").refine(
      (v) => PAN_RE.test(v.toUpperCase()),
      { message: "Invalid PAN format (e.g. ABCDE1234F)" }
    ),
    bankAccountName: z.string().min(2, "Enter the beneficiary name"),
    bankName: z.string().min(1, "Select your bank"),
    bankAccountType: z.string().min(1, "Select the account type"),
    bankAccountNumber: z.string().min(6, "Enter a valid account number"),
    confirmBankAccountNumber: z.string().optional(),
    bankIfsc: z.string().min(4, "Enter a valid IFSC code").refine(
      (v) => IFSC_RE.test(v.toUpperCase()),
      { message: "Invalid IFSC format (e.g. SBIN0000001)" }
    ),
    itrFiledLastTwoYears: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.dob && !isDobWithinBounds(value.dob, DOB_BOUNDS)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dob"],
        message: `Event organizers must be at least ${DOB_BOUNDS.minAge} years old.`,
      })
    }

    if (value.profession === OTHER_PROFESSION_VALUE && (!value.otherProfession || value.otherProfession.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["otherProfession"],
        message: "Enter your profession",
      })
    }

    // All contact fields below are optional — only their FORMAT is validated
    // when the organizer actually fills them in.
    if (value.contactEmail && !EMAIL_PATTERN.test(value.contactEmail.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contactEmail"],
        message: "Enter a valid contact email",
      })
    }

    if (value.contactPhone && value.contactPhone.trim() && !TEN_DIGIT_PHONE_PATTERN.test(value.contactPhone.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contactPhone"],
        message: "Contact phone must be 10 digits",
      })
    }

    if (value.secondaryContactPhone && value.secondaryContactPhone.trim() && !TEN_DIGIT_PHONE_PATTERN.test(value.secondaryContactPhone.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secondaryContactPhone"],
        message: "Secondary phone must be 10 digits",
      })
    }

    if (value.pincode && !PINCODE_PATTERN.test(value.pincode.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pincode"],
        message: "Pincode must be 6 digits",
      })
    }

    if (value.confirmBankAccountNumber && value.confirmBankAccountNumber !== value.bankAccountNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmBankAccountNumber"],
        message: "Account numbers do not match",
      })
    }

    // ITR and the no-GSTIN undertaking are only relevant when the organizer
    // has a GSTIN / has chosen "no" — both depend on UI state outside this
    // schema, so they're validated procedurally in saveStepTwo instead.
  })

type Values = z.infer<typeof schema>

const allSteps = [
  { id: 0, title: "Personal Details" },
  { id: 1, title: "GSTIN / PAN" },
  { id: 2, title: "Organization Details" },
  { id: 3, title: "Bank & Compliance" },
]

const stepOneFields: Array<keyof Values> = [
  "fullName",
  "personalPhone",
  "dob",
  "location",
  "gender",
  "profession",
  "otherProfession",
]

const stepTwoFields: Array<keyof Values> = ["panNumber"]

const stepThreeFields: Array<keyof Values> = [
  "orgName",
  "description",
  "contactEmail",
  "contactPhone",
  "secondaryContactPhone",
  "landlineNumber",
  "address",
  "city",
  "state",
  "pincode",
  "websiteUrl",
  "instagramUrl",
  "linkedinUrl",
]

const stepFourFields: Array<keyof Values> = [
  "bankAccountName",
  "bankName",
  "bankAccountType",
  "bankAccountNumber",
  "confirmBankAccountNumber",
  "bankIfsc",
]

const ACCOUNT_TYPE_OPTIONS = ["Savings account", "Current account"]

const BANK_NAME_OPTIONS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "Indian Bank",
  "Bank of India",
  "Central Bank of India",
  "Indian Overseas Bank",
  "IDBI Bank",
  "Yes Bank",
  "IndusInd Bank",
  "Federal Bank",
  "RBL Bank",
  "Bandhan Bank",
  "AU Small Finance Bank",
  "IDFC FIRST Bank",
  "Other",
]

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"

const readOnlyInputClassName =
  "mt-2 w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-700 shadow-sm"

const textareaClassName =
  "mt-2 min-h-32 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"

const getDraft = () => {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { step?: number; values?: Partial<Values> }
  } catch {
    return null
  }
}

const persistDraft = (step: number, values: Partial<Values>) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ step, values }))
}

const clearDraft = () => {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(DRAFT_STORAGE_KEY)
}

const stripIndianCode = (value: string | null | undefined) => (value ?? "").replace(/^\+91/, "")

export default function OrganizerOnboardingPage() {
  const router = useRouter()
  const { session, user, profile, organizerProfile, updateProfile, refreshOrganizerStatus, completeRoleOnboarding } = useAuth()

  const [step, setStep] = useState(0)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(DEFAULT_AVATAR_IMAGE)
  const [cropSource, setCropSource] = useState<string | null>(null)
  const [isCropOpen, setIsCropOpen] = useState(false)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [offsetStart, setOffsetStart] = useState({ x: 0, y: 0 })
  const [cropImage, setCropImage] = useState<HTMLImageElement | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSavingStepOne, setIsSavingStepOne] = useState(false)
  const [isSavingStepTwo, setIsSavingStepTwo] = useState(false)
  const [isSavingStepThree, setIsSavingStepThree] = useState(false)
  const [ifscLoading, setIfscLoading] = useState(false)
  const [ifscBranch, setIfscBranch] = useState<string | null>(null)
  const [dobOpen, setDobOpen] = useState(false)
  const [hasGstin, setHasGstin] = useState<"yes" | "no">("yes")
  const [gstDeclarationAccepted, setGstDeclarationAccepted] = useState(false)
  const [showGstModal, setShowGstModal] = useState(false)
  // No live GSTIN lookup — the organizer types their GSTIN and we validate
  // its format/checksum locally; Baatasari verifies and approves manually.
  const [gstin, setGstin] = useState("")
  const [gstinError, setGstinError] = useState<string | null>(null)
  const [itrError, setItrError] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  const cropContainerRef = useRef<HTMLDivElement>(null)
  const previewUrlRef = useRef<string | null>(null)
  const logoPreviewRef = useRef<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const ifscLookupRef = useRef<string | null>(null)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
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
      bankAccountName: "",
      bankName: "",
      bankAccountType: "",
      bankAccountNumber: "",
      confirmBankAccountNumber: "",
      bankIfsc: "",
      itrFiledLastTwoYears: "",
    },
  })

  const selectedProfession = form.watch("profession")
  const panValue = form.watch("panNumber")
  const showOrganizationStep = hasGstin === "yes"
  const activeSteps = showOrganizationStep ? allSteps : [allSteps[0], allSteps[1], allSteps[3]]

  // PAN-only (no GSTIN) skips the Organization Details step entirely.
  useEffect(() => {
    if (!showOrganizationStep && step === 2) {
      setStep(3)
    }
  }, [showOrganizationStep, step])

  useEffect(() => {
    const profileProfession = getProfessionFormValues(profile?.profession)
    const baseValues: Values = {
      fullName: profile?.full_name ?? "",
      personalPhone: stripIndianCode(profile?.phone),
      dob: profile?.dob ?? "",
      location: profile?.location ?? "",
      locationArea: "",
      locationCity: "",
      locationState: "",
      locationPincode: "",
      locationLat: null,
      locationLng: null,
      gender: profile?.gender ?? "",
      profession: profileProfession.profession,
      otherProfession: profileProfession.otherProfession,
      orgName: organizerProfile?.orgName ?? "",
      tradeName: organizerProfile?.tradeName ?? "",
      description: organizerProfile?.description ?? "",
      contactEmail: organizerProfile?.contactEmail ?? session?.user?.email ?? "",
      contactPhone: organizerProfile?.contactPhone ?? stripIndianCode(profile?.phone),
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
      bankAccountName: organizerProfile?.bankAccountName ?? "",
      bankName: organizerProfile?.bankName ?? "",
      bankAccountType: organizerProfile?.bankAccountType ?? "",
      bankAccountNumber: organizerProfile?.bankAccountNumber ?? "",
      bankIfsc: organizerProfile?.bankIfsc ?? "",
      itrFiledLastTwoYears:
        organizerProfile?.itrFiledLastTwoYears === true
          ? "yes"
          : organizerProfile?.itrFiledLastTwoYears === false
            ? "no"
            : "",
    }

    const draft = getDraft()
    form.reset({
      ...baseValues,
      ...(draft?.values ?? {}),
    })
    const normalizedDraftStep = typeof draft?.step === "number" && draft.step >= 0 && draft.step <= 3 ? draft.step : 0
    setStep(normalizedDraftStep)
    setAvatarPreview(profile?.avatar_url ?? DEFAULT_AVATAR_IMAGE)
    setLogoPreview(organizerProfile?.logoUrl ?? null)
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
    organizerProfile?.bankName,
    organizerProfile?.bankAccountType,
    organizerProfile?.itrFiledLastTwoYears,
    organizerProfile?.instagramUrl,
    organizerProfile?.landlineNumber,
    organizerProfile?.linkedinUrl,
    organizerProfile?.logoUrl,
    organizerProfile?.orgName,
    organizerProfile?.panNumber,
    organizerProfile?.pincode,
    organizerProfile?.secondaryContactPhone,
    organizerProfile?.state,
    organizerProfile?.tradeName,
    organizerProfile?.websiteUrl,
    profile?.avatar_url,
    profile?.dob,
    profile?.full_name,
    profile?.gender,
    profile?.location,
    profile?.phone,
    profile?.profession,
    session?.user?.email,
  ])

  // Seed the GSTIN choice: the saved profile is the base, and an in-progress
  // local choice (if the user already picked one) wins.
  useEffect(() => {
    let next: { hasGstin: "yes" | "no"; accepted: boolean; gstin: string } =
      organizerProfile?.gstDeclarationMode === "NO_GSTIN"
        ? { hasGstin: "no", accepted: !!organizerProfile?.undertakingAccepted, gstin: "" }
        : { hasGstin: "yes", accepted: false, gstin: organizerProfile?.gstNumber ?? "" }

    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(GST_CHOICE_STORAGE_KEY) : null
      if (raw) {
        const parsed = JSON.parse(raw) as {
          hasGstin?: "yes" | "no"
          accepted?: boolean
          gstin?: string
        }
        if (parsed?.hasGstin === "yes" || parsed?.hasGstin === "no") {
          next = {
            hasGstin: parsed.hasGstin,
            accepted: parsed.hasGstin === "no" ? !!parsed.accepted : false,
            gstin: parsed.gstin ?? next.gstin,
          }
        }
      }
    } catch {
      // ignore malformed choice
    }

    setHasGstin(next.hasGstin)
    setGstDeclarationAccepted(next.accepted)
    setGstin(next.gstin)
  }, [organizerProfile?.gstDeclarationMode, organizerProfile?.undertakingAccepted, organizerProfile?.gstNumber])

  const persistGstChoice = (choice: "yes" | "no", accepted: boolean, gstinValue: string) => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(
      GST_CHOICE_STORAGE_KEY,
      JSON.stringify({ hasGstin: choice, accepted, gstin: gstinValue })
    )
  }

  useEffect(() => {
    const subscription = form.watch((value) => {
      persistDraft(step, value as Partial<Values>)
    })

    return () => subscription.unsubscribe()
  }, [form, step])

  useEffect(() => {
    persistDraft(step, form.getValues())
  }, [form, step])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
      if (logoPreviewRef.current) {
        URL.revokeObjectURL(logoPreviewRef.current)
      }
    }
  }, [])

  const getCropMetrics = (zoom: number = cropZoom) => {
    if (!cropImage) return null

    const containerSize = 240
    const baseScale = Math.max(containerSize / cropImage.naturalWidth, containerSize / cropImage.naturalHeight)
    const scaledWidth = cropImage.naturalWidth * baseScale * zoom
    const scaledHeight = cropImage.naturalHeight * baseScale * zoom
    const maxX = Math.max(0, (scaledWidth - containerSize) / 2)
    const maxY = Math.max(0, (scaledHeight - containerSize) / 2)

    return { containerSize, baseScale, scaledWidth, scaledHeight, maxX, maxY }
  }

  const clampOffset = (offset: { x: number; y: number }, zoom: number = cropZoom) => {
    const metrics = getCropMetrics(zoom)
    if (!metrics) return { x: 0, y: 0 }

    return {
      x: Math.min(metrics.maxX, Math.max(-metrics.maxX, offset.x)),
      y: Math.min(metrics.maxY, Math.max(-metrics.maxY, offset.y)),
    }
  }

  const handleAvatarChange = (file: File | null) => {
    setError(null)
    if (!file) return

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setError("Only PNG, JPG, GIF, or WEBP images are allowed.")
      return
    }

    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setError("Image must be 5MB or less.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      if (!result) return

      const image = new Image()
      image.onload = () => {
        setCropImage(image)
        setCropSource(result)
        setCropZoom(1)
        setCropOffset({ x: 0, y: 0 })
        setIsCropOpen(true)
      }
      image.src = result
    }
    reader.readAsDataURL(file)
  }

  const closeCrop = () => {
    setIsCropOpen(false)
    setCropSource(null)
    setCropImage(null)
  }

  const applyCrop = async () => {
    if (!cropImage) return
    const metrics = getCropMetrics()
    if (!metrics) return

    const scale = metrics.baseScale * cropZoom
    const sourceSize = metrics.containerSize / scale
    const sourceX = (cropImage.naturalWidth - sourceSize) / 2 - cropOffset.x / scale
    const sourceY = (cropImage.naturalHeight - sourceSize) / 2 - cropOffset.y / scale

    const canvas = document.createElement("canvas")
    canvas.width = 512
    canvas.height = 512

    const context = canvas.getContext("2d")
    if (!context) return

    context.drawImage(
      cropImage,
      Math.max(0, sourceX),
      Math.max(0, sourceY),
      Math.min(sourceSize, cropImage.naturalWidth),
      Math.min(sourceSize, cropImage.naturalHeight),
      0,
      0,
      canvas.width,
      canvas.height,
    )

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85))

    if (!blob || blob.size > MAX_AVATAR_FILE_SIZE) {
      setError("Cropped image is too large. Try zooming out.")
      return
    }

    const croppedFile = new File([blob], "avatar.webp", { type: "image/webp" })
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    const previewUrl = URL.createObjectURL(croppedFile)
    previewUrlRef.current = previewUrl

    setAvatarPreview(previewUrl)
    setAvatarFile(croppedFile)
    setIsCropOpen(false)
  }

  const uploadAvatarIfNeeded = async () => {
    if (!avatarFile) {
      return
    }

    if (!user?.id) {
      throw new Error("Authentication required.")
    }

    const upload = await uploadOrganizerAvatarImage(avatarFile)
    setAvatarFile(null)
    setAvatarPreview(getAvatarImageUrl("organizers", user.id, upload.version))
  }

  const pickLogo = (file: File | null) => {
    if (!file) return
    setError(null)

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setError("Only PNG, JPG, GIF, or WEBP images are allowed.")
      return
    }
    if (file.size > MAX_AVATAR_FILE_SIZE) {
      setError("Logo image must be 5MB or less.")
      return
    }

    if (logoPreviewRef.current) URL.revokeObjectURL(logoPreviewRef.current)
    const url = URL.createObjectURL(file)
    logoPreviewRef.current = url
    setLogoPreview(url)
    setLogoFile(file)
  }

  // Uploads the pending logo (if any) and returns the URL/publicId to save —
  // falls back to whatever's already on file so a step save without a new
  // logo pick doesn't wipe out a previously-uploaded one.
  const uploadLogoIfNeeded = async (): Promise<{ logoUrl: string | null; logoPublicId: string | null }> => {
    if (!logoFile) {
      return {
        logoUrl: organizerProfile?.logoUrl ?? null,
        logoPublicId: organizerProfile?.logoPublicId ?? null,
      }
    }

    setLogoUploading(true)
    try {
      const upload = await uploadFile(logoFile, "organizerLogo")
      setLogoFile(null)
      return { logoUrl: upload.secureUrl, logoPublicId: upload.publicId }
    } finally {
      setLogoUploading(false)
    }
  }

  const resolveProfession = (values: Values) =>
    values.profession === OTHER_PROFESSION_VALUE ? values.otherProfession?.trim() ?? "" : values.profession.trim()

  const buildOrganizerPayload = (
    values: Values,
    logo: { logoUrl: string | null; logoPublicId: string | null } | null = null
  ) => ({
    entityType: hasGstin === "yes" ? "ORGANIZATION" : "INDIVIDUAL",
    orgName: hasGstin === "no" ? null : values.orgName?.trim() || null,
    tradeName: hasGstin === "no" ? null : values.tradeName?.trim() || null,
    description: hasGstin === "no" ? null : values.description?.trim() || null,
    contactEmail: hasGstin === "no" ? null : values.contactEmail?.trim() || null,
    contactPhone: hasGstin === "no" ? null : values.contactPhone?.trim() || null,
    landlineNumber: hasGstin === "no" ? null : values.landlineNumber?.trim() || null,
    address: hasGstin === "no" ? null : values.address?.trim() || null,
    city: hasGstin === "no" ? null : values.city?.trim() || null,
    state: hasGstin === "no" ? null : values.state?.trim() || null,
    pincode: hasGstin === "no" ? null : values.pincode?.trim() || null,
    panNumber: values.panNumber.trim().toUpperCase() || null,
    gstNumber: hasGstin === "no" ? null : gstin.trim().toUpperCase() || null,
    gstDeclarationMode: hasGstin === "no" ? "NO_GSTIN" : "HAS_GSTIN",
    gstDetails: hasGstin === "no" || !gstin.trim()
      ? []
      : [{ gstin: gstin.trim().toUpperCase(), state: values.state?.trim() || stateFromGstin(gstin) }],
    undertakingAccepted: hasGstin === "no" ? gstDeclarationAccepted : false,
    undertakingState: hasGstin === "no" ? (values.locationState?.trim() || null) : null,
    itrFiledLastTwoYears:
      hasGstin === "no"
        ? null
        : values.itrFiledLastTwoYears === "yes"
          ? true
          : values.itrFiledLastTwoYears === "no"
            ? false
            : null,
    bankAccountName: values.bankAccountName.trim() || null,
    bankName: values.bankName?.trim() || null,
    bankAccountType: values.bankAccountType?.trim() || null,
    bankAccountNumber: values.bankAccountNumber.trim() || null,
    bankIfsc: values.bankIfsc.trim().toUpperCase() || null,
    websiteUrl: values.websiteUrl?.trim() || null,
    instagramUrl: values.instagramUrl?.trim() || null,
    linkedinUrl: values.linkedinUrl?.trim() || null,
    secondaryContactPhone: values.secondaryContactPhone?.trim() || null,
    logoUrl: logo?.logoUrl ?? organizerProfile?.logoUrl ?? null,
    logoPublicId: logo?.logoPublicId ?? organizerProfile?.logoPublicId ?? null,
    kycDocUrl: organizerProfile?.kycDocUrl ?? null,
    kycDocPublicId: organizerProfile?.kycDocPublicId ?? null,
  })

  const selectGstinYes = () => {
    setHasGstin("yes")
    setGstDeclarationAccepted(false)
    setShowGstModal(false)
    setGstinError(null)
    persistGstChoice("yes", false, gstin)
  }

  const selectGstinNo = () => {
    setHasGstin("no")
    setGstinError(null)
    persistGstChoice("no", gstDeclarationAccepted, gstin)
    if (!gstDeclarationAccepted) setShowGstModal(true)
  }

  const acceptGstDeclaration = () => {
    setGstDeclarationAccepted(true)
    setShowGstModal(false)
    persistGstChoice("no", true, gstin)
  }

  const closeGstModal = () => {
    // The "No" radio already reflects the choice; closing just dismisses the
    // undertaking. Acceptance is gated separately at the step's Continue.
    setShowGstModal(false)
  }

  // No live lookup — just format/checksum feedback as they type, and a
  // state auto-fill nicety (derived from the GSTIN's own digits, not an API).
  const updateGstinValue = (value: string) => {
    const upper = value.toUpperCase()
    setGstinError(null)
    setGstin(upper)
    persistGstChoice("yes", false, upper)
    if (GSTIN_RE.test(upper)) {
      const derivedState = stateFromGstin(upper)
      if (derivedState && !form.getValues().state?.trim()) {
        form.setValue("state", derivedState, { shouldValidate: true })
      }
    }
  }

  // Looks up the bank/branch as soon as a complete, valid IFSC is entered —
  // no need to blur the field. Deduped so the same code isn't fetched twice.
  const lookupIfsc = async (code: string) => {
    const upper = code.toUpperCase().trim()
    if (!IFSC_RE.test(upper)) {
      setIfscBranch(null)
      ifscLookupRef.current = null
      return
    }
    if (ifscLookupRef.current === upper) return
    ifscLookupRef.current = upper
    setIfscLoading(true)
    try {
      const res = await apiRequest<{ data: { bank: string; branch: string } }>(
        `/organizer/verify/ifsc/${upper}`,
        { auth: true }
      )
      setIfscBranch(`${res.data.bank} — ${res.data.branch}`)
    } catch {
      setIfscBranch(null)
      ifscLookupRef.current = null
    } finally {
      setIfscLoading(false)
    }
  }

  const saveStepOne = async () => {
    setNotice(null)
    setError(null)

    const isValid = await form.trigger(stepOneFields)
    if (!isValid) return

    setIsSavingStepOne(true)

    try {
      const values = form.getValues()
      await uploadAvatarIfNeeded()

      await updateProfile({
        fullName: values.fullName.trim(),
        phone: `+91${values.personalPhone.trim()}`,
        dob: values.dob,
        location: values.location.trim(),
        locationArea: (values.locationArea ?? "").trim(),
        locationCity: (values.locationCity ?? "").trim(),
        locationState: (values.locationState ?? "").trim(),
        locationPincode: (values.locationPincode ?? "").trim(),
        locationLat: values.locationLat ?? undefined,
        locationLng: values.locationLng ?? undefined,
        gender: values.gender,
        profession: resolveProfession(values),
      })

      persistDraft(1, values)
      setStep(1)
      setNotice("Personal details saved. You can continue now or return later.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your progress.")
    } finally {
      setIsSavingStepOne(false)
    }
  }

  // GSTIN / PAN step. Validates PAN + (GSTIN verified OR no-GSTIN
  // undertaking accepted) + ITR question, then saves and either continues to
  // Organization Details (has GSTIN) or skips straight to Bank (PAN only).
  const saveStepTwo = async () => {
    setNotice(null)
    setError(null)

    const isValid = await form.trigger(stepTwoFields)
    if (!isValid) return

    if (hasGstin === "no") {
      if (!gstDeclarationAccepted) {
        setError("Please review and accept the GST declaration to continue without a GSTIN.")
        setShowGstModal(true)
        return
      }
    } else {
      const trimmedGstin = gstin.trim().toUpperCase()
      const pan = form.getValues().panNumber.trim().toUpperCase()

      if (!trimmedGstin) {
        setGstinError('Enter your GSTIN, or select "No" if you don\'t have one.')
        setError('Enter your GSTIN, or select "No" above.')
        return
      }
      if (!GSTIN_RE.test(trimmedGstin) || !isValidGstinChecksum(trimmedGstin)) {
        setGstinError("Enter a valid GSTIN.")
        setError("Your GSTIN is not valid.")
        return
      }
      if (pan && trimmedGstin.slice(2, 12) !== pan) {
        setGstinError("Your GSTIN must match your PAN (characters 3–12).")
        setError("Your GSTIN does not match your PAN.")
        return
      }
      setGstinError(null)

      if (form.getValues().itrFiledLastTwoYears !== "yes" && form.getValues().itrFiledLastTwoYears !== "no") {
        setItrError("Please tell us if you have filed the last 2 years' ITR.")
        setError("Please answer the ITR filing question.")
        return
      }
      setItrError(null)
    }

    setIsSavingStepTwo(true)
    try {
      const values = form.getValues()

      await apiRequest("/organizer/profile", {
        method: "PUT",
        auth: true,
        body: JSON.stringify(buildOrganizerPayload(values)),
      })

      await refreshOrganizerStatus()
      const nextStep = hasGstin === "yes" ? 2 : 3
      persistDraft(nextStep, values)
      setStep(nextStep)
      setNotice("Saved. You can continue now or return later.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your GSTIN/PAN details.")
    } finally {
      setIsSavingStepTwo(false)
    }
  }

  // Organization Details step — only reachable when hasGstin === "yes". These
  // fields are typed by the organizer (no live GSTIN lookup); required-ness
  // is checked here rather than in the schema, since the schema is shared
  // with the PAN-only path where this whole step never runs.
  const saveStepThree = async () => {
    setNotice(null)
    setError(null)

    const isValid = await form.trigger(stepThreeFields)
    if (!isValid) return

    const values = form.getValues()
    const requiredFields: Array<{ key: keyof Values; label: string }> = [
      { key: "orgName", label: "Legal name" },
      { key: "description", label: "About Organization" },
      { key: "address", label: "Address" },
      { key: "city", label: "Place" },
      { key: "state", label: "State" },
      { key: "pincode", label: "Pincode" },
    ]
    const missing = requiredFields.find((field) => !String(values[field.key] ?? "").trim())
    if (missing) {
      setError(`${missing.label} is required.`)
      return
    }

    setIsSavingStepThree(true)
    try {
      const logo = await uploadLogoIfNeeded()

      await apiRequest("/organizer/profile", {
        method: "PUT",
        auth: true,
        body: JSON.stringify(buildOrganizerPayload(values, logo)),
      })

      await refreshOrganizerStatus()
      persistDraft(3, values)
      setStep(3)
      setNotice("Organization details saved. You can continue now or return later.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save your organization details.")
    } finally {
      setIsSavingStepThree(false)
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setNotice(null)
    setError(null)

    try {
      const isValid = await form.trigger(stepFourFields)
      if (!isValid) return

      await uploadAvatarIfNeeded()
      const logo = await uploadLogoIfNeeded()

      await updateProfile({
        fullName: values.fullName.trim(),
        phone: `+91${values.personalPhone.trim()}`,
        dob: values.dob,
        location: values.location.trim(),
        locationArea: (values.locationArea ?? "").trim(),
        locationCity: (values.locationCity ?? "").trim(),
        locationState: (values.locationState ?? "").trim(),
        locationPincode: (values.locationPincode ?? "").trim(),
        locationLat: values.locationLat ?? undefined,
        locationLng: values.locationLng ?? undefined,
        gender: values.gender,
        profession: resolveProfession(values),
      })

      await completeRoleOnboarding("EVENT_ORGANIZER", buildOrganizerPayload(values, logo))
      clearDraft()
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(GST_CHOICE_STORAGE_KEY)
      }

      if (user?.emailVerified) {
        if (user.organizerDocumentsSubmitted) {
          router.replace("/organizer/pending")
          return
        }
        router.replace("/organizer/document-upload")
        return
      }

      router.replace("/organizer/email-verification")
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit organizer onboarding.")
    }
  })

  return (
    <ProtectedRoute requireOnboarding={false}>
      <main className="mx-auto w-full max-w-7xl px-2 py-3 sm:px-3 sm:py-4 lg:px-4">
        <div className="rounded-[2rem] border border-white/60 bg-white/90 p-4 shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-5">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">Organizer Onboarding</h1>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              Complete your personal details, GSTIN or PAN, and bank details. Organization details are required
              only when you have a GSTIN.
            </p>
            <p className="max-w-3xl text-sm leading-6 text-slate-500">
              Your progress is saved as you move through the flow, so you can come back and continue later.
            </p>
          </div>

          <div className="mt-6 rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4">
            <div className={`grid gap-3 ${activeSteps.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
              {activeSteps.map((item, index) => {
                const isActive = step === item.id
                const isDone = step > item.id

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id <= step) {
                        setStep(item.id)
                      }
                    }}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-brand-900 bg-brand-900/5 shadow-sm"
                        : isDone
                          ? "border-emerald-200 bg-emerald-50/70"
                          : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                          isActive
                            ? "bg-brand-900 text-white"
                            : isDone
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Step {index + 1}</p>
                        <p className="mt-1 text-base font-semibold text-slate-950">{item.title}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <form className="mt-6 grid gap-6" onSubmit={onSubmit}>
            {step === 0 ? (
              <section className="grid gap-4 rounded-3xl border border-slate-200/80 bg-slate-50/60 p-5 md:grid-cols-[36%_64%]">
                <div className="flex h-full flex-col items-center justify-between gap-5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                  <div className="w-full">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Profile picture</p>
                  </div>

                  <div className="relative h-52 w-52 overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-[0_12px_22px_rgba(15,23,42,0.08)]">
                    <NextImage
                      src={avatarPreview || DEFAULT_AVATAR_IMAGE}
                      alt="Profile preview"
                      fill
                      unoptimized
                      className="object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null
                        event.currentTarget.src = DEFAULT_AVATAR_IMAGE
                      }}
                    />
                  </div>

                  <label className="w-full text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Upload image
                    <input
                      className="mt-2 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-900/10 file:px-3 file:py-1.5 file:text-[10px] file:font-semibold file:text-brand-800 hover:file:bg-brand-900/20"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)}
                    />
                  </label>
                  <p className="text-center text-xs text-slate-400">PNG, JPG, GIF, or WEBP up to 5MB (optional)</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2 md:pr-1">
                  <label className="block text-sm font-semibold text-slate-700">
                    Full name *
                    <input className={inputClassName} placeholder="Your full name" {...form.register("fullName")} />
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.fullName?.message ?? ""}</p>
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Account email
                    <input className={readOnlyInputClassName} type="email" value={session?.user?.email ?? ""} readOnly disabled />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Personal phone number *
                    <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-brand-900 focus-within:ring-4 focus-within:ring-brand-900/10">
                      <span className="text-sm font-semibold text-slate-500">+91</span>
                      <input
                        className="ml-2 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                        placeholder="10 digit number"
                        inputMode="numeric"
                        maxLength={10}
                        {...form.register("personalPhone")}
                        onChange={(event) => form.setValue("personalPhone", event.target.value.replace(/\D/g, "").slice(0, 10), { shouldValidate: true })}
                      />
                    </div>
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.personalPhone?.message ?? ""}</p>
                  </label>

                  <div className="block text-sm font-semibold text-slate-700">
                    Date of birth *
                    <Popover open={dobOpen} onOpenChange={setDobOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`${inputClassName} flex items-center justify-between`}
                        >
                          <span className={form.watch("dob") ? "text-slate-900" : "text-slate-400"}>
                            {form.watch("dob") && !Number.isNaN(new Date(form.watch("dob") + "T00:00:00").getTime())
                              ? format(new Date(form.watch("dob") + "T00:00:00"), "dd/MM/yyyy")
                              : "Select date of birth"}
                          </span>
                          <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            form.watch("dob") && !Number.isNaN(new Date(form.watch("dob") + "T00:00:00").getTime())
                              ? new Date(form.watch("dob") + "T00:00:00")
                              : undefined
                          }
                          onSelect={(date) => {
                            if (date) {
                              form.setValue("dob", format(date, "yyyy-MM-dd"), { shouldValidate: true })
                              setDobOpen(false)
                            }
                          }}
                          captionLayout="dropdown"
                          startMonth={new Date(new Date().getFullYear() - 100, 0)}
                          endMonth={new Date(new Date().getFullYear() - DOB_BOUNDS.minAge, 11)}
                          autoFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.dob?.message ?? ""}</p>
                  </div>

                  <div className="block text-sm font-semibold text-slate-700 md:col-span-2">
                    Location *
                    <div className="mt-2">
                      <StateDistrictLocalityPicker
                        initialState={form.watch("locationState") ?? ""}
                        initialDistrict={form.watch("locationCity") ?? ""}
                        initialLocalityLabel={form.watch("location")}
                        onSelect={(loc) => {
                          form.setValue("location", loc.label, { shouldValidate: true })
                          form.setValue("locationArea", loc.area, { shouldValidate: true })
                          form.setValue("locationCity", loc.city ?? "", { shouldValidate: true })
                          form.setValue("locationState", loc.state ?? "", { shouldValidate: true })
                          form.setValue("locationPincode", loc.pincode ?? "", { shouldValidate: true })
                          form.setValue("locationLat", loc.lat, { shouldValidate: true })
                          form.setValue("locationLng", loc.lng, { shouldValidate: true })
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.location?.message ?? ""}</p>
                  </div>

                  <label className="block text-sm font-semibold text-slate-700">
                    Gender *
                    <select className={inputClassName} {...form.register("gender")}>
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.gender?.message ?? ""}</p>
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Profession *
                    <select className={inputClassName} {...form.register("profession")}>
                      <option value="">Select</option>
                      {PROFESSION_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.profession?.message ?? ""}</p>
                  </label>

                  {selectedProfession === OTHER_PROFESSION_VALUE ? (
                    <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
                      Other profession *
                      <input className={inputClassName} placeholder="Enter your profession" {...form.register("otherProfession")} />
                      <p className="mt-1 text-xs text-rose-600">{form.formState.errors.otherProfession?.message ?? ""}</p>
                    </label>
                  ) : null}
                </div>
              </section>
            ) : null}

            {step === 1 ? (
              <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-start gap-3 mb-5">
                  <div className="rounded-2xl bg-brand-900/10 p-3 text-brand-900">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-950">GSTIN / PAN</p>
                    <p className="text-sm text-slate-500">Tell us your tax identity — GSTIN if you have one, PAN either way.</p>
                  </div>
                </div>

                <div className="grid gap-4 max-w-xl">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">PAN number *</label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        className={inputClassName}
                        placeholder="ABCDE1234F"
                        style={{ textTransform: "uppercase" }}
                        {...form.register("panNumber")}
                        onChange={(e) => {
                          form.setValue("panNumber", e.target.value.toUpperCase(), { shouldValidate: true })
                        }}
                      />
                      {panValue && PAN_RE.test((panValue ?? "").toUpperCase()) ? (
                        <span className="shrink-0 text-xs font-semibold text-emerald-600">✓ Valid</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.panNumber?.message ?? ""}</p>
                  </div>

                  <div>
                    <p className="block text-sm font-semibold text-slate-700">Do you have a GSTIN number?</p>
                    <div className="mt-2 flex items-center gap-6">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="hasGstin"
                          className="h-4 w-4 accent-brand-900"
                          checked={hasGstin === "yes"}
                          onChange={selectGstinYes}
                        />
                        Yes
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="hasGstin"
                          className="h-4 w-4 accent-brand-900"
                          checked={hasGstin === "no"}
                          onChange={selectGstinNo}
                        />
                        No
                      </label>
                    </div>

                    {hasGstin === "yes" ? (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <label className="block text-xs font-semibold text-slate-600">GSTIN Number</label>
                          <input
                            className={`${inputClassName} mt-1`}
                            placeholder="Enter your GSTIN Number"
                            style={{ textTransform: "uppercase" }}
                            maxLength={15}
                            value={gstin}
                            onChange={(e) => updateGstinValue(e.target.value)}
                          />
                          <p className="mt-2 text-xs text-slate-400">
                            {gstin && GSTIN_RE.test(gstin.trim().toUpperCase()) && isValidGstinChecksum(gstin.trim().toUpperCase())
                              ? "Looks valid — we'll verify and approve it manually."
                              : "We don't auto-verify GSTINs — our team checks and approves it manually against your organization details."}
                          </p>
                        </div>

                        {gstinError ? <p className="text-xs text-rose-600">{gstinError}</p> : null}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <label className="flex items-start gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 accent-brand-900"
                            checked={gstDeclarationAccepted}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setShowGstModal(true)
                              } else {
                                setGstDeclarationAccepted(false)
                                persistGstChoice("no", false, gstin)
                              }
                            }}
                          />
                          <span>
                            I have read and accept the{" "}
                            <button
                              type="button"
                              onClick={() => setShowGstModal(true)}
                              className="font-semibold text-brand-800 underline underline-offset-2"
                            >
                              undertaking
                            </button>
                          </span>
                        </label>
                        {gstinError ? <p className="mt-2 text-xs text-rose-600">{gstinError}</p> : null}
                      </div>
                    )}
                  </div>

                  {hasGstin === "yes" ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                      <p className="block text-sm font-semibold text-slate-700">Have you filed last 2 years ITR return?</p>
                      <div className="mt-2 flex items-center gap-6">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                          <input
                            type="radio"
                            name="itr"
                            className="h-4 w-4 accent-brand-900"
                            checked={form.watch("itrFiledLastTwoYears") === "yes"}
                            onChange={() => {
                              form.setValue("itrFiledLastTwoYears", "yes")
                              setItrError(null)
                            }}
                          />
                          Yes
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                          <input
                            type="radio"
                            name="itr"
                            className="h-4 w-4 accent-brand-900"
                            checked={form.watch("itrFiledLastTwoYears") === "no"}
                            onChange={() => {
                              form.setValue("itrFiledLastTwoYears", "no")
                              setItrError(null)
                            }}
                          />
                          No
                        </label>
                      </div>
                      {itrError ? <p className="mt-1 text-xs text-rose-600">{itrError}</p> : null}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {step === 2 && showOrganizationStep ? (
              <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-brand-900/10 p-3 text-brand-900">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-950">Organization details</p>
                    <p className="text-sm text-slate-500">Address, legal/trade name, and status are locked to your verified GSTIN.</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold text-slate-700">Organization logo (optional)</p>
                    <div className="mt-2 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        aria-label="Change organization logo"
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                      >
                        {logoPreview ? (
                          <NextImage src={logoPreview} alt="" fill unoptimized className="object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-slate-300">
                            <UploadCloud className="h-6 w-6" />
                          </span>
                        )}
                      </button>
                      <div>
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {logoUploading ? "Uploading..." : logoPreview ? "Change logo" : "Add logo"}
                        </button>
                        {logoFile ? <p className="mt-1 text-xs text-slate-400">{logoFile.name}</p> : null}
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={(event) => {
                            pickLogo(event.target.files?.[0] ?? null)
                            event.target.value = ""
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
                    GSTIN
                    <input className={readOnlyInputClassName} value={gstin} readOnly disabled />
                    <p className="mt-1 text-xs text-slate-400">
                      From the previous step. Our team verifies and approves it manually — it isn&apos;t auto-checked.
                    </p>
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Legal Name *
                    <input className={inputClassName} placeholder="As per GSTIN/PAN records" {...form.register("orgName")} />
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.orgName?.message ?? ""}</p>
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Trade Name
                    <input className={inputClassName} placeholder="Optional, if different from legal name" {...form.register("tradeName")} />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
                    About Organization *
                    <textarea className={textareaClassName} placeholder="Tell us about your organization" {...form.register("description")} />
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.description?.message ?? ""}</p>
                  </label>

                  <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
                    Address *
                    <input className={inputClassName} placeholder="Registered address" {...form.register("address")} />
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.address?.message ?? ""}</p>
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Place *
                    <input className={inputClassName} placeholder="City / area" {...form.register("city")} />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    State *
                    <input className={inputClassName} {...form.register("state")} />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Pincode *
                    <input
                      className={inputClassName}
                      inputMode="numeric"
                      maxLength={6}
                      {...form.register("pincode")}
                      onChange={(event) => form.setValue("pincode", event.target.value.replace(/\D/g, "").slice(0, 6), { shouldValidate: true })}
                    />
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.pincode?.message ?? ""}</p>
                  </label>

                  <div className="hidden md:block" />

                  <label className="block text-sm font-semibold text-slate-700">
                    Email (optional)
                    <input className={inputClassName} placeholder="contact@organization.com" {...form.register("contactEmail")} />
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.contactEmail?.message ?? ""}</p>
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Phone number (optional)
                    <input
                      className={inputClassName}
                      placeholder="Organizer contact number"
                      inputMode="numeric"
                      maxLength={10}
                      {...form.register("contactPhone")}
                      onChange={(event) =>
                        form.setValue("contactPhone", event.target.value.replace(/\D/g, "").slice(0, 10), { shouldValidate: true })
                      }
                    />
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.contactPhone?.message ?? ""}</p>
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Secondary phone number (optional)
                    <input
                      className={inputClassName}
                      placeholder="Optional backup number"
                      inputMode="numeric"
                      maxLength={10}
                      {...form.register("secondaryContactPhone")}
                      onChange={(event) =>
                        form.setValue("secondaryContactPhone", event.target.value.replace(/\D/g, "").slice(0, 10), { shouldValidate: true })
                      }
                    />
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.secondaryContactPhone?.message ?? ""}</p>
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Landline (optional)
                    <input className={inputClassName} placeholder="e.g. 040-12345678" {...form.register("landlineNumber")} />
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Website
                    <input className={inputClassName} placeholder="https://your-website.com" {...form.register("websiteUrl")} />
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.websiteUrl?.message ?? ""}</p>
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    Instagram
                    <input className={inputClassName} placeholder="https://instagram.com/your-handle" {...form.register("instagramUrl")} />
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.instagramUrl?.message ?? ""}</p>
                  </label>

                  <label className="block text-sm font-semibold text-slate-700">
                    LinkedIn
                    <input className={inputClassName} placeholder="https://linkedin.com/company/your-page" {...form.register("linkedinUrl")} />
                    <p className="mt-1 text-xs text-rose-600">{form.formState.errors.linkedinUrl?.message ?? ""}</p>
                  </label>
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-start gap-3 mb-5">
                  <div className="rounded-2xl bg-brand-900/10 p-3 text-brand-900">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-950">Bank &amp; Compliance</p>
                    <p className="text-sm text-slate-500">Bank account details for payouts.</p>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2 max-w-3xl">
                  <div className="grid gap-4 content-start">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">Bank Account</p>

                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Beneficiary Name *
                        <input className={inputClassName} placeholder="Name as per bank account" {...form.register("bankAccountName")} />
                        <p className="mt-1 text-xs text-rose-600">{form.formState.errors.bankAccountName?.message ?? ""}</p>
                      </label>

                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Account Type *
                        <select className={inputClassName} {...form.register("bankAccountType")}>
                          <option value="">Select account type</option>
                          {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-rose-600">{form.formState.errors.bankAccountType?.message ?? ""}</p>
                      </label>

                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Bank Name *
                        <select className={inputClassName} {...form.register("bankName")}>
                          <option value="">Select your bank</option>
                          {BANK_NAME_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                        <p className="mt-1 text-xs text-rose-600">{form.formState.errors.bankName?.message ?? ""}</p>
                      </label>

                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Account number *
                        <input className={inputClassName} placeholder="Bank account number" {...form.register("bankAccountNumber")} />
                        <p className="mt-1 text-xs text-rose-600">{form.formState.errors.bankAccountNumber?.message ?? ""}</p>
                      </label>

                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Confirm account number *
                        <input className={inputClassName} placeholder="Re-enter account number" {...form.register("confirmBankAccountNumber")} />
                        <p className="mt-1 text-xs text-rose-600">{form.formState.errors.confirmBankAccountNumber?.message ?? ""}</p>
                      </label>

                      <label className="block text-sm font-semibold text-slate-700">
                        IFSC code *
                        <input
                          className={inputClassName}
                          placeholder="SBIN0000001"
                          style={{ textTransform: "uppercase" }}
                          {...form.register("bankIfsc")}
                          maxLength={11}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase()
                            form.setValue("bankIfsc", value, { shouldValidate: true })
                            // Look up immediately once a complete, valid IFSC is typed/pasted.
                            void lookupIfsc(value)
                          }}
                          onBlur={(e) => void lookupIfsc(e.target.value)}
                        />
                        <p className="mt-1 text-xs text-rose-600">{form.formState.errors.bankIfsc?.message ?? ""}</p>
                        {ifscLoading ? (
                          <p className="mt-1 text-xs text-slate-400">Looking up branch...</p>
                        ) : ifscBranch ? (
                          <p className="mt-1 text-xs text-emerald-700 font-medium">{ifscBranch}</p>
                        ) : null}
                      </label>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <p className="text-xs leading-5 text-slate-500">
                          Keep your bank details ready. These are verified during the approval process to enable payouts.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
            ) : null}
            {notice ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-2">
              <div className="flex items-center">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setStep((current) => {
                        if (!showOrganizationStep && current === 3) return 1
                        return Math.max(current - 1, 0)
                      })
                    }
                    className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Back
                  </button>
                ) : null}
              </div>

              <div className="ml-auto flex items-center">
                {step === 0 ? (
                  <button
                    type="button"
                    onClick={() => void saveStepOne()}
                    disabled={isSavingStepOne}
                    className="rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-60"
                  >
                    {isSavingStepOne ? "Saving..." : "Save & Continue"}
                  </button>
                ) : step === 1 ? (
                  <button
                    type="button"
                    onClick={() => void saveStepTwo()}
                    disabled={isSavingStepTwo}
                    className="rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-60"
                  >
                    {isSavingStepTwo ? "Saving..." : "Save & Continue"}
                  </button>
                ) : step === 2 ? (
                  <button
                    type="button"
                    onClick={() => void saveStepThree()}
                    disabled={isSavingStepThree || logoUploading}
                    className="rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-60"
                  >
                    {isSavingStepThree || logoUploading ? "Saving..." : "Save & Continue"}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={form.formState.isSubmitting || (hasGstin === "no" && !gstDeclarationAccepted)}
                    className="rounded-full bg-brand-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-60"
                  >
                    {form.formState.isSubmitting ? "Submitting..." : "Submit"}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {isCropOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
            <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-white p-5 shadow-[0_30px_70px_rgba(15,23,42,0.3)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Adjust image</p>
                  <h2 className="text-xl font-semibold text-slate-900">Set your profile crop</h2>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 hover:bg-slate-50"
                  onClick={closeCrop}
                >
                  Cancel
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_190px]">
                <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div
                    ref={cropContainerRef}
                    className="relative h-60 w-60 overflow-hidden rounded-full border border-slate-200 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.12)]"
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId)
                      setDragStart({ x: event.clientX, y: event.clientY })
                      setOffsetStart(cropOffset)
                    }}
                    onPointerMove={(event) => {
                      if (!dragStart) return
                      const next = {
                        x: offsetStart.x + (event.clientX - dragStart.x),
                        y: offsetStart.y + (event.clientY - dragStart.y),
                      }
                      setCropOffset(clampOffset(next))
                    }}
                    onPointerUp={() => setDragStart(null)}
                    onPointerLeave={() => setDragStart(null)}
                  >
                    {cropSource ? (
                      <div
                        className="absolute inset-0 bg-cover bg-no-repeat bg-center"
                        style={{
                          backgroundImage: `url(${cropSource})`,
                          backgroundSize: `${getCropMetrics()?.scaledWidth ?? 240}px ${getCropMetrics()?.scaledHeight ?? 240}px`,
                          backgroundPosition: `calc(50% + ${cropOffset.x}px) calc(50% + ${cropOffset.y}px)`,
                        }}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Zoom</p>
                    <input
                      className="mt-3 w-full accent-brand-900"
                      type="range"
                      min={1}
                      max={3}
                      step={0.05}
                      value={cropZoom}
                      onChange={(event) => {
                        const nextZoom = Number(event.target.value)
                        setCropZoom(nextZoom)
                        setCropOffset((previous) => clampOffset(previous, nextZoom))
                      }}
                    />
                    <p className="mt-2 text-xs text-slate-500">Drag to reposition.</p>
                  </div>

                  <button
                    type="button"
                    className="w-full rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
                    onClick={() => void applyCrop()}
                  >
                    Use this image
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showGstModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.3)]">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">GST Undertaking / Declaration</h2>
                  <p className="text-sm text-slate-500">(For Organizers without GSTIN)</p>
                </div>
                <button
                  type="button"
                  onClick={closeGstModal}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto px-6 py-5 text-sm leading-6 text-slate-700">
                <p>
                  I/We, Organizer, do confirm and acknowledge that I am/We are a supplier providing services
                  through an e-commerce platform as per Section 24(ix) of the Central Goods and Services Tax Act,
                  2017 under the prevalent GST regime (&quot;GST Laws&quot;) and confirm that I/We are not registered
                  under the GST Act, since our annual turnover is below the threshold limit of Rs. 20 Lakhs
                  (supplier supplying only services).
                </p>
                <p>
                  I/We confirm that any applicable taxes collected on the Tickets / Bookings / Experiences booked
                  through Baatasari platform i.e. www.baatasari.com and/or its mobile application and/or other sales
                  channels is our liability and the same shall be duly discharged by us.
                </p>
                <p>
                  I/We acknowledge that information furnished above is true to the best of my/our knowledge and that
                  we shall be bound by the acts of duly constituted attorney.
                </p>
                <p>
                  In case any of the above information is found to be incorrect at a later date, my membership with
                  your platform shall stand cancelled and any payment or unprocessed settlement shall be withheld by
                  you on the basis of the statements given herein above.
                </p>
                <p>I/We request you to permit and allow our event(s) to be listed on your platform.</p>
                <p>
                  I/We shall indemnify and hold harmless Baatasari, its owners, directors, officers, representatives,
                  affiliates, successors and assigns, against all costs, penalties, damages, or losses or any other
                  charges, penalties, or liabilities incurred in relation to any claim raised pursuant to the
                  following:
                </p>
                <ul className="list-disc space-y-1 pl-6">
                  <li>Breach, violation or non-compliance of any of the provisions contained in this declaration.</li>
                  <li>Any act of omission or commission pursuant to which any of the representations given become untrue.</li>
                  <li>Violation of any applicable law including GST laws.</li>
                  <li>Non-compliance with GST laws.</li>
                  <li>Any investigations, inquiries, summons or inspections conducted by any authority.</li>
                </ul>
                <p>
                  I/We also undertake the responsibility to inform all subsequent changes in the constitution or
                  working of my/our business entity having membership with your platform, affecting the accuracy of
                  the answers given and will be promptly communicated to you.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={closeGstModal}
                  className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={acceptGstDeclaration}
                  className="rounded-full bg-brand-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
                >
                  Accept
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </ProtectedRoute>
  )
}
