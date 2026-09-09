"use client"

import React, { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import EventPage from "@/components/event-org/EventPage"
import { ProtectedRoute } from "@/components/auth/protected-route"
import type { EventFormData } from "@/components/event-org/data/create-event-data"
import { UNLIMITED_TICKET_CAPACITY } from "@/components/event-org/data/create-event-data"
import { toEventFormDraft } from "@/components/event-org/manage-events/manage-events"
import { uploadEventCoverImage } from "@/lib/api/uploads"
import { getEventCoverImageUrl } from "@/lib/event-cover"
import { apiRequest } from "@/lib/api/client"
import { useAuth } from "@/app/providers"
import type { EventDetail } from "@/types/api"

type TicketTierPayload = {
  name: string
  description: string
  quantity: number
  price: number
}

type EventContactInfoPrefill = Partial<EventFormData["contactInfo"]>

const toNumber = (value: string | number | undefined | null, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const normalizeOptionalUrl = (value: string | undefined | null) => {
  const trimmed = value?.trim()
  if (!trimmed) return null

  try {
    return new URL(trimmed).toString()
  } catch {
    try {
      return new URL(`https://${trimmed}`).toString()
    } catch {
      return null
    }
  }
}

const parseTime = (value: string | undefined) => {
  if (!value) return { hours: 0, minutes: 0 }

  const twelveHourMatch = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (twelveHourMatch) {
    const rawHours = Number(twelveHourMatch[1] ?? 0)
    const minutes = Number(twelveHourMatch[2] ?? 0)
    const period = (twelveHourMatch[3] ?? "AM").toUpperCase()
    const normalizedHours = rawHours % 12
    return {
      hours: period === "PM" ? normalizedHours + 12 : normalizedHours,
      minutes,
    }
  }

  const twentyFourHourMatch = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (twentyFourHourMatch) {
    return {
      hours: Number(twentyFourHourMatch[1] ?? 0),
      minutes: Number(twentyFourHourMatch[2] ?? 0),
    }
  }

  return { hours: 0, minutes: 0 }
}

const combineDateAndTime = (dateText: string, timeText?: string) => {
  const date = new Date(dateText)
  if (Number.isNaN(date.getTime())) {
    throw new Error("Event date is invalid. Please choose a valid date.")
  }

  const { hours, minutes } = parseTime(timeText)
  date.setHours(hours, minutes, 0, 0)
  return date.toISOString()
}

const buildTicketTiers = (formData: EventFormData): TicketTierPayload[] => {
  const fromAudienceCategory = (formData.audienceCategory ?? [])
    .filter((item) => item.category?.trim())
    .map((item) => ({
      name: item.category.trim(),
      description: item.description?.trim() || "General access",
      quantity: item.isLimited !== false
        ? Math.max(1, toNumber(item.numberOfTickets, 1))
        : UNLIMITED_TICKET_CAPACITY,
      price: item.isFree ? 0 : Math.max(0, toNumber(item.price, 0)),
    }))

  if (fromAudienceCategory.length > 0) return fromAudienceCategory

  const fallbackQuantity = Math.max(1, toNumber(formData.ticketQuantity, 1))
  const fallbackPrice =
    formData.ticketType === "free" ? 0 : Math.max(0, toNumber(formData.ticketPrice, 0))

  return [
    {
      name: formData.ticketName?.trim() || "General Admission",
      description: formData.description?.trim() || "General access",
      quantity: fallbackQuantity,
      price: fallbackPrice,
    },
  ]
}

const sanitizeSponsorList = (value: unknown) => {
  const entries = Array.isArray(value) ? value : []
  return entries
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null
      const record = entry as Record<string, unknown>
      const name = typeof record.name === "string" ? record.name.trim() : ""
      if (!name) return null
      const website = normalizeOptionalUrl(
        typeof record.website === "string" ? record.website : null
      )

      return {
        name,
        website,
      }
    })
    .filter((entry): entry is { name: string; website: string | null } => entry !== null)
}

