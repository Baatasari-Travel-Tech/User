import type { EventDetail } from "@/types/api"

export type EventFaq = { q: string; a: string }

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const humanize = (key: string): string =>
  key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())

/**
 * The questions people ask before they book, answered from what this event
 * actually says: its refund setting, re-entry, parking, age limit, how to get
 * there. A question is only listed when the event gives an answer to it (or
 * when the answer is the same for every event: tickets and the QR code).
 */
export function buildEventFaqs(event: EventDetail): EventFaq[] {
  const faqs: EventFaq[] = []

  // Refunds
  const policy = event.refundPolicy
  const cutoff = policy?.cutoffHours ?? 2
  if (event.refundable === true) {
    faqs.push({
      q: "Can I cancel my booking and get a refund?",
      a: `Yes. On this event you can cancel your whole order from your ticket page while more than ${cutoff} hours remain before it starts. You get the ticket price back less a cancellation charge that grows as the event gets closer. The platform fee and the payment charge are not refunded. If the organizer cancels the event, you get everything back.`,
    })
  } else if (event.refundable === false) {
    faqs.push({
      q: "Can I cancel my booking and get a refund?",
      a: "No. The organizer has set this event as non-refundable, so a confirmed ticket cannot be cancelled or refunded if you change your mind. If the organizer cancels the event, you get a full refund. Your rights under consumer protection law are not affected.",
    })
  }

  // Re-entry and parking
  if (event.reEntryAllowed === true) {
    faqs.push({ q: "Can I leave and come back in?", a: "Yes, re-entry is allowed. Keep your ticket QR code with you." })
  } else if (event.reEntryAllowed === false) {
    faqs.push({
      q: "Can I leave and come back in?",
      a: "No. Re-entry is not allowed at this event, so once you leave you cannot go back in.",
    })
  }
  if (event.parkingAvailable === true) {
    faqs.push({ q: "Is parking available?", a: "Yes, there is parking at or near the venue." })
  } else if (event.parkingAvailable === false) {
    faqs.push({
      q: "Is parking available?",
      a: "There is no on-site parking at this venue. Check the transport options below the map.",
    })
  }

  // Age
  const min = event.audienceRange?.min
  const max = event.audienceRange?.max
  if (typeof min === "number" && typeof max === "number") {
    const all = min <= 0 && max >= 100
    faqs.push({
      q: "Is there an age limit?",
      a: all
        ? "No, this event is open to all ages."
        : max >= 100
          ? `This event is for ages ${min} and above. You may be asked for an ID at the gate.`
          : `This event is for ages ${min} to ${max}. You may be asked for an ID at the gate.`,
    })
  }

  // Getting in and getting there
  faqs.push({
    q: "How do I get my ticket and what do I show at the gate?",
    a: "Your ticket, with a QR code, is ready as soon as you pay. Find it under [My tickets](/history) and show the code at the gate. Keep it private: the first valid scan is admitted.",
  })

  const transport = Object.entries(asRecord(event.transportOptions))
    .filter(([, v]) => v === true)
    .map(([k]) => humanize(k))
  const how = [
    event.entrySide ? `Entry is via ${event.entrySide}.` : "",
    transport.length > 0 ? `Getting there: ${transport.join(", ")}.` : "",
    event.transportToEvent ? event.transportToEvent : "",
  ]
    .filter(Boolean)
    .join(" ")
  if (how) faqs.push({ q: "How do I get to the venue?", a: how })

  // Who to ask
  faqs.push({
    q: "Who do I contact if I have a question?",
    a: "Use Contact organizer for questions about the event itself. For a payment, a ticket or a refund, raise a ticket from [Help](/help) or write to [grievance@baatasari.com](mailto:grievance@baatasari.com).",
  })

  return faqs
}
