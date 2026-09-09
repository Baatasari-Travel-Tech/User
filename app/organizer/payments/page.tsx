"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, FileText, Wallet } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { apiRequest } from "@/lib/api/client"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import type { OrganizerPayoutDetail, OrganizerPayoutSummary } from "@/types/api"

const statusChip = (row: OrganizerPayoutSummary) => {
  if (row.payoutHold) return { label: "On hold", tone: "bg-rose-100 text-rose-700" }
  if (row.fullySettled) return { label: "Settled", tone: "bg-emerald-100 text-emerald-700" }
  if (row.pending > 0) return { label: "Pending", tone: "bg-amber-100 text-amber-700" }
  return { label: "—", tone: "bg-slate-100 text-slate-500" }
}

function PaymentsListView() {
  const router = useRouter()
  const query = useQuery({
    queryKey: ["organizer-payouts"],
    queryFn: async () => {
      const response = await apiRequest<{ data: { payouts: OrganizerPayoutSummary[] } }>(
        "/organizer/payments",
        { auth: true },
      )
      return response.data.payouts
    },
  })

  const rows = query.data ?? []
  const totalPending = rows.reduce((sum, r) => sum + r.pending, 0)
  const totalPaid = rows.reduce((sum, r) => sum + r.paid, 0)
  const totalRefunds = rows.reduce((sum, r) => sum + r.refunds, 0)
  // The refund column is noise for the majority of organizers who have never
  // had one — surface it only once there is something to explain.
  const showRefunds = totalRefunds > 0

  return (
    <div className="w-full px-0 sm:px-6 lg:px-8 pt-0 pb-6 flex flex-col gap-5">
      <div>
        <h1 className="font-bricolage text-xl font-bold text-slate-900 sm:text-2xl">Payments</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your ticket revenue per event, less anything refunded to buyers, then minus TDS (0.1% u/s
          194-O) and TCS (1% u/s 52) — the same statutory deductions applied when payouts are
          settled.
        </p>
      </div>

      <div className={`grid gap-4 ${showRefunds ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
            Paid to date
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
            Pending
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
            {formatCurrency(totalPending)}
          </p>
        </div>
        {showRefunds ? (
          <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
              Refunded to buyers
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-rose-700">
              −{formatCurrency(totalRefunds)}
            </p>
          </div>
        ) : null}
      </div>

      {query.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
          Loading payments...
        </div>
      ) : query.isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
          Unable to load payments.
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
          <Wallet className="h-6 w-6 text-slate-300" />
          <p className="text-sm text-slate-500">No events with ticket sales yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className={`w-full ${showRefunds ? "min-w-[860px]" : "min-w-[720px]"} text-left text-sm`}>
            <thead className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold text-right">Ticket revenue</th>
                {showRefunds ? (
                  <>
                    <th className="px-4 py-3 font-semibold text-right">Refunds</th>
                    <th className="px-4 py-3 font-semibold text-right">Net revenue</th>
                  </>
                ) : null}
                <th className="px-4 py-3 font-semibold text-right">Net payable</th>
                <th className="px-4 py-3 font-semibold text-right">Paid</th>
                <th className="px-4 py-3 font-semibold text-right">Pending</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const chip = statusChip(row)
                return (
                  <tr
                    key={row.eventId}
                    className="cursor-pointer transition hover:bg-slate-50"
                    onClick={() => router.push(`/organizer/payments?eventId=${encodeURIComponent(row.eventId)}`)}
                  >
                    <td className="max-w-[220px] truncate px-4 py-3 font-semibold text-slate-900">
                      {row.title}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(row.eventDate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                      {formatCurrency(row.ticketRevenue)}
                    </td>
                    {showRefunds ? (
                      <>
                        <td className="px-4 py-3 text-right tabular-nums text-rose-700">
                          {row.refunds > 0 ? `−${formatCurrency(row.refunds)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                          {formatCurrency(row.netRevenue)}
                        </td>
                      </>
                    ) : null}
                    <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                      {formatCurrency(row.netPayable)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-900">
                      {formatCurrency(row.paid)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                      {formatCurrency(row.pending)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${chip.tone}`}>
                        {chip.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function PaymentDetailView({ eventId }: { eventId: string }) {
  const query = useQuery({
    queryKey: ["organizer-payout-detail", eventId],
    queryFn: async () => {
      const response = await apiRequest<{ data: OrganizerPayoutDetail }>(
        `/organizer/payments/${eventId}`,
        { auth: true },
      )
      return response.data
    },
  })

  const summary = query.data?.summary ?? null
  const history = query.data?.history ?? []

  return (
    <div className="w-full px-0 sm:px-6 lg:px-8 pt-0 pb-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/organizer/payments"
          aria-label="Back to payments"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-400"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="truncate font-bricolage text-xl font-bold text-slate-900 sm:text-2xl">
          {query.isLoading ? "Loading…" : (summary?.title ?? "Event")}
        </h1>
        {summary ? (
          <Link
            href={`/organizer/payments/statement?eventId=${encodeURIComponent(eventId)}`}
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
          >
            <FileText className="h-3.5 w-3.5" /> Print statement
          </Link>
        ) : null}
      </div>

      {query.isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700">
          Unable to load this event&apos;s payment details.
        </div>
      ) : summary ? (
        <>
          {summary.payoutHold ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <p className="font-semibold">
                Payout on hold{summary.payoutHold.reason ? ` — ${summary.payoutHold.reason}` : ""}
              </p>
              <p className="mt-1 text-xs text-rose-700">
                {summary.payoutHold.level === "ORGANIZER"
                  ? "This hold applies to your account and affects every event."
                  : "This hold applies to this event only."}{" "}
                Contact support if you have questions.
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                Ticket revenue
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                {formatCurrency(summary.ticketRevenue)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{summary.ordersCount} orders</p>
            </div>
            {summary.refunds > 0 ? (
              <>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    Refunded to buyers
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-rose-700">
                    −{formatCurrency(summary.refunds)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                    Net revenue
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                    {formatCurrency(summary.netRevenue)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">Deductions apply to this</p>
                </div>
              </>
            ) : null}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                TDS (0.1%)
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                −{formatCurrency(summary.tds)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                TCS (1%)
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                −{formatCurrency(summary.tcs)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                Net payable
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">
                {formatCurrency(summary.netPayable)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                Paid so far
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">
                {formatCurrency(summary.paid)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
                Pending
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-amber-700">
                {formatCurrency(summary.pending)}
              </p>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Payment history</h2>
            {history.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
                No payouts recorded yet — this shows up once our team settles a payment against this event.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold text-right">Amount</th>
                      <th className="px-4 py-3 font-semibold">Reference</th>
                      <th className="px-4 py-3 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-3 text-slate-600">{formatDateTime(entry.paidAt)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                          {formatCurrency(entry.amountPaid)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{entry.reference ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{entry.notes ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

function PaymentsContent() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get("eventId")
  return eventId ? <PaymentDetailView eventId={eventId} /> : <PaymentsListView />
}

export default function OrganizerPaymentsPage() {
  return (
    <ProtectedRoute requireOrganizer>
      <Suspense fallback={null}>
        <PaymentsContent />
      </Suspense>
    </ProtectedRoute>
  )
}
