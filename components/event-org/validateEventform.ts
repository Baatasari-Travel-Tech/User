import type { EventFormData } from "./data/create-event-data"

export type { EventFormData }

const isValidUrl = (value: string) => {
  try {
    new URL(value)
    return true
  } catch {
    try {
      new URL(`https://${value}`)
      return true
    } catch {
      return false
    }
  }
}

export function validateEventForm(formData: Partial<EventFormData>): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!formData.eventPhoto && !formData.hasStoredCover) errors.eventPhoto = "Cover image is required."
  if (!formData.eventName?.trim()) errors.eventName = "Event name is required."
  if (!formData.category?.trim()) errors.category = "Category is required."
  if (!formData.description?.trim()) errors.description = "Description is required."
  if (!formData.date) errors.date = "Start date is required."
  if (!formData.time) errors.time = "Start time is required."
  if (!formData.endTime) errors.endTime = "End time is required."
  if (!formData.venue?.trim()) errors.venue = "Venue is required."
  if (!formData.googleMapsUrl?.trim()) {
    errors.googleMapsUrl = "Google Maps URL is required."
  } else if (!isValidUrl(formData.googleMapsUrl.trim())) {
    errors.googleMapsUrl = "Enter a valid Google Maps URL."
  }

  if (formData.tagline?.trim() && formData.tagline.trim().length > 240) {
    errors.tagline = "Tagline must be 240 characters or less."
  }

  if (formData.transportToEvent?.trim() && formData.transportToEvent.trim().length > 1000) {
    errors.transportToEvent = "Transport details must be 1000 characters or less."
  }

  if (formData.entrySide?.trim() && formData.entrySide.trim().length > 1000) {
    errors.entrySide = "Entry side details must be 1000 characters or less."
  }

  const tiers = formData.audienceCategory ?? []
  if (!Array.isArray(tiers) || tiers.length === 0) {
    errors["audienceCategory.0.category"] = "Add at least one ticket category."
  } else {
    tiers.forEach((tier, index) => {
      if (!tier.category?.trim()) {
        errors[`audienceCategory.${index}.category`] = "Category name is required."
      }

      if (tier.isLimited) {
        const quantity = Number(tier.numberOfTickets)
        if (!tier.numberOfTickets || !Number.isFinite(quantity) || quantity < 1) {
          errors[`audienceCategory.${index}.numberOfTickets`] =
            "Number of tickets is required when limited."
        }
      }

      if (!tier.isFree) {
        const amount = Number(tier.price)
        if (tier.price === "" || !Number.isFinite(amount) || amount < 10) {
          errors[`audienceCategory.${index}.price`] = "Price must be at least ₹10, or mark the ticket as Free."
        }
      }

      if (!tier.description?.trim()) {
        errors[`audienceCategory.${index}.description`] = "Description is required."
      }
    })
  }

  if (formData.guidelines?.trim() && formData.guidelines.trim().length > 4000) {
    errors.guidelines = "Guidelines must be 4000 characters or less."
  }

  if (formData.addOns?.giftHampers && !formData.addOns.giftHampersDescription?.trim()) {
    errors["addOns.giftHampersDescription"] = "Gift hampers description is required."
  }

  if (formData.addOns?.addOther && !formData.addOns.addOtherDescription?.trim()) {
    errors["addOns.addOtherDescription"] = "Add-ons description is required."
  }

  if (!formData.contactInfo?.mobile?.trim()) {
    errors["contactInfo.mobile"] = "Mobile number is required."
  } else {
    const digits = formData.contactInfo.mobile.replace(/\D/g, "")
    const normalized = digits.startsWith("91") ? digits.slice(2) : digits
    if (normalized.length !== 10) {
      errors["contactInfo.mobile"] = "Enter a valid 10-digit mobile number."
    }
  }

  if (!formData.contactInfo?.email?.trim()) {
    errors["contactInfo.email"] = "Email is required."
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactInfo.email.trim())) {
    errors["contactInfo.email"] = "Enter a valid email address."
  }

  if (formData.contactInfo?.website?.trim() && !isValidUrl(formData.contactInfo.website.trim())) {
    errors["contactInfo.website"] = "Enter a valid website URL."
  }

  if (!formData.postEventFollowUp?.thankYouNote?.trim()) {
    errors["postEventFollowUp.thankYouNote"] = "Post-event follow-up is required."
  }

  return errors
}
