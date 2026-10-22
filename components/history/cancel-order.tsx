"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { apiRequest } from "@/lib/api/client"
import { formatCurrency, formatDateTime } from "@/lib/format"
import { ApiError, type AttendeeRefundQuote } from "@/types/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/**
 * The buyer cancels their own order from the ticket page.
 *
 * The amount shown is the quote the Backend works out from the refund rules
 * (modules/refunds/refundPolicy.ts), and the same quote is what is refunded when
 * they confirm, so the button's number is the money that comes back. The whole
 * order is cancelled at once; the platform fee and the payment-gateway charge
 * are not refunded.
 *
 * When cancelling is not possible the buyer is told why in plain words, and can
 * still write to support.
 */

const BLOCKED_TEXT: Record<NonNullable<AttendeeRefundQuote["blockedReason"]>, string> = {
  NOT_PAID: "This order can't be cancelled.",
  ALREADY_REFUNDED: "This order has already been refunded or a refund is on its way.",
  FREE_ORDER: "This is a free booking, so there is nothing to refund.",
  EVENT_CANCELLED: "This event was cancelled, so your full refund is being processed for you.",
  NOT_REFUNDABLE: "This event is non-refundable, so the order can't be cancelled.",
  TOO_LATE: "Cancelling closed 2 hours before the event.",
  NOTHING_TO_REFUND:
    "The cancellation charge would be as much as the ticket price, so there is nothing to refund.",
}

export function CancelOrder({
  ticketId,
  quote,
  quantity,
  supportHref,
  onCancelled,
}: {
  /** The id used in the page URL (ticket or order id). */
  ticketId: string
  quote: AttendeeRefundQuote
  quantity: number
  /** Fallback: the support form, pre-filled with this order. */
  supportHref: string
  onCancelled: () => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await apiRequest(`/user/history/${ticketId}/refund`, { method: "POST", auth: true })
      setDone(true)
      setOpen(false)
      onCancelled()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "We could not cancel your order. Please try again.",
      )
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Your order is cancelled. Your refund of {formatCurrency(quote.refundAmount)} has been started and goes back
        to your original payment method, usually within 5 to 7 working days.
      </p>
    )
  }

  if (!quote.eligible) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-(--gray-600)">
          {BLOCKED_TEXT[quote.blockedReason ?? "NOT_PAID"]}
        </p>
        {quote.blockedReason === "NOT_REFUNDABLE" || quote.blockedReason === "TOO_LATE" ? (
          <Link
            href={supportHref}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-(--gray-200) px-5 py-2.5 text-sm font-semibold text-(--gray-700) transition hover:bg-(--gray-50)"
          >
            Contact support
          </Link>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-(--gray-600)">
        You can cancel this order until {formatDateTime(quote.refundableUntil)}. You would get{" "}
        <strong className="text-(--brand-navy)">{formatCurrency(quote.refundAmount)}</strong> back.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
      >
        Cancel order
      </button>

      <Dialog open={open} onOpenChange={(next) => (busy ? undefined : setOpen(next))}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader className="text-left">
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>
              This cancels all {quantity} ticket{quantity === 1 ? "" : "s"} on the order for{" "}
              {quote.eventTitle}. It cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <dl className="space-y-2 rounded-2xl bg-(--gray-50) p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-(--gray-600)">Ticket price</dt>
              <dd className="tabular-nums">{formatCurrency(quote.ticketPrice)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-(--gray-600)">
                Cancellation charge ({quote.cancellationChargePct}%
                {quote.tierLabel ? `, ${quote.tierLabel.toLowerCase()}` : ""})
              </dt>
              <dd className="tabular-nums text-rose-600">− {formatCurrency(quote.cancellationCharge)}</dd>
            </div>
            <div className="flex justify-between border-t border-(--gray-200) pt-2 text-base font-semibold text-(--brand-navy)">
              <dt>You get back</dt>
              <dd className="tabular-nums">{formatCurrency(quote.refundAmount)}</dd>
            </div>
          </dl>
          <p className="text-xs text-(--gray-500)">
            The platform fee ({formatCurrency(quote.platformFeeKept)}
            {quote.gatewayFeeKept > 0 ? ` and the payment-gateway charge ${formatCurrency(quote.gatewayFeeKept)}` : ""})
            you paid is not refunded. The refund goes to your original payment method, usually within 5 to 7 working
            days. The cancellation charge is at least ₹{quote.policy.minChargePerTicketRupees} per ticket.
          </p>

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              className="rounded-full border border-(--gray-200) px-5 py-2.5 text-sm font-semibold text-(--gray-700) hover:bg-(--gray-50) disabled:opacity-60"
            >
              Keep my tickets
            </button>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {busy ? "Cancelling…" : `Cancel and refund ${formatCurrency(quote.refundAmount)}`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
