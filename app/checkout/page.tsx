import type { Metadata } from "next"
import { StateBlock } from "@/components/platform/state-block"
import type { EventDetail } from "@/types/api"
import { isEventPast } from "@/lib/event-helpers"
import CheckoutClient from "./checkout-client"

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your booking",
}

async function fetchEvent(id: string): Promise<EventDetail | null> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""
    const res = await fetch(`${base}/api/v1/events/${id}`, {
      next: { revalidate: 30 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: { event?: EventDetail } }
    return json.data?.event ?? null
  } catch {
    return null
  }
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>
}) {
  const { eventId } = await searchParams

  if (!eventId) {
    return (
      <main className="page-x py-20">
        <StateBlock
          tone="error"
          title="No event selected"
          description="Pick an event before continuing to checkout."
        />
      </main>
    )
  }

  const event = await fetchEvent(eventId)

  if (!event) {
    return (
      <main className="page-x py-20">
        <StateBlock
          tone="error"
          title="Event unavailable"
          description="This event could not be loaded. It may have been unpublished or the request failed."
        />
      </main>
    )
  }

  // Guard checkout (incl. direct URL access) — cancelled or finished events
  // can't be bought. The backend enforces this too; this is the UI gate.
  if (event.cancelledAt) {
    return (
      <main className="page-x py-20">
        <StateBlock
          tone="error"
          title="Event cancelled"
          description="This event has been cancelled, so checkout is closed. If you already booked, you'll be refunded — minus the payment-gateway charge and platform fee, per our refund policy."
        />
      </main>
    )
  }

  if (isEventPast(event)) {
    return (
      <main className="page-x py-20">
        <StateBlock
          tone="error"
          title="Event ended"
          description="This event has already taken place — tickets are no longer available."
        />
      </main>
    )
  }

  return <CheckoutClient event={event} />
}