const normalizeSponsors = (sponsors: EventFormData["sponsors"]) => {
  if (Array.isArray(sponsors)) {
    const titleSponsors = sanitizeSponsorList(
      sponsors.filter((item) => item?.type === "titleSponsors")
    )
    const coPartners = sanitizeSponsorList(
      sponsors.filter((item) => item?.type === "coPartners")
    )
    const venuePartners = sanitizeSponsorList(
      sponsors.filter((item) => item?.type === "venuePartners")
    )
    const mediaPartners = sanitizeSponsorList(
      sponsors.filter((item) => item?.type === "mediaPartners")
    )

    return { titleSponsors, coPartners, venuePartners, mediaPartners }
  }

  return {
    titleSponsors: sanitizeSponsorList(sponsors?.titleSponsors),
    coPartners: sanitizeSponsorList(sponsors?.coPartners),
    venuePartners: sanitizeSponsorList(sponsors?.venuePartners),
    mediaPartners: sanitizeSponsorList(sponsors?.mediaPartners),
  }
}

const buildCreateEventPayload = (
  formData: EventFormData,
  published: boolean
) => {
  const tiers = buildTicketTiers(formData)
  const capacity = tiers.reduce((total, tier) => total + tier.quantity, 0)
  const endDateSource = formData.endDate?.trim() || formData.date

  return {
    title: formData.eventName.trim(),
    description: formData.description.trim(),
    date: combineDateAndTime(formData.date, formData.time),
    endDate: combineDateAndTime(endDateSource, formData.endTime),
    startTime: formData.time || null,
    endTime: formData.endTime || null,
    venue: formData.venue.trim(),
    location: formData.location.trim() || null,
    locationArea: formData.locationArea.trim() || null,
    locationCity: formData.locationCity.trim() || null,
    locationState: formData.locationState.trim() || null,
    locationPincode: formData.locationPincode.trim() || null,
    locationLat: formData.locationLat,
    locationLng: formData.locationLng,
    capacity: Math.max(1, capacity),
    category: formData.category || null,
    tagline: formData.tagline || null,
    googleMapsUrl: normalizeOptionalUrl(formData.googleMapsUrl),
    transportToEvent: formData.transportToEvent || null,
    entrySide: formData.entrySide || null,
    reEntryAllowed: formData.reEntryAllowed,
    parkingAvailable: formData.parkingAvailable,
    artists: (formData.artists || [])
      .filter((artist) => artist.name?.trim())
      .map((artist) => ({
        name: artist.name.trim(),
        genre: null,
      })),
    sponsors: normalizeSponsors(formData.sponsors),
    requirements: {
      personnel: formData.personnel || "",
      highlights: (formData.artists || [])
        .map((artist) => artist.name?.trim() || "")
        .filter(Boolean),
      timeSlots: (formData.timeSlots || []).filter((s) => s.name.trim() && s.startTime && s.endTime),
    },
    postEventFollowUp: formData.postEventFollowUp || {},
    contactInfo: {
      mobile: formData.contactInfo?.mobile?.trim() || "",
      email: formData.contactInfo?.email?.trim() || "",
      website: normalizeOptionalUrl(formData.contactInfo?.website) ?? null,
      additionalLinks: formData.contactInfo?.additionalLinks?.trim() || null,
    },
    audienceRange: formData.audienceRange || { min: 0, max: 100 },
    targetAudience: formData.targetAudience || {},
    addOns: { ...(formData.addOns || {}), gatewayBearer: formData.gatewayBearer ?? "customer" },
    guidelines: {
      text: formData.guidelines || "",
    },
    published,
    ticketTiers: tiers,
  }
}

