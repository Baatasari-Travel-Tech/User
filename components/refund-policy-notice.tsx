import { Ban, RotateCcw } from "lucide-react"
import type { RefundPolicy } from "@/types/api"

/**
 * What a buyer can expect if they cancel, shown on the event page and at
 * checkout. The numbers come from the Backend (event.refundPolicy), the same
 * ones the refund is calculated from, so this text can never disagree with what
 * is refunded.
 *
 * Refundable event: the charges by how close the event is, in plain words.
 * Non-refundable event: said clearly and up front. An event the organizer
 * cancels is always refunded in full, either way.
 */
export function RefundPolicyNotice({
  refundable,
  policy,
  defaultOpen = false,
  className = "",
}: {
  refundable: boolean
  policy: RefundPolicy | null | undefined
  /** Open the charges table straight away (checkout) instead of folding it. */
  defaultOpen?: boolean
  className?: string
}) {
  if (!refundable) {
    return (
      <div
        className={`rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className}`}
        role="note"
      >
        <p className="flex items-center gap-2 font-semibold">
          <Ban className="h-4 w-4 shrink-0" aria-hidden />
          Non-refundable
        </p>
        <p className="mt-1 text-[13px] leading-relaxed">
          The organizer has set this event as non-refundable, so a confirmed ticket cannot be cancelled or
          refunded. If the organizer cancels the event, you get a full refund.
        </p>
      </div>
    )
  }

  const cutoff = policy?.cutoffHours ?? 2
  const minCharge = policy?.minChargePerTicketRupees ?? 10

  return (
    <details
      open={defaultOpen}
      className={`group rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-slate-800 ${className}`}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-emerald-800">
        <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
        Refundable: you can cancel until {cutoff} hours before the event
        <span className="ml-auto text-xs font-medium text-emerald-700 group-open:hidden">See charges</span>
      </summary>
      <div className="mt-3 space-y-3 text-[13px] leading-relaxed">
        <p>
          You can cancel your whole order from your ticket page. You get the ticket price back minus a cancellation
          charge that depends on how close the event is (at least ₹{minCharge} per ticket). The platform fee and the
          payment-gateway charge are not refunded. If the organizer cancels the event, you get everything back.
        </p>
        {policy && policy.tiers.length > 0 ? (
          <table className="w-full overflow-hidden rounded-xl border border-emerald-200 bg-white text-left text-[13px]">
            <thead className="bg-emerald-100/70 text-xs uppercase tracking-wide text-emerald-900">
              <tr>
                <th className="px-3 py-2 font-semibold">If you cancel</th>
                <th className="px-3 py-2 text-right font-semibold">Charge (of ticket price)</th>
              </tr>
            </thead>
            <tbody>
              {policy.tiers.map((tier) => (
                <tr key={tier.label} className="border-t border-emerald-100">
                  <td className="px-3 py-2">{tier.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{tier.chargePct}%</td>
                </tr>
              ))}
              <tr className="border-t border-emerald-100">
                <td className="px-3 py-2">Less than {cutoff} hours before, or after it starts</td>
                <td className="px-3 py-2 text-right font-medium text-rose-700">No refund</td>
              </tr>
            </tbody>
          </table>
        ) : null}
      </div>
    </details>
  )
}
