"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/app/providers"
import { uploadUserAvatarImage } from "@/lib/api/uploads"
import { DEFAULT_AVATAR_IMAGE, getAvatarImageUrl } from "@/lib/avatar"
import {
  getDobDateBounds,
  isDobWithinBounds,
  isPredefinedProfession,
  OTHER_PROFESSION_VALUE,
  PROFESSION_OPTIONS,
} from "@/lib/profile-validation"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { StateDistrictLocalityPicker } from "@/components/common/state-district-locality-picker"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextHref = searchParams.get("next") || "/events"
  const { user, profile, completeRoleOnboarding } = useAuth()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [dob, setDob] = useState("")
  const [location, setLocation] = useState("")
  const [locationArea, setLocationArea] = useState("")
  const [locationCity, setLocationCity] = useState("")
  const [locationState, setLocationState] = useState("")
  const [locationPincode, setLocationPincode] = useState("")
  const [locationLat, setLocationLat] = useState<number | null>(null)
  const [locationLng, setLocationLng] = useState<number | null>(null)
  const [gender, setGender] = useState("")
  const [profession, setProfession] = useState("")
  const [otherProfession, setOtherProfession] = useState("")

  const [dobOpen, setDobOpen] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [cropSource, setCropSource] = useState<string | null>(null)
  const [isCropOpen, setIsCropOpen] = useState(false)
  const [cropZoom, setCropZoom] = useState(1)
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [offsetStart, setOffsetStart] = useState({ x: 0, y: 0 })
  const [cropImage, setCropImage] = useState<HTMLImageElement | null>(null)

  const MAX_FILE_SIZE = 5 * 1024 * 1024
  const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const dobBounds = getDobDateBounds()

  const cropContainerRef = useRef<HTMLDivElement>(null)
  const previewUrlRef = useRef<string | null>(null)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)

  // Seed the form from the loaded profile, DURING RENDER rather than in an
  // effect.
  //
  // An effect runs after paint, so the first frame showed empty inputs and the
  // second showed the real values — a visible flicker on every open, and the
  // cascading re-render that react-hooks/set-state-in-effect exists to catch.
  // Adjusting during render lets React discard the in-progress output and
  // re-run before anything reaches the screen.
  //
  // This is React's documented "adjust state when a prop changes", and the same
  // shape already used for the avatar in components/site-shell.tsx.
  //
  // Re-seeds whenever the profile object identity or the account email changes
  // — exactly the old dependency array, so anything typed is overwritten in the
  // same cases it always was, and no others.
  const [seededFrom, setSeededFrom] = useState<{
    profile: typeof profile
    email: string | undefined
  } | null>(null)

  if (seededFrom?.profile !== profile || seededFrom?.email !== user?.email) {
    setSeededFrom({ profile, email: user?.email })
    setEmail(user?.email ?? profile?.email ?? "")
    setName(profile?.full_name ?? "")
    setPhone((profile?.phone ?? "").replace(/^\+91/, ""))
    setDob(profile?.dob ?? "")
    setLocation(profile?.location ?? "")
    setGender(profile?.gender ?? "")
    const profileProfession = (profile?.profession ?? "").trim()
    if (profileProfession && isPredefinedProfession(profileProfession)) {
      setProfession(profileProfession)
      setOtherProfession("")
    } else {
      setProfession(profileProfession ? OTHER_PROFESSION_VALUE : "")
      setOtherProfession(profileProfession)
    }
    setAvatarPreview(profile?.avatar_url ?? DEFAULT_AVATAR_IMAGE)
  }

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
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

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only PNG, JPG, or WEBP images are allowed.")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Image must be 5MB or less.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      if (!result) return

      const img = new Image()
      img.onload = () => {
        setCropImage(img)
        setCropSource(result)
        setCropZoom(1)
        setCropOffset({ x: 0, y: 0 })
        setIsCropOpen(true)
      }
      img.src = result
    }
    reader.readAsDataURL(file)
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
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(
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

    if (!blob || blob.size > MAX_FILE_SIZE) {
      setError("Cropped image is too large. Try zooming out.")
      return
    }

    const croppedFile = new File([blob], "avatar.webp", { type: "image/webp" })

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const previewUrl = URL.createObjectURL(croppedFile)
    previewUrlRef.current = previewUrl

    setAvatarPreview(previewUrl)
    setAvatarFile(croppedFile)
    setIsCropOpen(false)
  }

  const closeCrop = () => {
    setIsCropOpen(false)
    setCropSource(null)
    setCropImage(null)
  }

  const handleComplete = async () => {
    if (user?.role === "ORGANIZER" && user.onboardingStatus !== "COMPLETED") {
      router.replace("/organizer/onboarding")
      return
    }

    setLoading(true)
    setError(null)

    const resolvedProfession = profession === OTHER_PROFESSION_VALUE ? otherProfession.trim() : profession.trim()

    if (!name.trim() || !phone.trim() || !dob.trim() || !location.trim() || !gender.trim() || !resolvedProfession) {
      setError("Please fill in all required fields. Marked with *")
      setLoading(false)
      return
    }

    if (!/^\d{10}$/.test(phone)) {
      setError("Phone number must be exactly 10 digits.")
      setLoading(false)
      return
    }

    if (!isDobWithinBounds(dob.trim(), dobBounds)) {
      setError(`You must be at least ${dobBounds.minAge} years old to use Baatasari.`)
      setLoading(false)
      return
    }

    try {
      if (avatarFile) {
        if (!user?.id) {
          throw new Error("Authentication required.")
        }

        const upload = await uploadUserAvatarImage(avatarFile)
        setAvatarPreview(getAvatarImageUrl("users", user.id, upload.version))
        setAvatarFile(null)
      }

      await completeRoleOnboarding("USER", {
        fullName: name.trim(),
        phone: `+91${phone.trim()}`,
        dob: dob.trim(),
        location: location.trim(),
        locationArea: locationArea.trim(),
        locationCity: locationCity.trim(),
        locationState: locationState.trim(),
        locationPincode: locationPincode.trim(),
        locationLat,
        locationLng,
        gender: gender.trim(),
        profession: resolvedProfession,
      })

      router.replace(nextHref)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save profile. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute requireOnboarding={false}>
      <div className="relative w-full px-4 py-6 sm:px-6 md:py-8 lg:px-8">
        <div className="w-full">
          <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-900">One-time setup</p>
              <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">Personal details</h2>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[40%_60%] md:px-1">
              <div className="flex h-full flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200/80 bg-linear-to-br from-white via-white to-slate-50/80 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  aria-label="Upload profile image"
                  className="group relative h-52 w-52 overflow-hidden rounded-full border border-slate-200 bg-slate-50 shadow-[0_12px_22px_rgba(15,23,42,0.08)] transition hover:ring-4 hover:ring-brand-900/15"
                >
                  <img
                    src={avatarPreview || DEFAULT_AVATAR_IMAGE}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.onerror = null
                      event.currentTarget.src = DEFAULT_AVATAR_IMAGE
                    }}
                  />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 flex h-14 items-center justify-center bg-linear-to-t from-black/65 to-transparent pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                    Upload photo
                  </span>
                </button>

                <input
                  ref={avatarFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => {
                    handleAvatarChange(event.target.files?.[0] ?? null)
                    event.target.value = ""
                  }}
                  className="hidden"
                />

                <p className="text-center text-xs text-slate-400">PNG, JPG, GIF, or WEBP up to 5MB</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2 md:pr-1">
                <label className="block text-sm font-semibold text-slate-700">
                  Full name *
                  <input
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
                    placeholder="Your name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Email
                  <input
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-gray-200 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
                    type="email"
                    value={email}
                    readOnly
                    disabled
                  />
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Phone number *
                  <div className="mt-2 flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-brand-900 focus-within:ring-4 focus-within:ring-brand-900/10">
                    <span className="text-sm font-semibold text-slate-500">+91</span>
                    <input
                      className="ml-2 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="10 digit number"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                    />
                  </div>
                </label>

                <div className="block text-sm font-semibold text-slate-700">
                  Date of birth *
                  <Popover open={dobOpen} onOpenChange={setDobOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10 flex items-center justify-between"
                      >
                        <span className={dob ? "text-slate-900" : "text-slate-400"}>
                          {dob ? format(new Date(dob + "T00:00:00"), "dd/MM/yyyy") : "Select date of birth"}
                        </span>
                        <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dob ? new Date(dob + "T00:00:00") : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setDob(format(date, "yyyy-MM-dd"))
                            setDobOpen(false)
                          }
                        }}
                        captionLayout="dropdown"
                        startMonth={new Date(new Date().getFullYear() - 100, 0)}
                        endMonth={new Date(new Date().getFullYear() - dobBounds.minAge, 11)}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="mt-1.5 text-[11px] font-normal text-slate-500">
                    You must be at least {dobBounds.minAge}+ to use Baatasari.
                  </p>
                </div>

                <div className="block text-sm font-semibold text-slate-700 md:col-span-2">
                  Location *
                  <div className="mt-2">
                    <StateDistrictLocalityPicker
                      initialState={locationState}
                      initialDistrict={locationCity}
                      initialLocalityLabel={location}
                      onSelect={(loc) => {
                        setLocation(loc.label)
                        setLocationArea(loc.area)
                        setLocationCity(loc.city ?? "")
                        setLocationState(loc.state ?? "")
                        setLocationPincode(loc.pincode ?? "")
                        setLocationLat(loc.lat)
                        setLocationLng(loc.lng)
                      }}
                    />
                  </div>
                </div>

                <label className="block text-sm font-semibold text-slate-700">
                  Gender *
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
                    value={gender}
                    onChange={(event) => setGender(event.target.value)}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </label>

                <label className="block text-sm font-semibold text-slate-700">
                  Profession *
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
                    value={profession}
                    onChange={(event) => setProfession(event.target.value)}
                  >
                    <option value="">Select</option>
                    {PROFESSION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                {profession === OTHER_PROFESSION_VALUE ? (
                  <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
                    Other profession *
                    <input
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
                      placeholder="Enter your profession"
                      value={otherProfession}
                      onChange={(event) => setOtherProfession(event.target.value)}
                    />
                  </label>
                ) : null}
              </div>
            </div>

            {error ? (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">{error}</p>
            ) : null}

            <div className="mt-6 flex justify-end">
              <button
                className="rounded-full bg-brand-900 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 disabled:opacity-60"
                onClick={handleComplete}
                disabled={loading}
              >
                {loading ? "Saving..." : "Submit & Continue"}
              </button>
            </div>
          </div>
        </div>

        {isCropOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4">
            <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-white p-5 shadow-[0_30px_70px_rgba(15,23,42,0.3)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Adjust image</p>
                  <h3 className="text-xl font-semibold text-slate-900">Set your profile crop</h3>
                </div>
                <button
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
                        setCropOffset((prev) => clampOffset(prev, nextZoom))
                      }}
                    />
                    <p className="mt-2 text-xs text-slate-500">Drag to reposition.</p>
                  </div>

                  <button
                    className="w-full rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
                    onClick={applyCrop}
                  >
                    Use this image
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </ProtectedRoute>
  )
}
