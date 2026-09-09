"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { FormProvider, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/app/providers"
import { uploadUserAvatarImage } from "@/lib/api/uploads"
import { DEFAULT_AVATAR_IMAGE, getAvatarImageUrl } from "@/lib/avatar"
import { AvatarCropDialog, useAvatarCrop } from "./_components/avatar-crop-dialog"
import { profileSchema, type ProfileFormValues } from "./_components/profile-schema"
import { ProfileSidebar, type AccountSection } from "./_components/profile-sidebar"
import { HelpSection } from "./_components/sections/help-section"
import { IdentitySection } from "./_components/sections/identity-section"
import { PreferencesSection } from "./_components/sections/preferences-section"
import { SecuritySection } from "./_components/sections/security-section"

const EMPTY_VALUES: ProfileFormValues = {
  name: "",
  phone: "",
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
}

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth()
  const [activeSection, setActiveSection] = useState<AccountSection>("profile")
  const [mobileView, setMobileView] = useState<"menu" | "section">("menu")

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const previewUrlRef = useRef<string | null>(null)
  const avatarFileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    defaultValues: EMPTY_VALUES,
  })

  // Show the saved avatar whenever a new profile object arrives. Adjusted
  // during render (not in the effect below) so the first paint already has the
  // right image; the effect stays for form.reset(), which is a call into an
  // external library rather than a state update.
  const [syncedProfile, setSyncedProfile] = useState(profile)
  if (profile && profile !== syncedProfile) {
    setSyncedProfile(profile)
    setAvatarPreview(profile.avatar_url ?? DEFAULT_AVATAR_IMAGE)
  }

  // Hydrate the form from the loaded profile. Using reset() rather than
  // setValue per-field so the form's "dirty" state matches reality after
  // a refresh — typing a value back to its saved state should not register
  // as dirty, and reset() establishes the new clean baseline.
  useEffect(() => {
    if (!profile) return
    form.reset({
      name: profile.full_name ?? "",
      phone: (profile.phone ?? "").replace(/^\+91/, ""),
      dob: profile.dob ?? "",
      location: profile.location ?? "",
      locationArea: profile.locationArea ?? "",
      locationCity: profile.locationCity ?? "",
      locationState: profile.locationState ?? "",
      locationPincode: profile.locationPincode ?? "",
      locationLat: profile.locationLat ?? null,
      locationLng: profile.locationLng ?? null,
      gender: profile.gender ?? "",
      profession: profile.profession ?? "",
    })
  }, [profile, form])

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  const crop = useAvatarCrop({
    onError: setAvatarError,
    onCropped: async (croppedFile) => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      const previewUrl = URL.createObjectURL(croppedFile)
      previewUrlRef.current = previewUrl
      setAvatarPreview(previewUrl)

      setAvatarError(null)
      setAvatarUploading(true)
      try {
        const upload = await uploadUserAvatarImage(croppedFile)
        const fallback = user?.id ? getAvatarImageUrl("users", user.id, upload.version) : null
        const nextUrl = upload.publicUrl ?? fallback
        if (nextUrl) setAvatarPreview(nextUrl)
        try {
          await refreshProfile()
        } catch {
          // non-fatal — local preview still updates immediately
        }
      } catch (uploadError) {
        setAvatarError(uploadError instanceof Error ? uploadError.message : "Could not upload photo.")
      } finally {
        setAvatarUploading(false)
      }
    },
  })

  const goToSection = (id: AccountSection) => {
    setActiveSection(id)
    setMobileView("section")
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const sectionContent = (
    <>
      {activeSection === "profile" ? <IdentitySection /> : null}
      {activeSection === "preferences" ? <PreferencesSection /> : null}
      {activeSection === "security" ? <SecuritySection /> : null}
      {activeSection === "help" ? <HelpSection /> : null}
    </>
  )

  return (
    <ProtectedRoute>
      <FormProvider {...form}>
        <div className="relative min-h-screen bg-slate-50">
          {/* Subtle ambient backdrop */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-32 -left-20 h-[28rem] w-[28rem] rounded-full bg-(--blue-100)/40 blur-3xl" />
            <div className="absolute -top-16 right-0 h-[24rem] w-[24rem] rounded-full bg-(--blue-50) blur-3xl" />
          </div>

          <div className="mx-auto w-full max-w-[1400px] px-4 pt-8 pb-16 md:px-8 md:pt-12 lg:px-10">
            {avatarError ? (
              <div className="mx-auto mb-4 max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">
                {avatarError}
              </div>
            ) : null}

            <div className="mx-auto grid w-full grid-cols-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)] xl:gap-8">
              <ProfileSidebar
                avatarPreview={avatarPreview}
                avatarUploading={avatarUploading}
                onAvatarClick={() => avatarFileInputRef.current?.click()}
                onAvatarFileChange={crop.handleAvatarChange}
                avatarFileInputRef={avatarFileInputRef}
                activeSection={activeSection}
                mobileView={mobileView}
                onSectionChange={goToSection}
                onMobileBackToMenu={() => setMobileView("menu")}
                mobileSectionContent={sectionContent}
              />

              {/* RIGHT — section content (desktop only; mobile renders it inside the sidebar's Account container) */}
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="hidden space-y-5 lg:block"
              >
                {sectionContent}
              </motion.div>
            </div>
          </div>

          <AvatarCropDialog crop={crop} />
        </div>
      </FormProvider>
    </ProtectedRoute>
  )
}