const normalizeIndianMobile = (value: string | null | undefined) => {
  const raw = value?.trim() ?? ""
  if (!raw) return ""

  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10) return `+91 ${digits}`
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2)}`
  return raw
}

function CreateEventContent() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const { user, profile, organizerProfile } = useAuth()

  const eventId = searchParams.get("eventId")
  const action = searchParams.get("action")?.toLowerCase() ?? null
  const isUpdateFlow = Boolean(eventId) && (action === "edit" || action === "reschedule")
  // Pure create flow (no edit / reschedule / repeat): the organizer can pick
  // between publishing immediately and saving as a draft.
  const isCreateMode =
    !eventId && action !== "edit" && action !== "reschedule" && action !== "repeat"
  const [publishMode, setPublishMode] = useState<"publish" | "draft">("publish")
  const [isHydratingEvent, setIsHydratingEvent] = useState(() => Boolean(eventId))
  const [prefillError, setPrefillError] = useState<string | null>(null)
  const [storedCoverPreview, setStoredCoverPreview] = useState<string | null>(null)

  const contactInfoPrefill = useMemo<EventContactInfoPrefill>(() => {
    const additionalLinks = [organizerProfile?.instagramUrl, organizerProfile?.linkedinUrl]
      .map((link) => link?.trim() ?? "")
      .filter((link) => link.length > 0)
      .join(", ")

    return {
      mobile: normalizeIndianMobile(organizerProfile?.contactPhone ?? profile?.phone),
      email: organizerProfile?.contactEmail?.trim() || user?.email || "",
      website: organizerProfile?.websiteUrl?.trim() || "",
      additionalLinks,
    }
  }, [
    organizerProfile?.contactEmail,
    organizerProfile?.contactPhone,
    organizerProfile?.instagramUrl,
    organizerProfile?.linkedinUrl,
    organizerProfile?.websiteUrl,
    profile?.phone,
    user?.email,
  ])

  // Clear any stale draft so a fresh creation never starts with old data
  useEffect(() => {
    if (eventId) return
    localStorage.removeItem("eventFormData")
    localStorage.removeItem("eventFormCurrentStep")
    localStorage.removeItem("eventFormOpenSections")
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let active = true

    const hydrateDraftFromEvent = async () => {
      if (!eventId) {
        setIsHydratingEvent(false)
        setPrefillError(null)
        return
      }

      setIsHydratingEvent(true)
      setPrefillError(null)

      try {
        localStorage.removeItem("eventFormData")
        localStorage.removeItem("eventFormCurrentStep")
        localStorage.removeItem("eventFormOpenSections")

        const response = await apiRequest<{ data: { event: EventDetail } }>(`/organizer/events/${eventId}`, {
          auth: true,
        })

        if (!active) return
        localStorage.setItem("eventFormData", JSON.stringify(toEventFormDraft(response.data.event)))
        // Show the event's existing cover in the upload banner while editing.
        setStoredCoverPreview(getEventCoverImageUrl(eventId, response.data.event.updatedAt))
      } catch (error) {
        if (!active) return
        setPrefillError(error instanceof Error ? error.message : "Unable to load event details.")
      } finally {
        if (active) {
          setIsHydratingEvent(false)
        }
      }
    }

    void hydrateDraftFromEvent()

    return () => {
      active = false
    }
  }, [eventId])

  if (isHydratingEvent) {
    return (
      <div className="w-full rounded-xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600">
        Loading event details...
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {prefillError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {prefillError}
        </p>
      ) : null}

      <EventPage
        isDashboardMode
        startDirectly={true}
        action={action}
        contactInfoPrefill={!eventId ? contactInfoPrefill : undefined}
        initialCoverPreview={storedCoverPreview}
        publishMode={publishMode}
        onPublishModeChange={setPublishMode}
        showPublishingPreferences={isCreateMode}
        onSubmit={async (formData) => {
          // Only the pure create flow honours the draft/publish choice —
          // edit / reschedule / repeat keep the previous behaviour (true).
          const payload = buildCreateEventPayload(
            formData,
            isCreateMode ? publishMode === "publish" : true
          )
          let persistedEventId = eventId ?? ""

          if (isUpdateFlow && eventId) {
            const response = await apiRequest<{ data: { event: EventDetail } }>(`/organizer/events/${eventId}`, {
              method: "PUT",
              auth: true,
              body: JSON.stringify(payload),
            })
            persistedEventId = response.data.event.id
          } else {
            const response = await apiRequest<{ data: { event: EventDetail } }>("/organizer/events", {
              method: "POST",
              auth: true,
              body: JSON.stringify(payload),
            })
            persistedEventId = response.data.event.id
          }

          // Attach the cover in the background so the success navigation is
          // instant. The event is already saved; uploadEventCoverImage retries
          // the transient read-after-write 404, and the lists refresh once the
          // cover lands. A residual failure is non-fatal (cover can be re-added
          // by editing the event).
          const coverFile = formData.eventPhoto
          if (coverFile && persistedEventId) {
            void uploadEventCoverImage(persistedEventId, coverFile)
              .then(() => queryClient.invalidateQueries({ queryKey: ["organizer-events"] }))
              .catch((coverError) => {
                console.warn("Event saved, but cover upload did not complete.", coverError)
              })
          }

          await queryClient.invalidateQueries({ queryKey: ["organizer-events"] })
          await queryClient.invalidateQueries({ queryKey: ["organizer-events", "manage-events"] })
          await queryClient.invalidateQueries({ queryKey: ["organizer-analytics"] })

          router.push("/organizer/manage-events")
        }}
      />
    </div>
  )
}

export default function CreateEventPage() {
  return (
    <ProtectedRoute requireOrganizer>
      <Suspense fallback={null}>
        <CreateEventContent />
      </Suspense>
    </ProtectedRoute>
  )
}
