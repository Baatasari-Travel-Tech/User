"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useQueries, useQuery } from "@tanstack/react-query"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { apiRequest } from "@/lib/api/client"
import { Calendar, MapPin, Ticket, User } from "lucide-react"
import type { TicketRecord } from "@/types/api"

type HistoryEntry = {
  id: string
  action: string
  description: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

type TicketActivityItem = {
  entry: HistoryEntry
  ticketId: string
  ticket: TicketRecord | null
  isLoading: boolean
}

const resolveTicketId = (entry: HistoryEntry) => {
  const metadataTicketId = entry.metadata?.ticketId
  if (typeof metadataTicketId === "string" && metadataTicketId.trim()) return metadataTicketId

  const metadataOrderId = entry.metadata?.orderId
  if (typeof metadataOrderId === "string" && metadataOrderId.trim()) return metadataOrderId

  return entry.id
}

const formatAmount = (amount: number, currency: string) => {
  if (amount === 0) return "Free"
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency.toUpperCase() || "INR" }).format(amount)
}

const formatDate = (dateStr: string) => {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(dateStr))
}

const statusStyles: Record<string, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  PARTIALLY_REFUNDED: "bg-amber-50 text-amber-700 border-amber-200",
  CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
  REFUNDED: "bg-rose-50 text-rose-700 border-rose-200",
  VOID: "bg-slate-100 text-slate-500 border-slate-200",
}

// A ticket is "refunded" for display if the ticket was voided OR the order
// carries a (partial/full) refund.
const refundLabel = (t: TicketRecord | null): string | null => {
  if (!t) return null
  if (t.ticketStatus === "REFUNDED") return "Refunded"
  if (t.orderStatus === "REFUNDED") return "Refunded"
  if (t.orderStatus === "PARTIALLY_REFUNDED" || (t.refundedAmount ?? 0) > 0)
    return `Partially refunded (₹${(t.refundedAmount ?? 0).toFixed(2)})`
  return null
}

export default function HistoryPage() {
  const query = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const response = await apiRequest<{ data: { history: HistoryEntry[] } }>("/user/history", { auth: true })
      return response.data.history
    },
  })

  const bookedEntries = useMemo(
    () => (query.data ?? []).filter((entry) => entry.action === "EVENT_TICKET_PURCHASED"),
    [query.data]
  )

  const ticketQueries = useQueries({
    queries: bookedEntries.map((entry) => {
      const ticketId = resolveTicketId(entry)
      return {
        queryKey: ["activity-ticket", ticketId],
        queryFn: async () => {
          const response = await apiRequest<{ data: { ticket: TicketRecord } }>(`/user/history/${ticketId}`, {
            auth: true,
          })
          return response.data.ticket
        },
      }
    }),
  })

  const bookedTickets = useMemo<TicketActivityItem[]>(() => {
    return bookedEntries.map((entry, index) => ({
      entry,
      ticketId: resolveTicketId(entry),
      ticket: ticketQueries[index]?.data ?? null,
      isLoading: ticketQueries[index]?.isLoading ?? false,
    }))
  }, [bookedEntries, ticketQueries])

  return (
    <ProtectedRoute>
      <main className="page-x py-10">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-900">Account activity</p>
          <h1 className="mt-2 font-bricolage text-4xl text-slate-950">Your Booked Events</h1>
          <p className="mt-2 text-sm text-slate-500">Track and open the tickets for events you booked.</p>
        </div>

        <section className="rounded-[1.75rem] border border-white/60 bg-white/90 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">Booked Tickets</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {bookedTickets.length} total
            </span>
          </div>

          {query.isLoading ? (
            <div className="grid gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : bookedTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Ticket className="mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No booked events yet</p>
              <p className="mt-1 text-xs text-slate-400">Events you register for will appear here.</p>
              <Link
                href="/events"
                className="mt-4 inline-flex items-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition-all active:scale-[0.97]"
              >
                Browse events
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {bookedTickets.map((item) => {
                const t = item.ticket
                const status = t?.ticketStatus ?? "PENDING"
                const statusClass = statusStyles[status] ?? statusStyles.PENDING
                const refund = refundLabel(t)

                return (
                  <article
                    key={item.entry.id}
                    className="rounded-2xl border border-slate-100 bg-white overflow-hidden transition hover:border-slate-200 hover:shadow-md"
                  >
                    {/* Top bar with ticket code */}
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
                      <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-500">
                        <Ticket className="h-3.5 w-3.5" />
                        {item.isLoading ? (
                          <span className="inline-block h-3 w-28 animate-pulse rounded bg-slate-200" />
                        ) : (
                          <span>{t?.ticketCode ?? "—"}</span>
                        )}
                      </div>
                      {!item.isLoading && (
                        <div className="flex items-center gap-1.5">
                          {refund && status !== "REFUNDED" ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                              {refund}
                            </span>
                          ) : null}
                          <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusClass}`}>
                            {status.charAt(0) + status.slice(1).toLowerCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Main content */}
                    <div className="p-5">
                      {item.isLoading ? (
                        <div className="space-y-2">
                          <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
                          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                        </div>
                      ) : (
                        <>
                          <h3 className="text-base font-semibold text-slate-900 leading-snug">
                            {t?.eventTitle ?? item.entry.description}
                          </h3>

                          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                            {t?.eventDate && (
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                {formatDate(t.eventDate)}
                              </span>
                            )}
                            {t?.venue && (
                              <span className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate max-w-[200px]">{t.venue}</span>
                              </span>
                            )}
                            {t?.attendeeName && (
                              <span className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 shrink-0" />
                                {t.attendeeName}
                              </span>
                            )}
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm">
                              {t && (
                                <span className="text-slate-700">
                                  <span className="font-semibold">{t.quantity}</span>
                                  <span className="text-slate-400"> × </span>
                                  <span className="font-semibold text-slate-900">
                                    {formatAmount(t.totalAmount / t.quantity, t.currency)}
                                  </span>
                                </span>
                              )}
                              {t && t.totalAmount > 0 && (
                                <span className="text-xs text-slate-400">
                                  Total: {formatAmount(t.totalAmount, t.currency)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/invoice/${item.ticketId}`}
                                className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                Tax invoice
                              </Link>
                              <Link
                                href={`/history/${item.ticketId}`}
                                className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.97]"
                              >
                                View ticket
                              </Link>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </ProtectedRoute>
  )
}
