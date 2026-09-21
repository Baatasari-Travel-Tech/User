"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Gift,
  Lock,
  LogIn,
  Mail,
  MapPin,
  ShieldCheck,
  Ticket,
  User,
  UserPlus,
} from "lucide-react"
import { useAuth } from "@/app/providers"
import { useAuthModal } from "@/components/auth/auth-modal-context"
import { apiRequest } from "@/lib/api/client"
import { getEventCoverImageUrl } from "@/lib/event-cover"
import { formatCurrency, formatDate } from "@/lib/format"
import { loadRazorpayScript } from "@/lib/payments/razorpay"
import { loadCashfree } from "@/lib/payments/cashfree"
import type { ApiEnvelope, ApiError, EventDetail } from "@/types/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TermsDialog } from "@/components/common/terms-dialog"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const checkoutSchema = z
  .object({
    bookingFor: z.enum(["self", "other"]),
    guestName: z.string().trim().min(1, "Please enter the full name."),
    guestEmail: z.string().trim(),
    guestPhone: z.string().regex(/^\d{10}$/, "Phone number must be 10 digits."),
    sendCopyToMe: z.boolean(),
    termsAccepted: z
      .boolean()
      .refine((v) => v === true, { message: "Please accept terms and conditions to continue." }),
  })
  // Email is only validated for "other" bookings — for "self" it's the account
  // email (always valid) and the field is disabled in the UI.
  .superRefine((data, ctx) => {
    if (data.bookingFor === "other" && !EMAIL_RE.test(data.guestEmail)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guestEmail"],
        message: "Please enter a valid email for the attendee.",
      })
    }
  })

type CheckoutFormValues = z.infer<typeof checkoutSchema>

type CreateOrderResponse = {
  orderId: string
  orderNumber: string
  provider: "razorpay" | "cashfree"
  providerOrderId: string
  providerKeyId: string
  paymentSessionId: string
  mode?: "sandbox" | "production"
  eventId: string
  breakdown: {
    subtotal: number
    gatewayFee: number
    platformFee: number
    totalAmount: number
    currency: string
  }
  ticket?: { id: string }
  tickets?: { id: string }[]
}

// Cap enforced server-side per identity per event (A9); mirrored here so the
// steppers stop at the limit instead of failing at submit.
const MAX_TICKETS_PER_ORDER = 10

// Pricing constants live at module scope so they are genuinely constant. Kept
// inside the component they were re-created every render, which made them
// reactive values the memo hooks had to list as dependencies.
const PLATFORM_FEE_PER_TICKET = 10
// Gateway-fee estimate for the on-screen summary (MDR + 18% GST). Must match
// the backend's GATEWAY_RATE — the backend is authoritative for the real
// charge, this is only the preview.
const GATEWAY_RATE = 0.0231 * 1.18

