"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, XCircle, Camera, CameraOff, ArrowLeft, KeyRound } from "lucide-react"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { apiRequest } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// ── Minimal types for the native BarcodeDetector (not yet in lib.dom) ──────
type DetectedBarcode = { rawValue: string }
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike

type ValidateResult = {
  valid: boolean
  reason?: string | null
  attendeeName?: string
  tier?: string | null
  quantity?: number
  checkedInCount?: number
  remaining?: number
}
type AdmitResult = {
  admitted: boolean
  reason?: string | null
  attendeeName?: string
  tier?: string | null
  admittedCount?: number
  checkedInCount?: number
  quantity?: number
  fullyAdmitted?: boolean
}
type Stats = { admitted: number; total: number; percent: number }

const REASON_TEXT: Record<string, string> = {
  NOT_FOUND: "Ticket not found for this event",
  REFUNDED: "Ticket was refunded / voided",
  ALREADY_CHECKED_IN: "Already fully checked in",
  OVER_ADMIT: "No remaining admissions on this ticket",
}

const beep = (ok: boolean) => {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    osc.frequency.value = ok ? 880 : 200
    osc.connect(ctx.destination)
    osc.start()
    setTimeout(() => {
      osc.stop()
      void ctx.close()
    }, ok ? 110 : 240)
  } catch {
    /* audio optional */
  }
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(ok ? 60 : [80, 40, 80])
  }
}

