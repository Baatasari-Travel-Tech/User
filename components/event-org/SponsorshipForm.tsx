"use client"

import React, { useState } from "react"
import {
  Award,
  Crown,
  Handshake,
  MapPin,
  Megaphone,
  PackageOpen,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react"
import type { EventFormData } from "./validateEventform"
import SectionCard, { fieldInputClass } from "./SectionCard"

interface SponsorshipFormProps {
  formData: EventFormData
  setFormData: React.Dispatch<React.SetStateAction<EventFormData>>
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  openSections: { [key: string]: boolean }
  toggleSection: (section: string) => void
  formErrors: { [key: string]: string }
}

type SponsorItem = { name: string; website: string }
type SponsorsState = {
  titleSponsors: SponsorItem[]
  coPartners: SponsorItem[]
  venuePartners: SponsorItem[]
  mediaPartners: SponsorItem[]
  [key: string]: SponsorItem[]
}

type GroupKey = "titleSponsors" | "coPartners" | "venuePartners" | "mediaPartners"

const GROUPS: {
  key: GroupKey
  title: string
  description: string
  emptyNoun: string
  icon: React.ElementType
  iconCls: string
}[] = [
  {
    key: "titleSponsors",
    title: "Title Sponsors",
    description: "Add your main sponsors who are presenting your event.",
    emptyNoun: "title sponsors",
    icon: Crown,
    iconCls: "bg-amber-100 text-amber-600",
  },
  {
    key: "coPartners",
    title: "Co-Partners",
    description: "Add co-partners who are collaborating with your event.",
    emptyNoun: "co-partners",
    icon: Users,
    iconCls: "bg-emerald-100 text-emerald-600",
  },
  {
    key: "venuePartners",
    title: "Venue Partners",
    description: "Add venue partners hosting or providing the space.",
    emptyNoun: "venue partners",
    icon: MapPin,
    iconCls: "bg-sky-100 text-sky-600",
  },
  {
    key: "mediaPartners",
    title: "Media Partners",
    description: "Add media partners who are promoting your event.",
    emptyNoun: "media partners",
    icon: Megaphone,
    iconCls: "bg-violet-100 text-violet-600",
  },
]

const SponsorshipForm: React.FC<SponsorshipFormProps> = ({
  formData,
  setFormData,
  openSections,
  toggleSection,
}) => {
  const [introDismissed, setIntroDismissed] = useState(false)

  const sponsors = (formData.sponsors as SponsorsState) || {
    titleSponsors: [],
    coPartners: [],
    venuePartners: [],
    mediaPartners: [],
  }

  const handleAddSponsor = (typeId: GroupKey) => {
    setFormData((prev) => {
      const currentSponsors = (prev.sponsors as SponsorsState) || {
        titleSponsors: [],
        coPartners: [],
        venuePartners: [],
        mediaPartners: [],
      }
      return {
        ...prev,
        sponsors: {
          ...currentSponsors,
          [typeId]: [...(currentSponsors[typeId] || []), { name: "", website: "" }],
        },
      }
    })
  }

  const handleRemoveSponsor = (typeId: GroupKey, index: number) => {
    setFormData((prev) => {
      const currentSponsors = prev.sponsors as SponsorsState
      return {
        ...prev,
        sponsors: {
          ...currentSponsors,
          [typeId]: (currentSponsors[typeId] || []).filter((_, i) => i !== index),
        },
      }
    })
  }

  const handleSponsorChange = (typeId: GroupKey, index: number, field: string, value: string) => {
    setFormData((prev) => {
      const currentSponsors = prev.sponsors as SponsorsState
      const updatedList = [...(currentSponsors[typeId] || [])]
      if (updatedList[index]) updatedList[index] = { ...updatedList[index], [field]: value }
      return {
        ...prev,
        sponsors: {
          ...currentSponsors,
          [typeId]: updatedList,
        },
      }
    })
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Intro banner — dismissible */}
      {!introDismissed ? (
        <div className="flex items-start gap-3 rounded-2xl border border-(--gold-soft-border) bg-(--gold-bar-bg) p-4 sm:p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--gold-soft-bg) text-(--gold-icon)">
            <Handshake className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">Partnerships make a bigger impact</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
              Add sponsors and partners to increase your reach, build credibility and unlock more
              visibility for your event.
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setIntroDismissed(true)}
            className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-white hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <SectionCard
        icon={<Handshake className="h-4.5 w-4.5" />}
        title="Sponsorship (Optional)"
        open={!!openSections.sponsorship}
        onToggle={() => toggleSection("sponsorship")}
      >
        <p className="-mt-1 mb-4 text-xs text-slate-500">
          Add sponsors and partners who are supporting your event.
        </p>

        <div className="flex flex-col gap-6">
          {GROUPS.map(({ key, title, description, emptyNoun, icon: Icon, iconCls }) => {
            const rows = sponsors[key] ?? []
            return (
              <div key={key}>
                {/* Group header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconCls}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{title}</p>
                      <p className="mt-0.5 max-w-52 text-xs leading-snug text-slate-500 sm:max-w-none">
                        {description}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddSponsor(key)}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-(--gold-text) transition hover:text-(--gold)"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>

                {/* Rows or empty state */}
                {rows.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-3">
                    {rows.map((sponsor, index) => (
                      <div key={index} className="flex flex-wrap items-center gap-3">
                        <input
                          type="text"
                          placeholder="Sponsor name"
                          value={sponsor.name}
                          onChange={(e) => handleSponsorChange(key, index, "name", e.target.value)}
                          className={`${fieldInputClass(false)} min-w-40 flex-1`}
                        />
                        <input
                          type="text"
                          placeholder="Website (optional)"
                          value={sponsor.website}
                          onChange={(e) => handleSponsorChange(key, index, "website", e.target.value)}
                          className={`${fieldInputClass(false)} min-w-40 flex-1`}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSponsor(key, index)}
                          aria-label={`Remove ${title.replace(/s$/, "").toLowerCase()}`}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-rose-500 transition hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col items-center gap-1 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
                    <PackageOpen className="h-5 w-5 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-500">No {emptyNoun} added yet</p>
                    <p className="text-xs text-slate-400">
                      Click &ldquo;Add&rdquo; to include {emptyNoun}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* Why add sponsors — info banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:p-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Award className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-emerald-800">Why add sponsors?</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
            Sponsors help you increase event visibility, credibility and can support with prizes,
            promotions and more.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SponsorshipForm
