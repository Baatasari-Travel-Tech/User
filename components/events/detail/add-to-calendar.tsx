"use client"

import { useState } from "react"
import { CalendarPlus } from "lucide-react"
import { buildIcs, googleCalendarUrl, type CalendarEvent } from "@/lib/calendar"

/** "+ Add to calendar": opens two choices, Google Calendar or a .ics file. */
export function AddToCalendar({ event, className = "" }: { event: CalendarEvent; className?: string }) {
  const [open, setOpen] = useState(false)
  const google = googleCalendarUrl(event)
  if (!google) return null

  const download = () => {
    const ics = buildIcs(event)
    if (!ics) return
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `${event.title.replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "event"}.ics`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className={`text-center ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--brand-navy) hover:underline"
      >
        <CalendarPlus className="h-4 w-4" aria-hidden /> Add to calendar
      </button>
      {open ? (
        <div className="mt-2 flex items-center justify-center gap-3 text-sm">
          <a
            href={google}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-(--gray-200) bg-white px-4 py-1.5 font-semibold text-(--brand-navy) hover:border-(--brand-navy)"
          >
            Google Calendar
          </a>
          <button
            type="button"
            onClick={download}
            className="rounded-full border border-(--gray-200) bg-white px-4 py-1.5 font-semibold text-(--brand-navy) hover:border-(--brand-navy)"
          >
            Download .ics
          </button>
        </div>
      ) : null}
    </div>
  )
}
