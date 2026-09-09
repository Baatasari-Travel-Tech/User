"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, ShieldAlert } from "lucide-react"

import { apiRequest } from "@/lib/api/client"
import type { OrganizerAnalytics } from "@/types/api"

// Indian-format short money, e.g. 1850000 -> "₹18.5L".
const inLakhs = (n: number) => `₹${(n / 100000).toFixed(1)}L`

// J2 — GST registration threshold notice. Renders an advisory banner as the
// organizer approaches ₹20L FY turnover, and a hard "sales paused" banner once
// they cross it without a GSTIN. Self-fetches the analytics payload; renders
// nothing when there's nothing to show.
export function GstThresholdBanner() {
  const { data } = useQuery<OrganizerAnalytics, Error>({
    queryKey: ["organizer-analytics"],
    queryFn: async () => {
      const response = await apiRequest<{ data: { analytics: OrganizerAnalytics } }>(
        "/organizer/analytics",
        { auth: true }
      )
      return response.data.analytics
    },
  })

  const gst = data?.gstThreshold
  if (!gst || gst.stage === "ok") return null

  if (gst.stage === "blocked") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
        <div className="text-sm">
          <p className="font-semibold text-rose-800">
            New ticket sales and event publishing are paused
          </p>
          <p className="mt-1 text-rose-700">
            Your Baatasari sales this financial year ({inLakhs(gst.turnover)}) have
            crossed the ₹20&nbsp;lakh GST registration threshold. Add your GSTIN to
            resume selling — existing tickets are unaffected.{" "}
            <Link href="/organizer/profile" className="font-semibold underline">
              Add GSTIN
            </Link>
          </p>
          <p className="mt-1 text-xs text-rose-500">
            This is a turnover reminder based on Baatasari sales only, not tax advice.
          </p>
        </div>
      </div>
    )
  }

  // approaching
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div className="text-sm">
        <p className="font-semibold text-amber-800">
          You’re approaching the ₹20&nbsp;lakh GST registration threshold
        </p>
        <p className="mt-1 text-amber-700">
          Your Baatasari sales this financial year are {inLakhs(gst.turnover)} of
          ₹20&nbsp;lakh. Once you cross it, new sales pause until you register a
          GSTIN. Add it now to avoid interruption.{" "}
          <Link href="/organizer/profile" className="font-semibold underline">
            Add GSTIN
          </Link>
        </p>
        <p className="mt-1 text-xs text-amber-600">
          Advisory reminder based on Baatasari sales only, not tax advice.
        </p>
      </div>
    </div>
  )
}
