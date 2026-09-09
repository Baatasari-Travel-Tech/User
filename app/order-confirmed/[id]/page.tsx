"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { animate, stagger } from "animejs"
import {
  ArrowRight,
  CalendarDays,
  Download,
  Map as MapIcon,
  MapPin,
  Share2,
  Sparkles,
  Ticket,
  User,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
// Aliased: this component already has a `qrDataUrl` piece of state holding
// the rendered image, and an unaliased import silently shadowed it.
import { qrDataUrl as renderQrDataUrl } from "@/lib/qrcode"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { apiRequest } from "@/lib/api/client"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import type { OrderTicket, TicketRecord } from "@/types/api"

// Sequence (seconds, relative to mount):
//   0.0 – 2.4   Ball bounces 3x, third bounce floats to top and locks
//   2.4 – 3.1   Ball rotates in place
//   3.1 – 3.7   Tick (SVG stroke) draws under the ball
//   3.4 – 4.1   "Order Confirmed" wordmark fades in
//   4.0 –       Details card slides in
// Compressed celebratory intro — the ticket + QR must appear fast (was 4.0s,
// which left buyers staring at an animation and could produce a QR-less PDF if
// they hit download early).
const BALL_END = 0.9
const TICK_START = 1.05
const HEADLINE_START = 1.2
const CARD_START = 1.5

function Intro() {
  return (
    <div className="relative mx-auto h-[280px] w-full max-w-md">
      {/* Glow trail */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0.6, 0] }}
        transition={{ duration: BALL_END, ease: "easeOut" }}
        className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--blue-500)/30 blur-3xl"
      />

      {/* The radiant blue ball */}
      <motion.div
        initial={{ y: -260, scale: 0.7, opacity: 0 }}
        animate={{
          y: [-260, 70, -110, 70, -160, -90, -90],
          scale: [0.7, 1, 0.95, 1, 0.97, 1, 1],
          opacity: [0, 1, 1, 1, 1, 1, 1],
          rotate: [0, 0, 0, 0, 0, 0, 360],
        }}
        transition={{
          duration: BALL_END + 0.7,
          ease: "easeOut",
          times: [0, 0.18, 0.34, 0.5, 0.66, 0.78, 1],
        }}
        className="absolute left-1/2 top-12 -translate-x-1/2"
      >
        <div className="relative h-20 w-20">
          {/* radiant halo around the ball */}
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: BALL_END }}
            className="absolute inset-0 rounded-full bg-(--blue-500)/40 blur-xl"
          />
          {/* gradient orb */}
          <div className="relative h-full w-full rounded-full bg-[radial-gradient(circle_at_30%_30%,#bfdbfe,#3b82f6_45%,#1d4ed8_100%)] shadow-[0_15px_50px_-8px_rgba(37,99,235,0.7),inset_0_-8px_18px_rgba(12,29,55,0.35)]">
            {/* specular highlight */}
            <span className="absolute left-3 top-3 h-4 w-6 rounded-full bg-white/85 blur-[2px]" />
          </div>
        </div>
      </motion.div>

      {/* Ground shadow that scales with each bounce */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0.4 }}
        animate={{
          opacity: [0, 0.45, 0.15, 0.45, 0.15, 0.15, 0],
          scaleX: [0.4, 1, 0.4, 1, 0.4, 0.4, 0],
        }}
        transition={{
          duration: BALL_END + 0.7,
          ease: "easeOut",
          times: [0, 0.18, 0.34, 0.5, 0.66, 0.78, 1],
        }}
        className="absolute left-1/2 top-[200px] h-2 w-24 -translate-x-1/2 rounded-full bg-black/40 blur-md"
      />

      {/* Tick under the ball */}
      <motion.svg
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: TICK_START, duration: 0.35, ease: "backOut" }}
        viewBox="0 0 80 80"
        className="absolute left-1/2 top-[110px] h-16 w-16 -translate-x-1/2"
      >
        <motion.circle
          cx="40"
          cy="40"
          r="34"
          fill="none"
          stroke="#10b981"
          strokeWidth="4"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: TICK_START, duration: 0.5, ease: "easeOut" }}
        />
        <motion.path
          d="M24 42 L36 54 L58 30"
          fill="none"
          stroke="#10b981"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: TICK_START + 0.45, duration: 0.45, ease: "easeOut" }}
        />
      </motion.svg>

      {/* ORDER CONFIRMED headline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: HEADLINE_START + 0.4, duration: 0.6, ease: "easeOut" }}
        className="absolute inset-x-0 top-[200px] text-center"
      >
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.6em" }}
          animate={{ opacity: 1, letterSpacing: "0.32em" }}
          transition={{ delay: HEADLINE_START, duration: 0.7, ease: "easeOut" }}
          className="text-xs font-bold uppercase tracking-[0.32em] text-(--gray-400)"
        >
          Confirmation
        </motion.p>
        <h1 className="mt-1 font-bricolage text-3xl font-bold text-(--brand-navy) md:text-4xl">
          Order Confirmed
        </h1>
      </motion.div>
    </div>
  )
}

function OrderConfirmedContent() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const ticketId = params.id

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  // ticketId → QR data-url for every ticket on the order (multi-tier orders
  // carry one entry pass per tier line).
  const [qrMap, setQrMap] = useState<Record<string, string>>({})
  const [introDone, setIntroDone] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const totalRef = useRef<HTMLSpanElement>(null)

  const query = useQuery({
    queryKey: ["ticket-detail", ticketId],
    queryFn: async () => {
      const response = await apiRequest<{ data: { ticket: TicketRecord } }>(
        `/user/history/${ticketId}`,
        { auth: true }
      )
      return response.data.ticket
    },
    enabled: Boolean(ticketId),
  })

  useEffect(() => {
    const t = setTimeout(() => setIntroDone(true), CARD_START * 1000)
    return () => clearTimeout(t)
  }, [])

  // Every ticket on the order — one per tier line. Older single-ticket records
  // (no `tickets` array) fall back to the top-level fields.
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
        const url = await renderQrDataUrl(t.qrPayload as string, { width: 180, margin: 2 }).catch(
          () => null,
        )
        return [t.ticketId, url] as const
      }),
    ).then((entries) => {
      if (cancelled) return
      const map: Record<string, string> = {}
      for (const [id, url] of entries) if (url) map[id] = url
      setQrMap(map)
      const first = orderTickets[0]
      if (first && map[first.ticketId]) setQrDataUrl(map[first.ticketId])
    })
    return () => {
      cancelled = true
    }
  }, [orderTickets])

  // anime.js: stagger summary rows + count-up total once card is visible AND data is loaded
  useEffect(() => {
    if (!introDone || !query.data || !cardRef.current) return
    animate(cardRef.current.querySelectorAll(".summary-row"), {
      opacity: [0, 1],
      translateY: [16, 0],
      delay: stagger(80, { start: 200 }),
      duration: 700,
      ease: "outExpo",
    })

    if (totalRef.current && Number(query.data.totalAmount) > 0) {
      const targetValue = Number(query.data.totalAmount)
      const currency = query.data.currency || "INR"
      const target = { value: 0 }
      const el = totalRef.current
      const fmt = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      })
      animate(target, {
        value: targetValue,
        duration: 1400,
        delay: 600,
        ease: "outExpo",
        onUpdate: () => {
          el.textContent = fmt.format(Math.floor(target.value))
        },
        onComplete: () => {
          el.textContent = fmt.format(targetValue)
        },
      })
    }
  }, [introDone, query.data])

  const ticket = query.data
  const isFree = ticket ? Number(ticket.totalAmount) === 0 : false
  const venue = ticket?.venue ?? ""
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`

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
              ? await renderQrDataUrl(pass.qrPayload, { width: 180, margin: 2 }).catch(() => null)
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

  const handleShare = async () => {
    if (!ticket) return
    const shareUrl = `${window.location.origin}/order-confirmed/${ticketId}`
    const shareText = `I'm going to ${ticket.eventTitle} on ${formatDate(ticket.eventDate)} 🎟️`
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Subtle animated backdrop — fades in after the intro completes */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: introDone ? 1 : 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="pointer-events-none absolute inset-0"
      >
        {/* Drifting gradient orbs */}
        <motion.div
          animate={{ x: [0, 30, -10, 0], y: [0, 20, -10, 0], scale: [1, 1.06, 1.03, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 h-[34rem] w-[34rem] rounded-full bg-(--blue-100)/60 blur-[140px]"
        />
        <motion.div
          animate={{ x: [0, -30, 10, 0], y: [0, -15, 15, 0], scale: [1, 1.08, 1.02, 1] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-(--blue-50) blur-[140px]"
        />
        <motion.div
          animate={{ x: [0, 25, -25, 0], y: [0, -25, 10, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/2 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-emerald-100/35 blur-[120px]"
        />

        {/* Slow rotating conic accent */}
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          className="absolute left-1/2 top-1/2 h-[50rem] w-[50rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_0deg,rgba(186,215,255,0.18),transparent_35%,rgba(167,243,208,0.14),transparent_65%,rgba(186,215,255,0.18))] blur-2xl"
        />

        {/* Tiny floating sparkles */}
        {Array.from({ length: 14 }).map((_, i) => {
          const size = 2 + (i % 3)
          const left = `${(i * 7.3) % 100}%`
          const topBase = 15 + ((i * 11) % 70)
          const duration = 10 + (i % 5) * 2
          const driftX = ((i % 5) - 2) * 14
          const delay = (i % 5) * 0.7
          return (
            <motion.span
              key={i}
              animate={{
                y: [0, -90, 0],
                x: [0, driftX, 0],
                opacity: [0, 0.55, 0],
              }}
              transition={{
                duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay,
              }}
              style={{
                left,
                top: `${topBase}%`,
                width: size,
                height: size,
                position: "absolute",
                background: i % 4 === 0 ? "#34d399" : "#60a5fa",
                borderRadius: "50%",
                boxShadow:
                  i % 4 === 0
                    ? "0 0 8px rgba(52,211,153,0.65)"
                    : "0 0 8px rgba(96,165,250,0.65)",
              }}
            />
          )
        })}

        {/* Diagonal shimmer line that drifts across very slowly */}
        <motion.div
          animate={{ x: ["-30%", "130%"] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 -left-1/3 h-full w-1/3 -rotate-12 bg-linear-to-r from-transparent via-(--blue-100)/35 to-transparent blur-2xl"
        />
      </motion.div>

      <div className="relative mx-auto w-full max-w-[1400px] px-4 py-10 md:px-6 md:py-14 lg:px-10">
        <div className="mx-auto max-w-3xl">
          <Intro />

          {/* Details card */}
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: introDone ? 1 : 0, y: introDone ? 0 : 40 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative mt-2 overflow-hidden rounded-3xl border border-(--gray-200) bg-white p-6 shadow-[0_25px_80px_-25px_rgba(12,29,55,0.18)] md:p-8"
          >
            {!ticket ? (
              <div className="py-12 text-center text-(--gray-500)">
                {query.isError ? "We couldn't load your ticket details." : "Loading ticket details…"}
              </div>
            ) : (
              <>
                {/* Header strip */}
                <div className="flex flex-col items-start justify-between gap-4 border-b border-dashed border-(--gray-200) pb-6 md:flex-row md:items-center">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-(--gray-400)">
                      Event
                    </p>
                    <h2 className="mt-1 font-bricolage text-2xl font-bold text-(--brand-navy)">
                      {ticket.eventTitle}
                    </h2>
                    <div className="mt-2 flex items-center gap-2 text-sm text-(--gray-500)">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      <span>Booking confirmed</span>
                    </div>
                  </div>

                  {orderTickets.length === 1 ? (
                    <div className="shrink-0 rounded-2xl border border-(--gray-200) bg-white p-3 text-center shadow-sm">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="Ticket QR code" width={120} height={120} className="block" />
                      ) : (
                        <div className="h-[120px] w-[120px] animate-pulse rounded-lg bg-slate-100" />
                      )}
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-(--gray-400)">
                        Entry pass
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Entry passes — one QR per ticket type (multi-tier orders) */}
                {orderTickets.length > 1 ? (
                  <div className="mt-6">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-(--gray-400)">
                      Entry passes · one QR per ticket type
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {orderTickets.map((pass) => (
                        <div
                          key={pass.ticketId}
                          className="flex items-center gap-4 rounded-2xl border border-(--gray-200) bg-white p-4 shadow-sm"
                        >
                          {qrMap[pass.ticketId] ? (
                            <img
                              src={qrMap[pass.ticketId]}
                              alt={`QR code for ${pass.tierName ?? "ticket"}`}
                              width={110}
                              height={110}
                              className="shrink-0"
                            />
                          ) : (
                            <div className="h-[110px] w-[110px] shrink-0 animate-pulse rounded-lg bg-slate-100" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-(--brand-navy)">
                              {pass.tierName ?? "Ticket"}
                            </p>
                            <p className="text-sm text-(--gray-500)">
                              Admits {pass.quantity}
                            </p>
                            <p className="mt-1 font-mono text-xs font-semibold text-(--brand-navy)">
                              {pass.ticketCode}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Summary grid */}
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="summary-row flex items-start gap-3 rounded-2xl border border-(--gray-100) bg-(--gray-50)/60 p-4 opacity-0">
                    <CalendarDays className="mt-0.5 h-4 w-4 text-(--brand-blue)" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-(--gray-400)">Date</p>
                      <p className="mt-0.5 font-semibold text-(--brand-navy)">{formatDate(ticket.eventDate)}</p>
                    </div>
                  </div>

                  <div className="summary-row flex items-start gap-3 rounded-2xl border border-(--gray-100) bg-(--gray-50)/60 p-4 opacity-0">
                    <MapPin className="mt-0.5 h-4 w-4 text-(--brand-blue)" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-(--gray-400)">Venue</p>
                      <p className="mt-0.5 truncate font-semibold text-(--brand-navy)">{ticket.venue}</p>
                    </div>
                  </div>

                  <div className="summary-row flex items-start gap-3 rounded-2xl border border-(--gray-100) bg-(--gray-50)/60 p-4 opacity-0">
                    <Ticket className="mt-0.5 h-4 w-4 text-(--brand-blue)" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-(--gray-400)">
                        {orderTickets.length > 1 ? "Tickets" : "Ticket code"}
                      </p>
                      {orderTickets.length > 1 ? (
                        <p className="mt-0.5 truncate font-semibold text-(--brand-navy)">
                          {orderTickets.map((p) => `${p.quantity} × ${p.tierName ?? "Ticket"}`).join(" · ")}
                        </p>
                      ) : (
                        <p className="mt-0.5 font-mono font-semibold text-(--brand-navy)">{ticket.ticketCode}</p>
                      )}
                    </div>
                  </div>

                  <div className="summary-row flex items-start gap-3 rounded-2xl border border-(--gray-100) bg-(--gray-50)/60 p-4 opacity-0">
                    <User className="mt-0.5 h-4 w-4 text-(--brand-blue)" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-(--gray-400)">Attendee</p>
                      <p className="mt-0.5 truncate font-semibold text-(--brand-navy)">{ticket.attendeeName}</p>
                      <p className="truncate text-xs text-(--gray-500)">{ticket.attendeeEmail}</p>
                    </div>
                  </div>
                </div>

                {/* Stretched Route me button — sits ABOVE total paid */}
                <motion.a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="summary-row group relative mt-5 flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-linear-to-r from-emerald-500 via-emerald-500 to-emerald-600 px-6 py-4 text-white shadow-lg shadow-emerald-500/25 transition-shadow hover:shadow-xl opacity-0"
                >
                  <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                      <MapIcon className="h-4 w-4" />
                    </span>
                    <span className="flex flex-col text-left">
                      <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/75">
                        Get directions
                      </span>
                      <span className="font-poppins text-base font-bold">Route me to the venue</span>
                    </span>
                  </span>
                  <ArrowRight className="relative h-5 w-5 transition-transform group-hover:translate-x-1" />
                </motion.a>

                {/* Total paid block with action icons */}
                <div className="summary-row mt-4 flex items-center justify-between rounded-2xl border border-(--brand-navy) bg-(--brand-navy) px-5 py-4 text-white opacity-0">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                      Total paid · {ticket.quantity} ticket{ticket.quantity === 1 ? "" : "s"}
                    </p>
                    <p className="mt-1 font-bricolage text-3xl font-bold">
                      {isFree ? (
                        "Free"
                      ) : (
                        <span ref={totalRef}>{formatCurrency(Number(ticket.totalAmount), ticket.currency)}</span>
                      )}
                    </p>
                    {ticket.paidAt ? (
                      <p className="mt-1 text-[11px] text-white/55">
                        Paid {formatDateTime(ticket.paidAt)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.08, y: -2 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={handleDownload}
                      title="Download ticket as PDF"
                      aria-label="Download ticket as PDF"
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-colors hover:bg-white/20"
                    >
                      <Download className="h-4 w-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.08, y: -2 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={handleShare}
                      title="Share booking"
                      aria-label="Share booking"
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-colors hover:bg-white/20"
                    >
                      <Share2 className="h-4 w-4" />
                    </motion.button>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="summary-row mt-5 flex flex-col gap-3 opacity-0 sm:flex-row">
                  <Link href={`/history/${ticketId}`} className="flex-1">
                    <Button className="group relative w-full overflow-hidden rounded-2xl bg-(--brand-navy) text-white shadow-lg hover:bg-(--brand-navy)/90">
                      <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      <Ticket className="relative mr-2 h-4 w-4" />
                      <span className="relative">View full ticket</span>
                      <ArrowRight className="relative ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/events")}
                    className="rounded-2xl border-(--gray-200) text-(--gray-700) hover:bg-(--gray-50)"
                  >
                    Browse more events
                  </Button>
                </div>
              </>
            )}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: introDone ? 1 : 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-5 text-center text-xs text-(--gray-500)"
          >
            Ticket id: <span className="font-mono">{ticketId}</span>
          </motion.p>
        </div>
      </div>
    </main>
  )
}

export default function OrderConfirmedPage() {
  return (
    <ProtectedRoute>
      <OrderConfirmedContent />
    </ProtectedRoute>
  )
}
