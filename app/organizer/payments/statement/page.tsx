"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Printer } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/api/client"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import type { OrganizerPayoutDetail } from "@/types/api"

function StatementContent() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get("eventId")

  const query = useQuery({
    queryKey: ["organizer-payout-detail", eventId],
    queryFn: async () => {
      const response = await apiRequest<{ data: OrganizerPayoutDetail }>(
        `/organizer/payments/${eventId}`,
        { auth: true },
      )
      return response.data
    },
    enabled: Boolean(eventId),
  })

  const statementDate = new Date().toISOString()

  if (query.isLoading) {
    return <p className="p-10 text-center text-sm text-slate-500">Loading statement…</p>
  }
  if (query.isError || !query.data || !query.data.summary) {
    return (
      <p className="p-10 text-center text-sm text-rose-600">
        {query.error instanceof Error ? query.error.message : "Statement not available."}
      </p>
    )
  }

  const data = query.data
  const summary = data.summary!

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* Print bar — hidden when printing */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/organizer/payments?eventId=${encodeURIComponent(eventId ?? "")}`}
          aria-label="Back to payment details"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-400"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold text-slate-900">Payout Statement</h1>
        <Button onClick={() => window.print()} className="gap-2 rounded-full">
          <Printer className="h-4 w-4" /> Print / Save PDF
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-800 print:border-0 print:p-0">
        {/* Issuer / statement meta */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xl font-bold text-slate-900">{data.platform.tradeName}</p>
            <p className="text-xs text-slate-500">{data.platform.legalName}</p>
            <p className="mt-1 max-w-xs text-xs text-slate-500">{data.platform.address}</p>
            <p className="mt-1 text-xs font-semibold text-slate-700">GSTIN: {data.platform.gstin}</p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold uppercase tracking-wide text-slate-900">
              Payout Statement
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Date: {formatDate(statementDate, { day: "2-digit", month: "short", year: "numeric" })}
            </p>
            <p className="text-xs text-slate-500">Event: {summary.title}</p>
            <p className="text-xs text-slate-500">Event date: {formatDate(summary.eventDate)}</p>
          </div>
        </div>

        {/* Payee */}
        <div className="grid grid-cols-1 gap-4 border-b border-slate-200 py-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Statement for
            </p>
            <p className="mt-1 font-medium text-slate-900">{data.organizer.name ?? "—"}</p>
            {data.organizer.pan ? (
              <p className="text-xs text-slate-500">PAN: {data.organizer.pan}</p>
            ) : null}
            {data.organizer.gstin ? (
              <p className="text-xs font-semibold text-slate-700">GSTIN: {data.organizer.gstin}</p>
            ) : null}
            {data.organizer.address ? (
              <p className="mt-1 max-w-xs text-xs text-slate-500">{data.organizer.address}</p>
            ) : null}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Payout account
            </p>
            {data.organizer.bankName ? (
              <p className="mt-1 text-slate-900">{data.organizer.bankName}</p>
            ) : null}
            {data.organizer.bankAccountMasked ? (
              <p className="text-xs text-slate-500">A/C {data.organizer.bankAccountMasked}</p>
            ) : null}
            {data.organizer.bankIfsc ? (
              <p className="text-xs text-slate-500">IFSC {data.organizer.bankIfsc}</p>
            ) : null}
            {summary.ordersCount ? (
              <p className="mt-1 text-xs text-slate-400">{summary.ordersCount} paid orders</p>
            ) : null}
          </div>
        </div>

        {/* Breakdown */}
        <table className="mt-4 w-full text-left">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2">Gross ticket revenue</td>
              <td className="py-2 text-right">{formatCurrency(summary.ticketRevenue)}</td>
            </tr>
            {/* Only shown when there is something to explain — with no refunds
                the subtotal would just restate the gross line above it. */}
            {summary.refunds > 0 ? (
              <>
                <tr className="border-b border-slate-100 text-slate-500">
                  <td className="py-2">
                    Less: refunded to buyers
                    <span className="block text-xs text-slate-400">
                      Amounts returned to ticket buyers, which are not settled to you
                    </span>
                  </td>
                  <td className="py-2 text-right">−{formatCurrency(summary.refunds)}</td>
                </tr>
                <tr className="border-b border-slate-200 font-semibold text-slate-900">
                  <td className="py-2">Net revenue</td>
                  <td className="py-2 text-right">{formatCurrency(summary.netRevenue)}</td>
                </tr>
              </>
            ) : null}
            <tr className="border-b border-slate-100 text-slate-500">
              <td className="py-2">
                Less: TDS deducted
                <span className="block text-xs text-slate-400">
                  Section 194-O, Income-tax Act — 0.1% of net revenue
                </span>
              </td>
              <td className="py-2 text-right">−{formatCurrency(summary.tds)}</td>
            </tr>
            <tr className="border-b border-slate-100 text-slate-500">
              <td className="py-2">
                Less: TCS collected
                <span className="block text-xs text-slate-400">
                  Section 52, CGST Act — 1% of net revenue
                </span>
              </td>
              <td className="py-2 text-right">−{formatCurrency(summary.tcs)}</td>
            </tr>
            <tr className="border-b border-slate-200 font-semibold text-slate-900">
              <td className="py-2">Net payable</td>
              <td className="py-2 text-right">{formatCurrency(summary.netPayable)}</td>
            </tr>
            <tr className="border-b border-slate-100 text-slate-500">
              <td className="py-2">Less: already paid to date</td>
              <td className="py-2 text-right">−{formatCurrency(summary.paid)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex justify-end border-t border-slate-200 pt-3">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between font-bold text-slate-900">
              <span>Balance pending</span>
              <span>{formatCurrency(summary.pending)}</span>
            </div>
            {summary.payoutHold ? (
              <p className="pt-1 text-right text-xs text-rose-600">
                On hold{summary.payoutHold.reason ? `: ${summary.payoutHold.reason}` : ""}
              </p>
            ) : null}
          </div>
        </div>

        {/* Payment history */}
        {data.history.length > 0 ? (
          <div className="mt-6 border-t border-slate-200 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Payments made against this event
            </p>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400">
                <tr>
                  <th className="py-1.5">Date</th>
                  <th className="py-1.5 text-right">Amount</th>
                  <th className="py-1.5">Reference</th>
                  <th className="py-1.5">Notes</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-50 text-slate-600">
                    <td className="py-1.5">{formatDateTime(entry.paidAt)}</td>
                    <td className="py-1.5 text-right font-semibold text-slate-900">
                      {formatCurrency(entry.amountPaid)}
                    </td>
                    <td className="py-1.5">{entry.reference ?? "—"}</td>
                    <td className="py-1.5">{entry.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
          This is a computer-generated statement of account summarizing ticket revenue collected
          on your behalf, refunds returned to buyers, and the statutory deductions applied on the
          net of the two under Section 194-O (TDS) of the
          Income-tax Act and Section 52 (TCS) of the CGST Act. It is provided for your records and
          does not constitute an official TDS certificate (Form 16A, available via TRACES) or GST
          TCS certificate (available via the GST portal) — please reconcile against those for
          statutory filing purposes. No signature is required.
        </p>
      </div>
    </div>
  )
}

export default function OrganizerPayoutStatementPage() {
  return (
    <ProtectedRoute requireOrganizer>
      <Suspense fallback={null}>
        <StatementContent />
      </Suspense>
    </ProtectedRoute>
  )
}