function ScannerContent() {
  const params = useParams<{ id: string }>()
  const eventId = params.id

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastScanRef = useRef<{ value: string; at: number } | null>(null)

  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [validate, setValidate] = useState<ValidateResult | null>(null)
  const [lastToken, setLastToken] = useState<string | null>(null)
  const [admit, setAdmit] = useState<AdmitResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [manualCode, setManualCode] = useState("")
  const [stats, setStats] = useState<Stats | null>(null)

  const supported =
    typeof window !== "undefined" &&
    "BarcodeDetector" in window

  const refreshStats = useCallback(async () => {
    try {
      const res = await apiRequest<{ data: { stats: Stats } }>(
        `/organizer/events/${eventId}/checkin/stats`,
        { auth: true },
      )
      setStats(res.data.stats)
    } catch {
      /* non-fatal */
    }
  }, [eventId])

  // Load the check-in counters when the scanner opens.
  //
  // refreshStats() sets state after an await, which trips
  // react-hooks/set-state-in-effect. The rule is aimed at state derived from
  // other state during an effect; this is a network read of something that
  // lives on the server, which is exactly what an effect is for. There is no
  // event to hang it from — the trigger is "the scanner is now on screen".
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshStats()
  }, [refreshStats])

  // Validate a scanned/typed value (read-only — shows the card before admit).
  const runValidate = useCallback(
    async (payload: { token?: string; code?: string }) => {
      setBusy(true)
      setAdmit(null)
      try {
        const res = await apiRequest<{ data: { result: ValidateResult } }>(
          `/organizer/events/${eventId}/checkin/validate`,
          { method: "POST", auth: true, body: JSON.stringify(payload) },
        )
        const result = res.data.result
        setValidate(result)
        setLastToken(payload.token ?? null)
        beep(result.valid)
      } catch (err) {
        setValidate({ valid: false, reason: "NOT_FOUND" })
        setCameraError(err instanceof Error ? err.message : null)
        beep(false)
      } finally {
        setBusy(false)
      }
    },
    [eventId],
  )

  const handleScanned = useCallback(
    (value: string) => {
      const now = Date.now()
      // Debounce: ignore the same QR re-detected within 2.5s.
      if (
        lastScanRef.current &&
        lastScanRef.current.value === value &&
        now - lastScanRef.current.at < 2500
      ) {
        return
      }
      lastScanRef.current = { value, at: now }
      void runValidate({ token: value })
    },
    [runValidate],
  )

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    if (!supported) {
      setCameraError("Live scanning isn't supported on this browser. Use manual entry below (works everywhere).")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)

      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
      const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null

      const tick = async () => {
        const video = videoRef.current
        if (detector && video && video.readyState >= 2) {
          try {
            const codes = await detector.detect(video)
            if (codes.length > 0 && codes[0].rawValue) {
              handleScanned(codes[0].rawValue)
            }
          } catch {
            /* transient decode error — keep looping */
          }
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      setCameraError("Couldn't access the camera. Check permissions, or use manual entry below.")
      setScanning(false)
    }
  }, [supported, handleScanned])

  useEffect(() => stopCamera, [stopCamera])

  const handleAdmit = async () => {
    if (busy) return
    setBusy(true)
    try {
      const body: { token?: string; code?: string } = lastToken
        ? { token: lastToken }
        : { code: manualCode.trim() }
      const res = await apiRequest<{ data: { result: AdmitResult } }>(
        `/organizer/events/${eventId}/checkin/admit`,
        { method: "POST", auth: true, body: JSON.stringify(body) },
      )
      const result = res.data.result
      setAdmit(result)
      beep(result.admitted)
      void refreshStats()
    } catch (err) {
      setAdmit({ admitted: false, reason: err instanceof Error ? err.message : "NOT_FOUND" })
      beep(false)
    } finally {
      setBusy(false)
    }
  }

  const handleManualValidate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    setLastToken(null)
    void runValidate({ code: manualCode.trim() })
  }

  const showAdmitButton =
    validate?.valid && !admit?.admitted && (validate.remaining ?? 0) > 0

  return (
    <div className="mx-auto w-full max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/organizer/analytics?eventId=${encodeURIComponent(eventId)}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        {stats ? (
          <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
            {stats.admitted} / {stats.total} admitted
          </span>
        ) : null}
      </div>

      <h1 className="mb-1 text-xl font-bold text-slate-900">Door check-in</h1>
      <p className="mb-4 text-sm text-slate-500">Point the camera at the ticket QR, or type the code.</p>

      {/* Camera */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 aspect-square">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {!scanning ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/80 text-white">
            <Camera className="h-10 w-10 opacity-80" />
            <Button onClick={() => void startCamera()} className="rounded-full">
              Start camera
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={stopCamera}
            className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white"
          >
            <CameraOff className="h-3.5 w-3.5" /> Stop
          </button>
        )}
        {/* scan frame */}
        {scanning ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-2/3 w-2/3 rounded-2xl border-4 border-white/70" />
          </div>
        ) : null}
      </div>

      {cameraError ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {cameraError}
        </p>
      ) : null}

      {/* Result card */}
      {validate ? (
        <div
          className={`mt-4 rounded-2xl border p-4 ${
            admit?.admitted
              ? "border-emerald-300 bg-emerald-50"
              : validate.valid
                ? "border-emerald-200 bg-emerald-50/60"
                : "border-rose-300 bg-rose-50"
          }`}
        >
          <div className="flex items-start gap-3">
            {validate.valid ? (
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" />
            )}
            <div className="min-w-0 flex-1">
              {validate.valid ? (
                <>
                  <p className="font-semibold text-slate-900">{validate.attendeeName ?? "Attendee"}</p>
                  <p className="text-sm text-slate-600">
                    {validate.tier ?? "Ticket"} ·{" "}
                    {admit?.admitted
                      ? `${admit.checkedInCount} of ${admit.quantity} admitted`
                      : `${validate.checkedInCount} of ${validate.quantity} admitted`}
                  </p>
                  {admit?.admitted ? (
                    <p className="mt-1 text-sm font-semibold text-emerald-700">
                      ✓ Admitted{admit.admittedCount && admit.admittedCount > 1 ? ` ${admit.admittedCount}` : ""}
                      {admit.fullyAdmitted ? " — fully checked in" : ""}
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="font-semibold text-rose-800">Rejected</p>
                  <p className="text-sm text-rose-700">
                    {REASON_TEXT[validate.reason ?? "NOT_FOUND"] ?? "Invalid ticket"}
                  </p>
                </>
              )}
            </div>
          </div>

          {showAdmitButton ? (
            <Button
              onClick={() => void handleAdmit()}
              disabled={busy}
              className="mt-3 w-full rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {busy
                ? "Admitting…"
                : (validate.remaining ?? 1) > 1
                  ? `Admit all ${validate.remaining}`
                  : "Admit"}
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Manual entry */}
      <form onSubmit={handleManualValidate} className="mt-5">
        <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <KeyRound className="h-4 w-4" /> Manual ticket code
        </label>
        <div className="flex gap-2">
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="BT-XXXXXXXXXX"
            className="flex-1"
          />
          <Button type="submit" variant="outline" disabled={busy || !manualCode.trim()} className="rounded-full">
            Check
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function ScanPage() {
  return (
    <ProtectedRoute requireOrganizer>
      <ScannerContent />
    </ProtectedRoute>
  )
}
