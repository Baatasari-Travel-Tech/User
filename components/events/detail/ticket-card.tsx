"use client"

import { CalendarX2, Check, ShieldCheck } from "lucide-react"
import { AddToCalendar } from "@/components/events/detail/add-to-calendar"
import { formatCurrency } from "@/lib/format"
import type { CalendarEvent } from "@/lib/calendar"
import type { EventDetail } from "@/types/api"

type Tier = EventDetail["ticketTiers"][number]

export const MAX_TICKETS_PER_ORDER = 10

/** Seats left on a tier, when the API tells us how many were sold (null = unknown). */
export const tierLeft = (tier: Tier): number | null => {
  if (typeof tier.soldCount !== "number" || typeof tier.quantity !== "number") return null
  return Math.max(0, tier.quantity - tier.soldCount)
}

/**
 * The "Select tickets" card: each ticket type with its price and a − / + for
 * how many, the total, and the Book tickets button. It sits at the right on a
 * wide screen (and stays in view as you scroll) and after the facts on a phone.
 * The page owns the numbers; this only draws them.
 */
export function TicketCard({
  tiers,
  qty,
  onAdjust,
  totalQty,
  subtotal,
  platformFee,
  seatsLeft,
  isFree,
  refundable,
  state,
  onBook,
  calendarEvent,
}: {
  tiers: Tier[]
  qty: Record<string, number>
  onAdjust: (tierId: string, delta: number, left: number | null) => void
  totalQty: number
  subtotal: number
  platformFee: number
  seatsLeft: number | null
  isFree: boolean
  refundable: boolean | undefined
  /** "open" when it can be booked; otherwise why not. */
  state: "open" | "cancelled" | "ended" | "no-tickets" | "sold-out"
  onBook: () => void
  calendarEvent: CalendarEvent
}) {
  if (state === "cancelled" || state === "ended") {
    const cancelled = state === "cancelled"
    return (
      <div className="rounded-3xl bg-white p-6 shadow-[0_24px_60px_-32px_rgba(12,29,55,0.4)]">
        <div className="flex items-center gap-3">
          <CalendarX2 className={`h-6 w-6 shrink-0 ${cancelled ? "text-rose-600" : "text-slate-500"}`} />
          <div>
            <p className={`text-sm font-bold ${cancelled ? "text-rose-700" : "text-slate-600"}`}>
              {cancelled ? "Event cancelled" : "Event ended"}
            </p>
            <p className="text-xs text-slate-500">
              {cancelled ? "If you booked, you will get a full refund." : "Tickets are no longer available."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const buttonLabel = state === "sold-out" ? "Sold out" : totalQty === 0 ? "Select tickets" : "Book tickets"
  const disabled = state !== "open" || totalQty === 0

  return (
    <div id="ticket-card" className="scroll-mt-24 rounded-3xl bg-white p-5 shadow-[0_24px_60px_-32px_rgba(12,29,55,0.4)] md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-(--brand-navy)">Select tickets</h2>
        {seatsLeft !== null && seatsLeft > 0 ? (
          <span className="rounded-full bg-(--gold-soft-bg) px-3 py-1 text-xs font-semibold text-(--gold-text)">
            {seatsLeft} left
          </span>
        ) : null}
      </div>

      {state === "no-tickets" ? (
        <p className="mt-4 text-sm text-(--gray-500)">Tickets for this event are not on sale yet.</p>
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {tiers.map((tier) => {
              const id = tier.id ?? ""
              const n = qty[id] ?? 0
              const left = tierLeft(tier)
              const soldOut = left !== null && left <= 0
              const price = Number(tier.price ?? 0)
              return (
                <div
                  key={id || tier.name}
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
                    n > 0 ? "border-(--brand-navy)" : "border-(--gray-200)"
                  } ${soldOut ? "opacity-55" : ""}`}
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold leading-snug text-(--brand-navy)">{tier.name}</p>
                    <p className="mt-0.5 text-sm text-(--gray-500)">
                      {price === 0 ? "Free" : formatCurrency(price)}
                      {soldOut ? (
                        <span className="ml-2 text-[11px] font-semibold uppercase text-rose-500">Sold out</span>
                      ) : left !== null && left <= 10 ? (
                        <span className="ml-2 text-[11px] font-semibold text-rose-500">only {left} left</span>
                      ) : null}
                    </p>
                    {tier.description ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-(--gray-400)">{tier.description}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onAdjust(id, -1, left)}
                      disabled={n === 0}
                      aria-label={`Remove one ${tier.name} ticket`}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-(--gray-300) bg-white text-lg font-bold leading-none text-(--brand-navy) transition hover:border-(--brand-navy) disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-[15px] font-bold tabular-nums text-(--brand-navy)" aria-live="polite">
                      {n}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAdjust(id, 1, left)}
                      disabled={soldOut || totalQty >= MAX_TICKETS_PER_ORDER || (left !== null && n >= left)}
                      aria-label={`Add one ${tier.name} ticket`}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-(--brand-navy) text-lg font-bold leading-none text-white transition hover:bg-(--brand-navy)/85 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div className="text-sm text-(--gray-500)">
              <p>
                Total · {totalQty} ticket{totalQty === 1 ? "" : "s"}
              </p>
              {!isFree && totalQty > 0 ? <p className="text-xs">+ {formatCurrency(platformFee)} platform fee</p> : null}
            </div>
            <p className="text-2xl font-bold tabular-nums text-(--brand-navy)">
              {subtotal === 0 ? "Free" : formatCurrency(subtotal)}
            </p>
          </div>

          <button
            type="button"
            onClick={onBook}
            disabled={disabled}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-(--brand-navy) text-[15px] font-semibold text-white shadow-[0_14px_30px_-14px_rgba(12,29,55,0.6)] transition hover:bg-(--brand-navy)/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gold) active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {buttonLabel}
          </button>

          {typeof refundable === "boolean" && !isFree ? (
            <a
              href="#refund"
              className="mt-3 flex items-center gap-2 rounded-xl bg-(--gold-bar-bg) px-3 py-2 text-xs text-(--gray-600) hover:text-(--brand-navy)"
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-(--gold-icon)" aria-hidden />
              <span>
                {refundable ? "Cancellation charges apply" : "Non-refundable"} · <span className="underline">View refund policy</span>
              </span>
            </a>
          ) : null}

          <div className="mt-4 flex items-center justify-between text-xs text-(--gray-500)">
            <span className="inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> Secure checkout
            </span>
            <span className="inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> Instant QR tickets
            </span>
          </div>
        </>
      )}

      <AddToCalendar event={calendarEvent} className="mt-4" />
    </div>
  )
}
