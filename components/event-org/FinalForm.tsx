"use client"

import React, { useState } from "react"
import {
  CalendarDays,
  Globe,
  Heart,
  Link as LinkIcon,
  Mail,
  MapPin,
  Phone,
  Rocket,
  Ticket,
  User,
} from "lucide-react"
import { format } from "date-fns"
import type { EventFormData } from "./validateEventform"
import SectionCard, { FieldError, FieldLabel, fieldInputClass } from "./SectionCard"

export type PublishMode = "publish" | "draft"

interface FinalFormProps {
  formData: EventFormData
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  formErrors: { [key: string]: string }
  // Publishing preferences (create flow only)
  publishMode?: PublishMode
  onPublishModeChange?: (mode: PublishMode) => void
  showPublishingPreferences?: boolean
  // Cover preview from the step-1 upload/cropper, for the live summary.
  coverPreview?: string | null
}

const THANK_YOU_MAX_LENGTH = 500

const iconInputWrap = "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"

const FinalForm: React.FC<FinalFormProps> = ({
  formData,
  setFormData,
  formErrors,
  publishMode = "publish",
  onPublishModeChange,
  showPublishingPreferences = false,
  coverPreview = null,
}) => {
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    contactInfo: true,
    postEvent: true,
    publishing: true,
    summary: true,
  })

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const summaryDate = (() => {
    if (!formData.date) return null
    const parsed = new Date(formData.date)
    if (Number.isNaN(parsed.getTime())) return null
    return format(parsed, "dd MMM yyyy")
  })()

  const ticketCategoryCount = (formData.audienceCategory ?? []).length
  const ageMin = formData.audienceRange?.min ?? 18
  const ageMax = formData.audienceRange?.max ?? 60

  const summaryRows: { icon: React.ReactNode; label: string; value: string }[] = [
    {
      icon: <CalendarDays className="h-4 w-4" />,
      label: "Date & Time",
      value: summaryDate ? `${summaryDate}${formData.time ? ` · ${formData.time}` : ""}` : "Not set yet",
    },
    {
      icon: <MapPin className="h-4 w-4" />,
      label: "Venue",
      value: formData.venue?.trim() || "Not set yet",
    },
    {
      icon: <Ticket className="h-4 w-4" />,
      label: "Tickets",
      value: `${ticketCategoryCount} Ticket ${ticketCategoryCount === 1 ? "Category" : "Categories"}`,
    },
    {
      icon: <User className="h-4 w-4" />,
      label: "Audience",
      value: `${ageMin} – ${ageMax} Years`,
    },
  ]

  return (
    <div className="flex w-full flex-col gap-5">
      {/* ============ Contact Information ============ */}
      <SectionCard
        icon={<User className="h-4.5 w-4.5" />}
        title="Contact Information"
        open={!!openSections.contactInfo}
        onToggle={() => toggleSection("contactInfo")}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative">
            <FieldLabel required>Mobile Number</FieldLabel>
            <div className="relative">
              <Phone className={iconInputWrap} />
              <input
                type="tel"
                value={formData.contactInfo.mobile || "+91 "}
                onChange={(e) => {
                  const value = e.target.value
                  let inputWithoutPrefix = value.startsWith("+91 ") ? value.slice(4) : value
                  if (!value.startsWith("+91 ")) {
                    inputWithoutPrefix = value.replace(/^\+91\s?/, "").replace(/[^0-9]/g, "")
                  }
                  if (/^\d*$/.test(inputWithoutPrefix) && inputWithoutPrefix.length <= 10) {
                    setFormData((prev) => ({
                      ...prev,
                      contactInfo: { ...prev.contactInfo, mobile: `+91 ${inputWithoutPrefix}` },
                    }))
                  }
                }}
                name="contactInfo.mobile"
                className={`${fieldInputClass(!!formErrors["contactInfo.mobile"])} pl-11`}
                placeholder="Enter mobile number"
              />
            </div>
            <FieldError message={formErrors["contactInfo.mobile"]} />
          </div>

          <div className="relative">
            <FieldLabel required>Email Address</FieldLabel>
            <div className="relative">
              <Mail className={iconInputWrap} />
              <input
                type="email"
                value={formData.contactInfo.email}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, email: e.target.value },
                  }))
                }
                name="contactInfo.email"
                className={`${fieldInputClass(!!formErrors["contactInfo.email"])} pl-11`}
                placeholder="example@email.com"
              />
            </div>
            <FieldError message={formErrors["contactInfo.email"]} />
          </div>

          <div className="relative">
            <FieldLabel>Website (Optional)</FieldLabel>
            <div className="relative">
              <Globe className={iconInputWrap} />
              <input
                type="url"
                value={formData.contactInfo.website}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, website: e.target.value },
                  }))
                }
                className={`${fieldInputClass(!!formErrors["contactInfo.website"])} pl-11`}
                placeholder="https://www.example.com"
              />
            </div>
            <FieldError message={formErrors["contactInfo.website"]} />
          </div>

          <div className="relative">
            <FieldLabel>Social Media Links (Optional)</FieldLabel>
            <div className="relative">
              <LinkIcon className={iconInputWrap} />
              <input
                type="text"
                value={formData.contactInfo.additionalLinks}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, additionalLinks: e.target.value },
                  }))
                }
                className={`${fieldInputClass(false)} pl-11`}
                placeholder="Social media, portfolio, etc."
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ============ Thank You Message ============ */}
      <SectionCard
        icon={<Heart className="h-4.5 w-4.5" />}
        title="Thank You Message"
        required
        open={!!openSections.postEvent}
        onToggle={() => toggleSection("postEvent")}
      >
        <div className="relative">
          <div className="relative">
            <textarea
              className={`${fieldInputClass(!!formErrors["postEventFollowUp.thankYouNote"])} min-h-30 resize-y pb-7`}
              name="postEventFollowUp.thankYouNote"
              value={formData.postEventFollowUp?.thankYouNote || ""}
              maxLength={THANK_YOU_MAX_LENGTH}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  postEventFollowUp: { ...prev.postEventFollowUp, thankYouNote: e.target.value },
                }))
              }
              placeholder="Write the message attendees should receive after the event..."
            />
            <span className="pointer-events-none absolute bottom-3 right-3 text-[10px] text-slate-400">
              {(formData.postEventFollowUp?.thankYouNote || "").length}/{THANK_YOU_MAX_LENGTH}
            </span>
          </div>
          <FieldError message={formErrors["postEventFollowUp.thankYouNote"]} />
        </div>
      </SectionCard>

      {/* ============ Publishing Preferences (create flow only) ============ */}
      {showPublishingPreferences ? (
        <SectionCard
          icon={<Rocket className="h-4.5 w-4.5" />}
          title="Publishing Preferences"
          open={!!openSections.publishing}
          onToggle={() => toggleSection("publishing")}
        >
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Publishing preference">
            <button
              type="button"
              role="radio"
              aria-checked={publishMode === "publish"}
              onClick={() => onPublishModeChange?.("publish")}
              className={`rounded-xl border p-4 text-left transition ${
                publishMode === "publish"
                  ? "border-(--gold) bg-(--gold-soft-bg)"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <p className={`m-0 text-sm font-bold ${publishMode === "publish" ? "text-(--gold-text)" : "text-slate-900"}`}>
                Publish immediately
              </p>
              <p className="m-0 mt-1 text-[11px] text-slate-500">Make your event live now</p>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={publishMode === "draft"}
              onClick={() => onPublishModeChange?.("draft")}
              className={`rounded-xl border p-4 text-left transition ${
                publishMode === "draft"
                  ? "border-(--gold) bg-(--gold-soft-bg)"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <p className={`m-0 text-sm font-bold ${publishMode === "draft" ? "text-(--gold-text)" : "text-slate-900"}`}>
                Save as Draft
              </p>
              <p className="m-0 mt-1 text-[11px] text-slate-500">Save and continue later</p>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={false}
              disabled
              className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 p-4 text-left opacity-60"
            >
              <p className="m-0 text-sm font-bold text-slate-500">Schedule Publishing</p>
              <p className="m-0 mt-1 text-[11px] text-slate-400">Choose date &amp; time</p>
              <p className="m-0 mt-1 text-[10px] font-semibold uppercase tracking-wide text-(--gold-text)">Coming soon</p>
            </button>
          </div>
        </SectionCard>
      ) : null}

      {/* ============ Event Summary ============ */}
      <SectionCard
        icon={<CalendarDays className="h-4.5 w-4.5" />}
        title="Event Summary"
        open={!!openSections.summary}
        onToggle={() => toggleSection("summary")}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {coverPreview ? (
            <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl border border-(--gold-bar-border)">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverPreview}
                alt="Event cover"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <p className="m-0 text-base font-bold text-slate-900">
              {formData.eventName?.trim() || "Untitled event"}
            </p>
            {formData.category ? (
              <p className="m-0 mt-0.5 text-xs text-slate-500">{formData.category}</p>
            ) : null}

            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {summaryRows.map((row) => (
                <div key={row.label} className="flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0 text-(--gold-icon)">{row.icon}</span>
                  <div className="min-w-0">
                    <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{row.label}</p>
                    <p className="m-0 truncate text-sm text-slate-800">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

export default FinalForm
