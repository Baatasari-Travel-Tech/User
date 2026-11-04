"use client"

import { Navigation, Phone, ScrollText } from "lucide-react"
import { SellerDetails } from "@/components/seller-details"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { EventDetail } from "@/types/api"

/**
 * The organizer: who is hosting, a Contact button, and the seller details the
 * Consumer Protection (E-Commerce) Rules ask us to show before a purchase (legal
 * name, address, email, phone). Those details are always visible, not hidden
 * behind the button.
 */
export function OrganizerCard({ event }: { event: EventDetail }) {
  const name = event.organizerDisplayName ?? event.seller?.legalName ?? null
  if (!name) return null

  const contact = (event.contactInfo ?? {}) as {
    mobile?: string
    email?: string
    website?: string
    additionalLinks?: string
  }
  const hosted = event.organizerEventCount ?? 0
  const hasContact = Boolean(contact.mobile || contact.email || contact.website || contact.additionalLinks)

  return (
    <section className="rounded-3xl bg-white p-5 shadow-[0_24px_60px_-32px_rgba(12,29,55,0.4)] md:p-7">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-(--brand-navy) text-lg font-bold text-white">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-(--brand-navy)">{name}</p>
          <p className="text-sm text-(--gray-500)">
            Approved by Baatasari
            {hosted > 0 ? ` · ${hosted} event${hosted === 1 ? "" : "s"} hosted` : ""}
          </p>
        </div>
        {hasContact ? (
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="shrink-0 rounded-full border border-(--gray-300) bg-white px-4 py-2 text-sm font-semibold text-(--brand-navy) transition hover:border-(--brand-navy)"
              >
                <span className="md:hidden">Contact</span>
                <span className="hidden md:inline">Contact organizer</span>
              </button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md rounded-3xl border border-(--gray-200) bg-(--white) p-6">
              <DialogTitle className="mb-3 text-lg font-bold text-(--brand-navy)">Contact information</DialogTitle>
              <div className="space-y-2 text-sm text-(--gray-600)">
                {contact.mobile ? (
                  <a href={`tel:${contact.mobile}`} className="flex items-center gap-2 hover:text-(--brand-blue)">
                    <Phone className="h-4 w-4" /> {contact.mobile}
                  </a>
                ) : null}
                {contact.email ? (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-(--brand-blue)">
                    <ScrollText className="h-4 w-4" /> {contact.email}
                  </a>
                ) : null}
                {contact.website ? (
                  <a
                    href={contact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-(--brand-blue)"
                  >
                    <Navigation className="h-4 w-4" /> {contact.website}
                  </a>
                ) : null}
                {contact.additionalLinks ? (
                  <p className="flex items-start gap-2">
                    <ScrollText className="mt-0.5 h-4 w-4 shrink-0" /> {contact.additionalLinks}
                  </p>
                ) : null}
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {event.seller?.legalName ? (
        <div className="mt-5 border-t border-(--gray-100) pt-4">
          <SellerDetails seller={event.seller} compact bare />
        </div>
      ) : null}
    </section>
  )
}
