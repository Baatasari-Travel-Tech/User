"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Download, Share2 } from "lucide-react"
import { qrDataUrl } from "@/lib/qrcode"
import { useQuery } from "@tanstack/react-query"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { apiRequest } from "@/lib/api/client"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import type { OrderTicket, TicketRecord } from "@/types/api"

// Routes into the existing (tracked, admin-notified) support-ticket flow
// with the order context already filled in, instead of the buyer retyping
// it or emailing cold. See app/contact-us/page.tsx's `problem` prefill.
const buildCancelRequestHref = (ticket: TicketRecord): string => {
  const lines = [
    "I'd like to request a cancellation/refund for my ticket.",
    "",
    `Event: ${ticket.eventTitle}`,
    `Order ID: ${ticket.orderId}`,
    `Ticket code: ${ticket.ticketCode}`,
    "",
    "Reason: ",
  ]
  return `/contact-us?problem=${encodeURIComponent(lines.join("\n"))}`
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>()
  // ticketId → QR data-url; multi-tier orders carry one entry pass per line.
  const [qrMap, setQrMap] = useState<Record<string, string>>({})

  const query = useQuery({
    queryKey: ["ticket-detail", params.id],
    queryFn: async () => {
      const response = await apiRequest<{ data: { ticket: TicketRecord } }>(`/user/history/${params.id}`, {
        auth: true,
      })
      return response.data.ticket
    },
  })

  const ticket = query.data

  // Every ticket on the order; older single-ticket records (no tickets array)
  // fall back to the top-level fields.
  const orderTickets = useMemo<OrderTicket[]>(() => {
    const t = query.data
    if (!t) return []
    if (t.tickets && t.tickets.length > 0) return t.tickets
    return [
      {
        ticketId: t.ticketId,
        tierName: null,
        quantity: t.quantity,
        ticketCode: t.ticketCode,
        qrPayload: t.qrPayload,
        ticketStatus: t.ticketStatus,
      },
    ]
  }, [query.data])

  useEffect(() => {
    let cancelled = false
    const withQr = orderTickets.filter((t) => t.qrPayload)
    if (withQr.length === 0) return
    void Promise.all(
      withQr.map(async (t) => {
        const url = await qrDataUrl(t.qrPayload as string, { width: 200, margin: 2 }).catch(
          () => null,
        )
        return [t.ticketId, url] as const
      }),
    ).then((entries) => {
      if (cancelled) return
      const map: Record<string, string> = {}
      for (const [id, url] of entries) if (url) map[id] = url
      setQrMap(map)
    })
    return () => {
      cancelled = true
    }
  }, [orderTickets])

  const multiPass = orderTickets.length > 1

  const handleShare = async () => {
    if (!ticket) return
    const shareUrl = `${window.location.origin}/history/${params.id}`
    const shareText = `My ticket for ${ticket.eventTitle} on ${formatDate(ticket.eventDate)} 🎟️`
    try {
      if (navigator.share) {
        await navigator.share({ title: ticket.eventTitle, text: shareText, url: shareUrl })
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
      }
    } catch {
      // user dismissed share — no-op
    }
  }

  const handleDownload = async () => {
    if (!ticket) return
    try {
      // Ensure every pass's QR is available even if the user downloads
      // immediately (before the render-time generation finishes).
      const passes = await Promise.all(
        orderTickets.map(async (pass) => ({
          pass,
          qr:
            qrMap[pass.ticketId] ??
            (pass.qrPayload
              ? await qrDataUrl(pass.qrPayload, { width: 180, margin: 2 }).catch(() => null)
              : null),
        })),
      )
      const singlePass = passes.length === 1
      const qr = singlePass ? passes[0]?.qr ?? null : null
      const { jsPDF } = await import("jspdf")
      const pdf = new jsPDF({ unit: "pt", format: "a4" })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 40

      // Header band (brand navy)
      pdf.setFillColor(12, 29, 55)
      pdf.rect(0, 0, pageWidth, 80, "F")
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(11)
      pdf.text("BAATASARI", margin, 34)
      pdf.setFontSize(20)
      pdf.text("Event Ticket", margin, 60)

      let y = 120

      // Event title
      pdf.setTextColor(12, 29, 55)
      pdf.setFontSize(10)
      pdf.text("EVENT", margin, y)
      y += 16
      pdf.setFontSize(18)
      const titleLines = pdf.splitTextToSize(ticket.eventTitle, pageWidth - margin * 2 - 160)
      pdf.text(titleLines, margin, y)
      y += titleLines.length * 22

      // QR (top right) — draw if we have a data url
      if (qr) {
        try {
          pdf.addImage(qr, "PNG", pageWidth - margin - 140, 100, 140, 140)
          pdf.setFontSize(8)
          pdf.setTextColor(120, 120, 120)
          pdf.text("Scan at entry", pageWidth - margin - 90, 256)
        } catch {
          // ignore image embed errors
        }
      }

      y += 30

      // Two-column key/value list
      const writeRow = (label: string, value: string) => {
        pdf.setTextColor(120, 120, 120)
        pdf.setFontSize(9)
        pdf.text(label.toUpperCase(), margin, y)
        pdf.setTextColor(12, 29, 55)
        pdf.setFontSize(12)
        const lines = pdf.splitTextToSize(value, pageWidth - margin * 2 - 160)
        pdf.text(lines, margin, y + 14)
        y += 14 + lines.length * 14 + 14
      }

      writeRow("Date", formatDate(ticket.eventDate))
      writeRow("Venue", ticket.venue ?? "—")
      writeRow("Attendee", `${ticket.attendeeName}${ticket.attendeeEmail ? "  ·  " + ticket.attendeeEmail : ""}`)
      if (singlePass) {
        writeRow("Ticket code", ticket.ticketCode)
        writeRow("Quantity", `${ticket.quantity} ticket${ticket.quantity === 1 ? "" : "s"}`)
      } else {
        writeRow(
          "Tickets",
          passes.map(({ pass }) => `${pass.quantity} × ${pass.tierName ?? "Ticket"}`).join(", "),
        )
      }
      writeRow(
        "Total paid",
        Number(ticket.totalAmount) === 0
          ? "Free"
          : formatCurrency(Number(ticket.totalAmount), ticket.currency)
      )
      if (ticket.paidAt) writeRow("Paid on", formatDateTime(ticket.paidAt))

      // Multi-tier orders: one entry-pass block (QR + tier + code) per ticket.
      if (!singlePass) {
        const pageHeight = pdf.internal.pageSize.getHeight()
        for (const { pass, qr: passQr } of passes) {
          if (y + 130 > pageHeight - 60) {
            pdf.addPage()
            y = 60
          }
          pdf.setDrawColor(220, 220, 220)
          pdf.roundedRect(margin, y, pageWidth - margin * 2, 120, 8, 8)
          if (passQr) {
            try {
              pdf.addImage(passQr, "PNG", margin + 10, y + 10, 100, 100)
            } catch {
              // ignore image embed errors
            }
          }
          pdf.setTextColor(12, 29, 55)
          pdf.setFontSize(14)
          pdf.text(pass.tierName ?? "Ticket", margin + 125, y + 38)
          pdf.setFontSize(11)
          pdf.setTextColor(90, 90, 90)
          pdf.text(`Admits ${pass.quantity}`, margin + 125, y + 58)
          pdf.setFontSize(11)
          pdf.setTextColor(12, 29, 55)
          pdf.text(pass.ticketCode, margin + 125, y + 78)
          pdf.setFontSize(8)
          pdf.setTextColor(120, 120, 120)
          pdf.text("Scan at entry", margin + 125, y + 96)
          y += 132
        }
      }

      // Footer
      const footerY = pdf.internal.pageSize.getHeight() - 40
      pdf.setDrawColor(220, 220, 220)
      pdf.line(margin, footerY - 16, pageWidth - margin, footerY - 16)
      pdf.setTextColor(120, 120, 120)
      pdf.setFontSize(9)
      pdf.text(`Ticket id: ${ticket.ticketId}`, margin, footerY)
      pdf.text("baatasari.com", pageWidth - margin, footerY, { align: "right" })

      const safeCode = (ticket.ticketCode || ticket.ticketId).replace(/[^a-zA-Z0-9_-]+/g, "-")
      pdf.save(`baatasari-ticket-${safeCode}.pdf`)
    } catch (error) {
      console.error("Ticket download failed", error)
      alert("Couldn't generate the ticket PDF. Please try again.")
    }
  }

  return (
    <ProtectedRoute>
      <main className="page-x py-10">
        <Link
          href="/history"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-(--gray-500) transition hover:text-(--brand-navy)"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to my tickets
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mx-auto max-w-3xl rounded-[2rem] border border-(--gray-200) bg-white/90 p-8 shadow-[0_25px_60px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-(--brand-navy)">
                {multiPass ? "Tickets" : "Ticket"}
              </p>
              <h1 className="mt-3 font-bricolage text-4xl text-(--brand-navy)">
                {query.data?.eventTitle ?? "Loading ticket…"}
              </h1>
            </div>

            {ticket ? (
              <div className="flex shrink-0 items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => void handleDownload()}
                  title="Download ticket as PDF"
                  aria-label="Download ticket as PDF"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-(--gray-200) bg-(--gray-50) text-(--brand-navy) transition-colors hover:bg-(--gold-soft-bg)"
                >
                  <Download className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => void handleShare()}
                  title="Share ticket"
                  aria-label="Share ticket"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-(--gray-200) bg-(--gray-50) text-(--brand-navy) transition-colors hover:bg-(--gold-soft-bg)"
                >
                  <Share2 className="h-4 w-4" />
                </motion.button>
              </div>
            ) : null}
          </div>

          {query.data ? (
            <>
              {/* Entry passes — one QR per ticket type */}
              <div className={`mt-6 grid gap-4 ${multiPass ? "sm:grid-cols-2" : "justify-center"}`}>
                {orderTickets.map((pass) => (
                  <div
                    key={pass.ticketId}
                    className="rounded-2xl border border-(--gray-200) bg-white p-4 text-center shadow-sm"
                  >
                    {qrMap[pass.ticketId] ? (
                      <img
                        src={qrMap[pass.ticketId]}
                        alt={`QR code for ${pass.tierName ?? "ticket"}`}
                        width={180}
                        height={180}
                        className="mx-auto"
                      />
                    ) : (
                      <div className="mx-auto h-[180px] w-[180px] animate-pulse rounded-lg bg-slate-100" />
                    )}
                    {multiPass ? (
                      <p className="mt-2 text-sm font-semibold text-(--brand-navy)">
                        {pass.tierName ?? "Ticket"} · Admits {pass.quantity}
                      </p>
                    ) : null}
                    <p className="mt-1 font-mono text-xs font-semibold text-(--gray-700)">{pass.ticketCode}</p>
                    <p className="mt-1 text-xs text-(--gray-500)">Show this at entry</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {multiPass ? (
                  <div className="rounded-3xl border border-(--gray-100) bg-(--gray-50) p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-(--gray-500)">Tickets</p>
                    <p className="mt-2 text-lg font-semibold text-(--brand-navy)">
                      {orderTickets.map((p) => `${p.quantity} × ${p.tierName ?? "Ticket"}`).join(" · ")}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-(--gray-100) bg-(--gray-50) p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-(--gray-500)">Ticket code</p>
                    <p className="mt-2 font-mono text-lg font-semibold text-(--brand-navy)">{query.data.ticketCode}</p>
                  </div>
                )}

                <div className="rounded-3xl border border-(--gray-100) bg-(--gray-50) p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-(--gray-500)">Status</p>
                  <p
                    className={`mt-2 text-lg font-semibold ${
                      query.data.ticketStatus === "ACTIVE" ? "text-emerald-600" : "text-(--brand-navy)"
                    }`}
                  >
                    {query.data.ticketStatus}
                  </p>
                </div>

                <div className="rounded-3xl border border-(--gray-100) bg-(--gray-50) p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-(--gray-500)">Event date</p>
                  <p className="mt-2 text-lg font-semibold text-(--brand-navy)">{formatDate(query.data.eventDate)}</p>
                </div>

                <div className="rounded-3xl border border-(--gray-100) bg-(--gray-50) p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-(--gray-500)">Venue</p>
                  <p className="mt-2 text-lg font-semibold text-(--brand-navy)">{query.data.venue}</p>
                </div>

                <div className="rounded-3xl border border-(--gray-100) bg-(--gray-50) p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-(--gray-500)">Attendee</p>
                  <p className="mt-2 text-lg font-semibold text-(--brand-navy)">{query.data.attendeeName}</p>
                  <p className="mt-0.5 text-sm text-(--gray-500)">{query.data.attendeeEmail}</p>
                </div>

                <div className="rounded-3xl border border-(--gray-100) bg-(--gray-50) p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-(--gray-500)">Quantity</p>
                  <p className="mt-2 text-lg font-semibold text-(--brand-navy)">{query.data.quantity}</p>
                </div>

                <div className="rounded-3xl border border-(--gray-100) bg-(--gray-50) p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-(--gray-500)">Amount paid</p>
                  <p className="mt-2 text-lg font-semibold text-(--brand-navy)">
                    {query.data.totalAmount === 0
                      ? "Free"
                      : formatCurrency(query.data.totalAmount, query.data.currency)}
                  </p>
                </div>

                {query.data.paidAt ? (
                  <div className="rounded-3xl border border-(--gray-100) bg-(--gray-50) p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-(--gray-500)">Paid on</p>
                    <p className="mt-2 text-lg font-semibold text-(--brand-navy)">{formatDateTime(query.data.paidAt)}</p>
                  </div>
                ) : null}
              </div>

              {query.data.ticketStatus === "ACTIVE" ? (
                <div className="mt-6 flex justify-end border-t border-(--gray-100) pt-6">
                  <Link
                    href={buildCancelRequestHref(query.data)}
                    className="inline-flex items-center justify-center rounded-full border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    Cancel ticket
                  </Link>
                </div>
              ) : null}
            </>
          ) : null}
        </motion.div>
      </main>
    </ProtectedRoute>
  )
}
