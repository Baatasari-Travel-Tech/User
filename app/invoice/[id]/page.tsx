"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Printer } from "lucide-react"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { apiRequest } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import type { TaxInvoice } from "@/types/api"

const money = (v: string) => `₹${Number(v).toFixed(2)}`

function InvoiceContent() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const { data, isLoading, isError, error } = useQuery<TaxInvoice, Error>({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const res = await apiRequest<{ data: { invoice: TaxInvoice } }>(
        `/user/history/${id}/invoice`,
        { auth: true },
      )
      return res.data.invoice
    },
  })

  if (isLoading) {
    return <p className="p-10 text-center text-sm text-slate-500">Loading invoice…</p>
  }
  if (isError || !data) {
    return (
      <p className="p-10 text-center text-sm text-rose-600">
        {error?.message ?? "Invoice not available."}
      </p>
    )
  }

  const inv = data
  const dateStr = inv.invoiceDate
    ? new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—"

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* Print bar — hidden when printing */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h1 className="text-lg font-bold text-slate-900">Tax Invoice</h1>
        <Button onClick={() => window.print()} className="gap-2 rounded-full">
          <Printer className="h-4 w-4" /> Print / Save PDF
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-800 print:border-0 print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <p className="text-xl font-bold text-slate-900">{inv.supplier.tradeName}</p>
            <p className="text-xs text-slate-500">{inv.supplier.legalName}</p>
            <p className="mt-1 max-w-xs text-xs text-slate-500">{inv.supplier.address}</p>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              GSTIN: {inv.supplier.gstin}
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold uppercase tracking-wide text-slate-900">
              Tax Invoice
            </p>
            <p className="mt-1 text-xs text-slate-500">No: {inv.invoiceNumber}</p>
            <p className="text-xs text-slate-500">Date: {dateStr}</p>
            <p className="text-xs text-slate-500">Order: {inv.orderNumber}</p>
          </div>
        </div>

        {/* Bill to */}
        <div className="grid grid-cols-1 gap-4 border-b border-slate-200 py-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bill to</p>
            <p className="mt-1 font-medium text-slate-900">{inv.buyer.name ?? "—"}</p>
            {inv.buyer.email ? <p className="text-xs text-slate-500">{inv.buyer.email}</p> : null}
            {inv.buyer.gstin ? (
              <p className="text-xs font-semibold text-slate-700">GSTIN: {inv.buyer.gstin}</p>
            ) : null}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Place of supply
            </p>
            <p className="mt-1 text-slate-900">State code {inv.placeOfSupplyStateCode}</p>
            <p className="text-xs text-slate-500">For: {inv.eventTitle}</p>
          </div>
        </div>

        {/* Lines */}
        <table className="mt-4 w-full text-left">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Taxable</th>
              <th className="py-2 text-right">GST</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {/* Platform fee — the platform's taxable supply */}
            <tr className="border-b border-slate-100">
              <td className="py-2">
                Platform / convenience fee
                <span className="block text-xs text-slate-400">
                  SAC {inv.sac} · GST {inv.platformFee.ratePct}%
                  {inv.intraState
                    ? ` (CGST ${money(inv.platformFee.cgst)} + SGST ${money(inv.platformFee.sgst)})`
                    : ` (IGST ${money(inv.platformFee.igst)})`}
                </span>
              </td>
              <td className="py-2 text-right">{money(inv.platformFee.taxable)}</td>
              <td className="py-2 text-right">{money(inv.platformFee.tax)}</td>
              <td className="py-2 text-right">{money(inv.platformFee.inclusive)}</td>
            </tr>
            {/* Tickets — organizer's supply, memo only. One row per tier line
                for cart orders; a single aggregate row for legacy orders. */}
            {inv.items && inv.items.length > 0 && inv.items.some((i) => i.ticketTierName) ? (
              inv.items.map((item, index) => (
                <tr
                  key={`${item.ticketTierId}-${index}`}
                  className="border-b border-slate-100 text-slate-500"
                >
                  <td className="py-2">
                    {item.ticketTierName || "Event ticket"} × {item.quantity}
                    {index === 0 ? (
                      <span className="block text-xs text-slate-400">
                        Supplied by the event organizer — GST (if any) is the organizer’s
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 text-right">—</td>
                  <td className="py-2 text-right">—</td>
                  <td className="py-2 text-right">
                    {item.unitPrice
                      ? money((Number(item.unitPrice) * item.quantity).toFixed(2))
                      : "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-slate-100 text-slate-500">
                <td className="py-2">
                  Event ticket × {inv.quantity}
                  <span className="block text-xs text-slate-400">
                    Supplied by the event organizer — GST (if any) is the organizer’s
                  </span>
                </td>
                <td className="py-2 text-right">—</td>
                <td className="py-2 text-right">—</td>
                <td className="py-2 text-right">{money(inv.ticketSubtotal)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end border-t border-slate-200 pt-3">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between font-bold text-slate-900">
              <span>Total paid</span>
              <span>{money(inv.grandTotal)}</span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
          GST is charged only on the platform/convenience fee (the platform’s supply,
          SAC {inv.sac}). The event ticket is a supply by the event organizer; any GST on
          the ticket is the organizer’s liability. This is a computer-generated invoice.
        </p>
      </div>
    </div>
  )
}

export default function InvoicePage() {
  return (
    <ProtectedRoute>
      <InvoiceContent />
    </ProtectedRoute>
  )
}