export default function CheckoutClient({ event }: { event: EventDetail }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { session, user, profile } = useAuth()
  const { open, openModal } = useAuthModal()

  const isLoggedIn = Boolean(session?.user)
  const accountEmail = session?.user?.email ?? ""

  // Per-tier quantities. Seeded from the URL: `sel=tierId:qty,tierId:qty`
  // (multi-tier, from the event page steppers), with `tierId=` accepted as the
  // legacy single-tier form. Falls back to 1 × first tier. Still editable here.
  const [lineQty, setLineQty] = useState<Record<string, number>>(() => {
    const validIds = new Set((event.ticketTiers ?? []).map((t) => t.id ?? ""))
    const map: Record<string, number> = {}
    const sel = searchParams.get("sel")
    if (sel) {
      let total = 0
      for (const part of sel.split(",")) {
        const [tid, q] = part.split(":")
        const qty = Number(q)
        if (tid && validIds.has(tid) && Number.isInteger(qty) && qty > 0) {
          const take = Math.min(qty, MAX_TICKETS_PER_ORDER - total)
          if (take > 0) {
            map[tid] = (map[tid] ?? 0) + take
            total += take
          }
        }
      }
    } else {
      const tierId = searchParams.get("tierId")
      if (tierId && validIds.has(tierId)) map[tierId] = 1
    }
    if (Object.keys(map).length === 0) {
      const first = event.ticketTiers?.[0]?.id
      if (first) map[first] = 1
    }
    return map
  })

  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null)
  // Distinct from checkoutLoading: true only for the gap between Razorpay
  // reporting a successful charge and our own /verify call finishing. That
  // window used to render nothing at all — the Razorpay modal had already
  // closed and the page just sat there until the redirect.
  const [verifyingPayment, setVerifyingPayment] = useState(false)
  // Set by the payment.failed listener, read by ondismiss — Razorpay fires
  // both for a genuine decline (the modal stays open for retry, but a
  // subsequent manual close should explain what happened rather than
  // silently resetting to an idle "Pay Now" button). A ref, not state, is
  // deliberate: both callbacks are created once per Razorpay instance and
  // fire from the SDK's own event loop outside React's render cycle, so a
  // state value captured in that closure would be stale by the time
  // ondismiss reads it — the ref always reads the latest write.
  const lastFailureReasonRef = useRef<string | null>(null)
  // Idempotency key for order creation; reused across retries of the same
  // tier/quantity selection so a resubmit doesn't create a duplicate order.
  const idempotencyRef = useRef<{ sig: string; key: string } | null>(null)
  // The submit button sits far below the fold on a long page — a Razorpay
  // failure/dismiss can fire after the buyer has scrolled away (e.g. while
  // the payment iframe was open), so the error needs to bring itself into
  // view rather than rely on the buyer noticing it appeared.
  const checkoutErrorRef = useRef<HTMLDivElement>(null)
  // Optional buyer GSTIN for a B2B tax invoice on the platform fee.
  const [buyerGstin, setBuyerGstin] = useState("")
  const [coverImageSrc, setCoverImageSrc] = useState(getEventCoverImageUrl(event.id, event.updatedAt))

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    mode: "onBlur",
    defaultValues: {
      bookingFor: "self",
      guestName: profile?.full_name ?? "",
      guestPhone: (profile?.phone ?? "").replace(/^\+91/, ""),
      guestEmail: accountEmail,
      sendCopyToMe: false,
      termsAccepted: false,
    },
  })

  // Funnel stage 2 — record that this visitor reached checkout (fire-and-forget,
  // once per session per event). The auth cookie (credentials: include) lets the
  // backend tag the logged-in user; the visitor id matches the view-stage id.
  useEffect(() => {
    if (typeof window === "undefined") return
    const sessionKey = `checkout-tracked:${event.id}`
    if (sessionStorage.getItem(sessionKey)) return
    let visitorId = localStorage.getItem("baatasari-visitor-id") || ""
    if (!visitorId) {
      visitorId = crypto.randomUUID()
      localStorage.setItem("baatasari-visitor-id", visitorId)
    }
    sessionStorage.setItem(sessionKey, "1")
    void apiRequest(`/events/${event.id}/checkout-reached`, {
      method: "POST",
      body: JSON.stringify({ visitorId }),
    }).catch(() => undefined)
  }, [event.id])

  // Reactive form values — derived totals + UI branching depend on these.
  const bookingFor = useWatch({ control, name: "bookingFor" })

  // When the user logs in (or profile loads) mid-flow on "self" mode, populate
  // any empty self-fields from the account profile. Skips "other" mode.
  useEffect(() => {
    if (getValues("bookingFor") !== "self") return
    if (profile?.full_name && !getValues("guestName")) {
      setValue("guestName", profile.full_name, { shouldValidate: false })
    }
    if (profile?.phone && !getValues("guestPhone")) {
      setValue("guestPhone", profile.phone.replace(/^\+91/, ""), { shouldValidate: false })
    }
    if (accountEmail && !getValues("guestEmail")) {
      setValue("guestEmail", accountEmail, { shouldValidate: false })
    }
  }, [profile?.full_name, profile?.phone, accountEmail, getValues, setValue])

  const switchBookingFor = (next: "self" | "other") => {
    if (next === getValues("bookingFor")) return
    setCheckoutError(null)
    if (next === "other") {
      setValue("bookingFor", "other")
      setValue("guestName", "")
      setValue("guestPhone", "")
      setValue("guestEmail", "")
      setValue("sendCopyToMe", true)
    } else {
      setValue("bookingFor", "self")
      setValue("guestName", profile?.full_name ?? "")
      setValue("guestPhone", (profile?.phone ?? "").replace(/^\+91/, ""))
      setValue("guestEmail", accountEmail)
      setValue("sendCopyToMe", false)
    }
  }

  const openBookingAuthModal = (mode: "login" | "register") => {
    const params = new URLSearchParams(searchParams.toString())
    if (params.get("redirect") !== pathname) {
      params.set("redirect", pathname)
      const nextHref = params.size ? `${pathname}?${params.toString()}` : pathname
      router.replace(nextHref, { scroll: false })
    }
    openModal(mode)
  }

  useEffect(() => {
    if (open || isLoggedIn) return
    if (searchParams.get("redirect") !== pathname) return

    const params = new URLSearchParams(searchParams.toString())
    params.delete("redirect")
    const nextHref = params.size ? `${pathname}?${params.toString()}` : pathname
    router.replace(nextHref, { scroll: false })
  }, [isLoggedIn, open, pathname, router, searchParams])

  useEffect(() => {
    if (checkoutError) {
      checkoutErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [checkoutError])

  const tiers = useMemo(() => event.ticketTiers ?? [], [event.ticketTiers])

  // Cart lines derived from the per-tier quantities (in tier display order).
  const lines = useMemo(
    () =>
      tiers
        .filter((tier) => (lineQty[tier.id ?? ""] ?? 0) > 0)
        .map((tier) => ({ tier, qty: lineQty[tier.id ?? ""] ?? 0 })),
    [tiers, lineQty],
  )
  const totalQty = useMemo(() => lines.reduce((sum, l) => sum + l.qty, 0), [lines])

  const adjustLineQty = (tierId: string, delta: number) => {
    setCheckoutError(null)
    setLineQty((prev) => {
      const current = prev[tierId] ?? 0
      const total = Object.values(prev).reduce((sum, n) => sum + n, 0)
      const next =
        delta > 0
          ? total >= MAX_TICKETS_PER_ORDER
            ? current
            : current + 1
          : Math.max(0, current - 1)
      if (next === current) return prev
      return { ...prev, [tierId]: next }
    })
  }

  const subtotal = useMemo(
    () =>
      Number(
        lines
          .reduce((sum, l) => sum + Number(l.tier.price ?? 0) * l.qty, 0)
          .toFixed(2),
      ),
    [lines],
  )
  const isFreeEvent = subtotal === 0
  const gatewayBearer = (event.addOns as Record<string, unknown>)?.gatewayBearer ?? "customer"
  const platformFee = useMemo(
    () => (isFreeEvent ? 0 : PLATFORM_FEE_PER_TICKET * totalQty),
    [isFreeEvent, totalQty]
  )
  const gatewayFee = useMemo(() => {
    if (isFreeEvent || gatewayBearer === "organizer") return 0
    const net = subtotal + platformFee
    return Number((net * GATEWAY_RATE / (1 - GATEWAY_RATE)).toFixed(2))
  }, [isFreeEvent, gatewayBearer, subtotal, platformFee])
  const totalAmount = useMemo(
    () => Number((subtotal + platformFee + gatewayFee).toFixed(2)),
    [gatewayFee, platformFee, subtotal]
  )

  /* eslint-disable react-hooks/refs -- idempotencyRef/lastFailureReasonRef below
     are read/written only inside async event callbacks (form submit, Razorpay
     SDK events) that run after user interaction, never during render. */
  const onSubmit = handleSubmit(async (values) => {
    if (!isLoggedIn) {
      setCheckoutError("Please login to continue.")
      openBookingAuthModal("login")
      return
    }

    if (lines.length === 0) {
      setCheckoutError("Please select at least one ticket.")
      return
    }

    setCheckoutError(null)
    setCheckoutSuccess(null)
    setCheckoutLoading(true)

    try {
      // Idempotency: reuse one key across retries of the SAME selection (e.g.
      // user dismisses the Razorpay modal and resubmits) so the backend returns
      // the original order instead of creating a duplicate. Changing any line
      // rotates the key so a genuinely different order is created.
      const selectionSig = lines.map((l) => `${l.tier.id}:${l.qty}`).join("|")
      if (idempotencyRef.current?.sig !== selectionSig) {
        idempotencyRef.current = { sig: selectionSig, key: crypto.randomUUID() }
      }

      // BE `createEventOrderSchema` is .strict() — bookingFor and sendCopyToMe
      // are FE-only UI state; deliberately NOT in the request body.
      const orderResponse = await apiRequest<ApiEnvelope<{ order: CreateOrderResponse }>>(
        `/events/${event.id}/orders`,
        {
          method: "POST",
          auth: true,
          body: JSON.stringify({
            items: lines.map((l) => ({ ticketTierId: l.tier.id, quantity: l.qty })),
            guestName: values.guestName.trim(),
            guestEmail: values.guestEmail.trim(),
            guestPhone: values.guestPhone.trim(),
            idempotencyKey: idempotencyRef.current.key,
            ...(buyerGstin.trim().length === 15
              ? { buyerGstin: buyerGstin.trim().toUpperCase() }
              : {}),
          }),
        }
      )

      const order = orderResponse.data.order

      if (isFreeEvent || order.breakdown.totalAmount === 0) {
        setCheckoutSuccess("Your free ticket has been confirmed!")
        // Route by ORDER id — the confirmation page accepts it and shows every
        // ticket on the order (one per tier line).
        const ticketHref = `/order-confirmed/${order.orderId}`
        if (user?.onboardingStatus !== "COMPLETED") {
          router.push(`/onboarding?next=${encodeURIComponent(ticketHref)}`)
          return
        }
        router.push(ticketHref)
        return
      }

      // ── Cashfree ──────────────────────────────────────────────────────
      if (order.provider === "cashfree") {
        setCheckoutLoading(false)
        const cashfree = await loadCashfree(order.mode ?? "sandbox")
        const result = await cashfree.checkout({
          paymentSessionId: order.paymentSessionId,
          redirectTarget: "_modal",
        })
        // Modal dismissed without completing a payment → let them retry.
        if (result?.error && !result?.paymentDetails && !result?.redirect) {
          setCheckoutError(
            result.error.message || "Your payment didn't go through. You can try again.",
          )
          return
        }
        // A payment was attempted — our backend confirms it via Get Order.
        setVerifyingPayment(true)
        try {
          // Verification makes a live round-trip to the gateway's "get order"
          // API plus a DB transaction before responding — routinely slower
          // than the client's default 12s timeout under any gateway latency.
          // A timeout here reads as "verification failed," even though the
          // charge went through and the ticket may already be issued — don't
          // let a slow-but-successful verify look identical to a real failure.
          await apiRequest("/payments/verify", {
            method: "POST",
            auth: true,
            body: JSON.stringify({ orderId: order.orderId }),
            timeoutMs: 30000,
          })
          setCheckoutSuccess("Payment verified successfully.")
          const ticketHref = `/order-confirmed/${order.orderId}`
          if (user?.onboardingStatus !== "COMPLETED") {
            router.push(`/onboarding?next=${encodeURIComponent(ticketHref)}`)
            return
          }
          router.push(ticketHref)
        } catch (verifyError) {
          setCheckoutError(
            verifyError instanceof Error
              ? verifyError.message
              : "Payment was received but verification failed. Please contact support.",
          )
        } finally {
          setVerifyingPayment(false)
        }
        return
      }

      // ── Razorpay ──────────────────────────────────────────────────────
      await loadRazorpayScript()
      const Razorpay = window.Razorpay
      if (!Razorpay) throw new Error("Razorpay failed to load.")

      const razorpay = new Razorpay({
        key: order.providerKeyId,
        amount: Math.round(order.breakdown.totalAmount * 100),
        currency: order.breakdown.currency,
        name: "Baatasari",
        description: event.title,
        order_id: order.providerOrderId,
        prefill: {
          name: values.guestName.trim(),
          email: values.guestEmail.trim(),
          contact: values.guestPhone.trim(),
        },
        theme: { color: "#0c1d37" },
        handler: async (payment: {
          razorpay_order_id: string
          razorpay_payment_id: string
          razorpay_signature: string
        }) => {
          lastFailureReasonRef.current = null
          setCheckoutError(null)
          setVerifyingPayment(true)
          try {
            // Same slow-verify-looks-like-failure risk as the Cashfree path
            // above — give the gateway round-trip + DB transaction real room.
            await apiRequest<{ data: { result: { ticket?: { id?: string } } } }>(
              "/payments/verify",
              {
                method: "POST",
                auth: true,
                body: JSON.stringify({
                  orderId: order.orderId,
                  razorpayOrderId: payment.razorpay_order_id,
                  razorpayPaymentId: payment.razorpay_payment_id,
                  razorpaySignature: payment.razorpay_signature,
                }),
                timeoutMs: 30000,
              }
            )

            setCheckoutSuccess("Payment verified successfully.")
            // Route by ORDER id — the confirmation page accepts it and shows
            // every ticket on the order (one per tier line).
            const ticketHref = `/order-confirmed/${order.orderId}`

            if (user?.onboardingStatus !== "COMPLETED") {
              router.push(`/onboarding?next=${encodeURIComponent(ticketHref)}`)
              return
            }
            router.push(ticketHref)
          } catch (verifyError) {
            setCheckoutError(
              verifyError instanceof Error
                ? verifyError.message
                : "Payment was received but verification failed. Please contact support."
            )
          } finally {
            setVerifyingPayment(false)
          }
        },
        modal: {
          // Fires on a genuine cancel (user closed the widget themselves) —
          // but if a payment.failed just happened, it also fires right
          // after, since Razorpay leaves the choice of "try again or close"
          // to the user. Surface what happened instead of silently
          // resetting to an idle button in that case.
          ondismiss: () => {
            setCheckoutLoading(false)
            if (lastFailureReasonRef.current) {
              setCheckoutError(`Your payment didn't go through: ${lastFailureReasonRef.current}. You can try again.`)
              lastFailureReasonRef.current = null
            }
          },
        },
      })

      // A declined card / failed UPI / etc. Razorpay keeps its own modal
      // open so the buyer can retry with another method — we just remember
      // why, so if they close it instead, ondismiss can explain rather than
      // going silent. error.description is Razorpay's own human-readable
      // reason ("Payment declined by bank" etc.); reason is a fallback code.
      razorpay.on("payment.failed", (response: { error?: { description?: string; reason?: string } }) => {
        lastFailureReasonRef.current =
          response.error?.description || response.error?.reason || "the payment was declined"
      })

      razorpay.open()
    } catch (error) {
      if (error && typeof error === "object" && "code" in error) {
        const apiError = error as ApiError
        setCheckoutError(apiError.message)
      } else {
        setCheckoutError(error instanceof Error ? error.message : "Payment could not be started.")
      }
    } finally {
      setCheckoutLoading(false)
    }
  })
  /* eslint-enable react-hooks/refs */

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-(--brand-navy) via-[#142a4f] to-[#1a3a6b]">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-(--royal-blue)/35 blur-[140px]"
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-40 -right-40 h-[40rem] w-[40rem] rounded-full bg-sky-400/25 blur-[140px]"
        />
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
          className="absolute left-1/2 top-1/2 h-[50rem] w-[50rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_0deg,rgba(255,255,255,0.06),transparent_30%,rgba(186,215,255,0.08),transparent_70%)] blur-2xl"
        />
      </div>

      <div className="relative">
        {/* Header */}
        <header className="mx-auto flex w-full max-w-[1400px] items-center justify-between px-4 pt-8 pb-4 md:px-6 md:pt-12 lg:px-10">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-6 md:py-12 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-6xl"
          >
            <h1 className="font-bricolage text-3xl font-bold text-white md:text-5xl">
              Complete your booking
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/70 md:text-base">
              Review your details and confirm your tickets for{" "}
              <span className="font-semibold text-white">{event.title}</span>.
            </p>
          </motion.div>

          <div className="mx-auto mt-8 max-w-6xl space-y-6">
            {/* TOP — Event summary card */}
            <motion.aside
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <div className="overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col md:flex-row">
                  <div className="relative h-44 w-full overflow-hidden md:h-auto md:w-72 md:shrink-0">
                    <Image
                      src={coverImageSrc}
                      alt={event.title}
                      fill
                      className="object-cover"
                      onError={() => setCoverImageSrc("/an2.webp")}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-(--brand-navy)/80 to-transparent md:bg-linear-to-r" />
                    <div className="absolute inset-x-0 bottom-0 p-4 md:hidden">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-200/90">
                        You&apos;re booking
                      </p>
                      <h3 className="font-bricolage text-lg font-bold leading-tight text-white">
                        {event.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex-1 p-5 md:p-6">
                    <div className="hidden md:block">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sky-200/90">
                        You&apos;re booking
                      </p>
                      <h3 className="mt-1 font-bricolage text-xl font-bold leading-tight text-white">
                        {event.title}
                      </h3>
                    </div>

                    <div className="grid gap-3 text-sm text-white/90 md:mt-4 md:grid-cols-3">
                      <div className="flex items-start gap-3">
                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                            Date & Time
                          </p>
                          <p className="font-semibold">
                            {formatDate(event.date)} · {event.startTime ?? "8 AM"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                            Venue
                          </p>
                          <p className="font-semibold">{event.venue ?? "TBA"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
                            Tickets
                          </p>
                          <p className="font-semibold">
                            {lines.length > 0
                              ? lines.map((l) => `${l.qty} × ${l.tier.name}`).join(" · ")
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isFreeEvent || isLoggedIn ? (
                    <div className="flex flex-col gap-1 border-t border-white/10 bg-white/5 p-5 md:items-center md:justify-center md:border-l md:border-t-0 md:px-8">
                      <span className="text-xs uppercase tracking-wider text-white/60">Ticket price</span>
                      <span className="font-bricolage text-2xl font-bold text-white">
                        {isFreeEvent ? "Free" : formatCurrency(subtotal)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <p className="mt-4 flex items-center justify-center gap-2 text-xs text-white/60">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                256-bit SSL encryption · PCI compliant
              </p>
            </motion.aside>

            {/* Form (foggy when not logged in) */}
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className={`relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.07] p-1 shadow-2xl backdrop-blur-xl`}
              >
                <div
                  className={`rounded-[1.4rem] bg-white p-6 md:p-8 transition-all duration-500 ${
                    !isLoggedIn ? "pointer-events-none select-none blur-[14px]" : ""
                  }`}
                >
                  <form onSubmit={onSubmit} className="space-y-7" noValidate>
                    {/* Personal */}
                    <section className="space-y-4">
                      <div className="flex flex-col gap-3 border-b border-(--gray-200) pb-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-base font-semibold text-(--brand-navy) sm:text-lg">
                          Personal Details
                        </h3>

                        {/* For myself / For another Baatasari toggle */}
                        <div className="inline-flex rounded-full border border-(--gray-200) bg-(--gray-50) p-1 text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => switchBookingFor("self")}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
                              bookingFor === "self"
                                ? "bg-(--brand-navy) text-white shadow-sm"
                                : "text-(--gray-600) hover:text-(--brand-navy)"
                            }`}
                          >
                            <User className="h-3.5 w-3.5" />
                            For myself
                          </button>
                          <button
                            type="button"
                            onClick={() => switchBookingFor("other")}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all ${
                              bookingFor === "other"
                                ? "bg-(--brand-navy) text-white shadow-sm"
                                : "text-(--gray-600) hover:text-(--brand-navy)"
                            }`}
                          >
                            <Gift className="h-3.5 w-3.5" />
                            For another Baatasari
                          </button>
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {bookingFor === "other" ? (
                          <motion.div
                            key="other-hint"
                            initial={{ opacity: 0, y: -6, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -6, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-start gap-3 rounded-2xl border border-(--blue-100) bg-(--blue-50)/60 px-4 py-3 text-xs text-(--brand-blue)">
                              <Gift className="mt-0.5 h-4 w-4 shrink-0" />
                              <p>
                                Booking on behalf of someone? Enter their details below — the ticket will be issued in their name.
                              </p>
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>

                      <div>
                        <label htmlFor="name" className="mb-2 block text-xs font-medium text-(--gray-700) sm:text-sm">
                          {bookingFor === "other" ? "Attendee's Full Name *" : "Full Name *"}
                        </label>
                        <Input
                          id="name"
                          type="text"
                          placeholder={bookingFor === "other" ? "Enter attendee's full name" : "Enter your full name"}
                          {...register("guestName")}
                          className="w-full rounded-lg border border-(--gray-300) px-3 py-2 text-sm sm:px-4 sm:py-3 sm:text-base"
                        />
                        {errors.guestName ? (
                          <p className="mt-1 text-xs text-rose-600">{errors.guestName.message}</p>
                        ) : null}
                      </div>

                      <div>
                        <label htmlFor="email" className="mb-2 block text-xs font-medium text-(--gray-700) sm:text-sm">
                          {bookingFor === "other" ? "Attendee's Email *" : "Email *"}
                        </label>
                        <Input
                          id="email"
                          type="email"
                          placeholder={bookingFor === "other" ? "attendee@example.com" : ""}
                          disabled={bookingFor === "self"}
                          {...register("guestEmail")}
                          className={`w-full rounded-lg border border-(--gray-300) px-3 py-2 text-sm sm:px-4 sm:py-3 sm:text-base ${
                            bookingFor === "self" ? "bg-slate-50" : "bg-white"
                          }`}
                        />
                        {errors.guestEmail ? (
                          <p className="mt-1 text-xs text-rose-600">{errors.guestEmail.message}</p>
                        ) : null}
                      </div>

                      <div>
                        <label htmlFor="mobile" className="mb-2 block text-xs font-medium text-(--gray-700) sm:text-sm">
                          {bookingFor === "other" ? "Attendee's Mobile Number *" : "Mobile Number *"}
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs text-(--gray-500) sm:text-sm">
                            +91
                          </span>
                          <Input
                            id="mobile"
                            type="tel"
                            placeholder="10-digit mobile number"
                            inputMode="numeric"
                            {...register("guestPhone", {
                              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                                // Digits-only mask, capped at 10 chars.
                                const masked = e.target.value.replace(/\D/g, "").slice(0, 10)
                                if (masked !== e.target.value) {
                                  setValue("guestPhone", masked, { shouldValidate: false })
                                }
                              },
                            })}
                            className="w-full rounded-lg border border-(--gray-300) py-2 pl-10 pr-3 text-sm sm:py-3 sm:pl-12 sm:pr-4 sm:text-base"
                          />
                        </div>
                        {errors.guestPhone ? (
                          <p className="mt-1 text-xs text-rose-600">{errors.guestPhone.message}</p>
                        ) : null}
                      </div>

                      {/* Optional GSTIN for a business tax invoice on the platform fee */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-(--gray-600)">
                          GSTIN (optional — for a business invoice)
                        </label>
                        <Input
                          value={buyerGstin}
                          onChange={(e) => setBuyerGstin(e.target.value.toUpperCase())}
                          placeholder="e.g. 37ABCDE1234F1Z5"
                          maxLength={15}
                          className="w-full rounded-lg border border-(--gray-300) py-2 px-3 text-sm uppercase sm:py-3 sm:text-base"
                        />
                      </div>

                      {/* Send a copy to my email */}
                      <AnimatePresence>
                        {bookingFor === "other" ? (
                          <motion.label
                            key="send-copy"
                            initial={{ opacity: 0, y: -4, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -4, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="flex cursor-pointer items-start gap-3 overflow-hidden rounded-2xl border border-(--gray-200) bg-white p-4 transition-colors hover:border-(--brand-navy)/40"
                          >
                            <input
                              type="checkbox"
                              {...register("sendCopyToMe")}
                              className="mt-0.5 h-4 w-4 rounded border-(--gray-300) text-(--brand-navy) focus:ring-2 focus:ring-(--brand-navy)"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-sm font-semibold text-(--brand-navy)">
                                <Mail className="h-4 w-4" />
                                Send a copy to my email too
                              </div>
                              <p className="mt-0.5 text-xs text-(--gray-500)">
                                Confirmation will also be sent to{" "}
                                <span className="font-medium text-(--brand-navy)">{accountEmail || "your account email"}</span>
                              </p>
                            </div>
                          </motion.label>
                        ) : null}
                      </AnimatePresence>
                    </section>

                    {/* Booking */}
                    <section className="space-y-4">
                      <h3 className="border-b border-(--gray-200) pb-2 text-base font-semibold text-(--brand-navy) sm:text-lg">
                        Booking Details
                      </h3>

                      <div>
                        <p className="mb-2 block text-xs font-medium text-(--gray-700) sm:text-sm">
                          Tickets *{" "}
                          <span className="text-xs font-normal text-(--gray-400)">
                            (max {MAX_TICKETS_PER_ORDER} per booking)
                          </span>
                        </p>
                        <div className="space-y-2">
                          {tiers.map((tier) => {
                            const qty = lineQty[tier.id ?? ""] ?? 0
                            const price = Number(tier.price ?? 0)
                            return (
                              <div
                                key={tier.id ?? tier.name}
                                className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition ${
                                  qty > 0
                                    ? "border-(--brand-navy) bg-(--brand-navy)/5"
                                    : "border-(--gray-200) bg-(--gray-50)"
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-(--brand-navy)">{tier.name}</p>
                                  {tier.description ? (
                                    <p className="mt-0.5 truncate text-xs text-(--gray-500)">{tier.description}</p>
                                  ) : null}
                                  <p className="text-sm font-bold text-(--brand-navy)">
                                    {price === 0 ? "Free" : formatCurrency(price)}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => adjustLineQty(tier.id ?? "", -1)}
                                    disabled={qty === 0}
                                    aria-label={`Remove one ${tier.name} ticket`}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-(--gray-300) bg-white text-lg font-bold text-(--brand-navy) transition hover:border-(--brand-navy) disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    −
                                  </button>
                                  <span className="w-6 text-center text-sm font-bold text-(--brand-navy)" aria-live="polite">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => adjustLineQty(tier.id ?? "", 1)}
                                    disabled={totalQty >= MAX_TICKETS_PER_ORDER}
                                    aria-label={`Add one ${tier.name} ticket`}
                                    className="flex h-8 w-8 items-center justify-center rounded-full border border-(--gray-300) bg-white text-lg font-bold text-(--brand-navy) transition hover:border-(--brand-navy) disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </section>

                    {/* Order summary card */}
                    <div className="rounded-2xl border-2 border-(--brand-navy) bg-(--white) p-4 shadow-lg">
                      <h3 className="mb-4 text-center text-xl font-bold text-(--brand-navy)">Order Summary</h3>
                      {isFreeEvent ? (
                        <div className="py-2 text-center">
                          <span className="text-3xl font-bold text-emerald-600">Free</span>
                          <p className="mt-1 text-sm text-(--gray-500)">No charges — this is a free booking</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {lines.map((line) => (
                            <div key={line.tier.id ?? line.tier.name} className="flex items-center justify-between text-sm">
                              <span className="text-(--gray-600)">
                                {line.tier.name} ({formatCurrency(Number(line.tier.price ?? 0))} × {line.qty})
                              </span>
                              <span className="font-medium text-(--gray-800)">
                                {formatCurrency(Number(line.tier.price ?? 0) * line.qty)}
                              </span>
                            </div>
                          ))}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-(--gray-600)">Platform Fee (₹10 × {totalQty})</span>
                            <span className="font-medium text-(--gray-800)">+ {formatCurrency(platformFee)}</span>
                          </div>
                          {gatewayBearer === "customer" ? (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-(--gray-600)">Payment gateway fee</span>
                              <span className="font-medium text-(--gray-800)">+ {formatCurrency(gatewayFee)}</span>
                            </div>
                          ) : null}
                          <div className="my-3 border-t-2 border-dashed border-(--gray-300)" />
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-semibold text-(--brand-navy)">Total Amount</span>
                            <span className="text-2xl font-bold text-(--brand-navy)">{formatCurrency(totalAmount)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Terms */}
                    <label className="flex cursor-pointer items-start space-x-3">
                      <input
                        type="checkbox"
                        {...register("termsAccepted")}
                        className="mt-0.5 h-4 w-4 rounded border-(--gray-300) text-(--brand-navy) focus:ring-2 focus:ring-(--brand-navy) sm:h-5 sm:w-5"
                      />
                      <span className="text-xs text-(--gray-700) sm:text-sm">
                        I accept the{" "}
                        <TermsDialog>
                          <button
                            type="button"
                            className="font-medium text-(--brand-navy) underline-offset-2 hover:underline"
                          >
                            terms and conditions
                          </button>
                        </TermsDialog>
                      </span>
                    </label>
                    {errors.termsAccepted ? (
                      <p className="-mt-3 text-xs text-rose-600">{errors.termsAccepted.message}</p>
                    ) : null}

                    <div role="status" aria-live="polite">
                      {verifyingPayment ? (
                        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                          Payment received — confirming your ticket, don&apos;t close this page...
                        </p>
                      ) : checkoutError ? (
                        <p
                          ref={checkoutErrorRef}
                          className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700"
                        >
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{checkoutError}</span>
                        </p>
                      ) : checkoutSuccess ? (
                        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                          {checkoutSuccess}
                        </p>
                      ) : null}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={checkoutLoading || verifyingPayment || !tiers.length || totalQty === 0}
                      className="w-full rounded-xl bg-(--brand-navy) px-4 py-3 text-base font-semibold text-(--white) shadow-lg transition-all hover:bg-[#0A172C] hover:shadow-xl disabled:opacity-60 sm:px-6 sm:py-4 sm:text-lg"
                    >
                      {verifyingPayment
                        ? "Confirming..."
                        : checkoutLoading
                          ? "Processing..."
                          : isFreeEvent
                            ? "Get Free Ticket"
                            : "Pay Now"}
                    </motion.button>
                  </form>
                </div>
              </motion.div>

              {/* Fog overlay + login card */}
              <AnimatePresence>
                {!isLoggedIn ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 z-20 flex items-center justify-center rounded-3xl"
                  >
                    {/* Extra fog layers */}
                    <div className="absolute inset-0 rounded-3xl bg-white/30 backdrop-blur-2xl" />
                    <div className="absolute inset-0 rounded-3xl bg-linear-to-br from-white/30 via-white/10 to-white/40" />

                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="relative mx-4 w-full max-w-md rounded-3xl border border-white/30 bg-white/95 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] backdrop-blur-2xl"
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-(--brand-navy) text-white shadow-lg shadow-(--brand-navy)/30">
                        <Lock className="h-6 w-6" />
                      </div>
                      <p className="mt-5 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
                        Login required
                      </p>
                      <h3 className="mt-2 text-center font-bricolage text-2xl font-bold text-slate-900">
                        Sign in to checkout
                      </h3>
                      <p className="mt-2 text-center text-sm text-slate-600">
                        Securely complete your booking for{" "}
                        <span className="font-semibold text-slate-800">{event.title}</span>.
                      </p>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          onClick={() => openBookingAuthModal("login")}
                          className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50"
                        >
                          <LogIn className="mr-2 h-4 w-4" />
                          Login
                        </Button>
                        <Button
                          type="button"
                          onClick={() => openBookingAuthModal("register")}
                          className="rounded-xl bg-(--brand-navy) text-white hover:bg-(--brand-navy)/90"
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Register
                        </Button>
                      </div>

                      <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-500">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                        Your information is encrypted end-to-end.
                      </div>
                    </motion.div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
