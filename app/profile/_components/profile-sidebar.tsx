"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useFormContext, useWatch } from "react-hook-form"
import {
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Heart,
  HelpCircle,
  LogOut,
  MapPin,
  Shield,
  User as UserIcon,
} from "lucide-react"
import { useAuth } from "@/app/providers"
import { DEFAULT_AVATAR_IMAGE } from "@/lib/avatar"
import type { ProfileFormValues } from "./profile-schema"

export type AccountSection = "profile" | "preferences" | "security" | "help"

const SECTION_NAV: { id: AccountSection; label: string; icon: typeof UserIcon }[] = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "preferences", label: "Preferences", icon: Heart },
  { id: "security", label: "Security", icon: Shield },
  { id: "help", label: "Help & support", icon: HelpCircle },
]

export { SECTION_NAV }

export function ProfileSidebar({
  avatarPreview,
  avatarUploading,
  onAvatarClick,
  onAvatarFileChange,
  avatarFileInputRef,
  activeSection,
  mobileView,
  onSectionChange,
  onMobileBackToMenu,
  mobileSectionContent,
}: {
  avatarPreview: string | null
  avatarUploading: boolean
  onAvatarClick: () => void
  onAvatarFileChange: (file: File | null) => void
  avatarFileInputRef: React.RefObject<HTMLInputElement | null>
  activeSection: AccountSection
  mobileView: "menu" | "section"
  onSectionChange: (id: AccountSection) => void
  onMobileBackToMenu: () => void
  mobileSectionContent: React.ReactNode
}) {
  const { user, profile, session, logout } = useAuth()
  const { control } = useFormContext<ProfileFormValues>()
  const formValues = useWatch({ control }) as Partial<ProfileFormValues>
  // Real-time preview: as the user types in IdentitySection, the identity
  // strip updates with the in-progress values. The chip strip shows the
  // CURRENT form values rather than just the saved profile.
  const name = formValues.name ?? ""
  const profession = formValues.profession ?? ""
  const location = formValues.location ?? ""
  const email = session?.user?.email ?? profile?.email ?? ""

  const menuListContent = (
    <>
      <ul className="grid gap-0.5 p-2">
        {SECTION_NAV.map((item) => {
          const active = activeSection === item.id
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${
                  active ? "lg:bg-(--brand-navy) lg:text-white lg:shadow-sm lg:hover:bg-(--brand-navy)" : ""
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 ${
                    active ? "lg:bg-white/15 lg:text-white" : ""
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1">{item.label}</span>
                <ChevronRight
                  className={`h-3.5 w-3.5 text-slate-300 transition group-hover:text-slate-500 ${
                    active ? "lg:text-white/70 lg:group-hover:text-white/70" : ""
                  }`}
                />
              </button>
            </li>
          )
        })}
      </ul>
      <div className="border-t border-slate-100 p-2">
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50">
            <LogOut className="h-3.5 w-3.5" />
          </span>
          Log out
        </button>
      </div>
    </>
  )

  return (
    <motion.aside
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4 lg:sticky lg:top-6 lg:self-start"
    >
      {/* Compact identity strip */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_-25px_rgba(12,29,55,0.2)]">
        <div className="relative h-14 bg-linear-to-r from-(--brand-navy) via-(--brand-blue) to-sky-700">
          <motion.div
            animate={{ x: ["-30%", "130%"] }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/20 to-transparent"
          />
        </div>
        <div className="-mt-8 flex items-center gap-3 px-4 pb-4">
          <button
            type="button"
            onClick={onAvatarClick}
            aria-label="Change profile photo"
            disabled={avatarUploading}
            className="group relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-md transition hover:ring-2 hover:ring-(--brand-blue)/40 disabled:cursor-wait"
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
            <span className="pointer-events-none absolute inset-x-0 bottom-0 flex h-6 items-center justify-center bg-linear-to-t from-black/70 to-transparent pb-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              {avatarUploading ? "Uploading…" : "Edit"}
            </span>
          </button>
          <div className="min-w-0 flex-1 pt-7">
            <h2 className="truncate font-bricolage text-base font-bold text-slate-900">
              {name || profile?.full_name || "Add your name"}
            </h2>
            <p className="truncate text-xs text-slate-500">{email || "—"}</p>
          </div>
        </div>

        {/* Hidden file input — triggered by clicking the avatar */}
        <input
          ref={avatarFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            onAvatarFileChange(event.target.files?.[0] ?? null)
            event.target.value = ""
          }}
          className="hidden"
        />

        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
          {profession ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-900/8 px-2 py-0.5 text-[10px] font-semibold text-brand-900">
              <Briefcase className="h-3 w-3" />
              {profession}
            </span>
          ) : null}
          {location ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              <MapPin className="h-3 w-3" />
              {location}
            </span>
          ) : null}
          {user?.emailVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
              <CheckCircle2 className="h-3 w-3" />
              Verified
            </span>
          ) : null}
        </div>
      </div>

      {/* Primary navigation — Account container; on mobile its body swaps between menu and section content. */}
      <nav className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_-25px_rgba(12,29,55,0.2)]">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            {mobileView === "section" ? SECTION_NAV.find((s) => s.id === activeSection)?.label : "Account"}
          </p>
          {mobileView === "section" ? (
            <button
              type="button"
              onClick={onMobileBackToMenu}
              className="inline-flex items-center gap-1 rounded-full border border-transparent bg-(--brand-navy) px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-(--brand-navy)/90 lg:hidden"
            >
              <ChevronRight className="h-3 w-3 rotate-180" />
              Back
            </button>
          ) : null}
        </div>

        {/* Desktop: menu list + logout always visible */}
        <div className="hidden lg:block">{menuListContent}</div>

        {/* Mobile: animated swap between menu and section content */}
        <div className="lg:hidden">
          <AnimatePresence mode="wait" initial={false}>
            {mobileView === "menu" ? (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
              >
                {menuListContent}
              </motion.div>
            ) : (
              <motion.div
                key="section"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                className="space-y-5 border-t border-slate-100 p-4"
              >
                {mobileSectionContent}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    </motion.aside>
  )
}
