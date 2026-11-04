/**
 * "Add to calendar" for an event: a Google Calendar link and a downloadable
 * .ics file (which Apple Calendar, Outlook and Google all open). Times are
 * India time; the event date is stored as a timestamp and the start and end
 * time as text such as "7:30 PM".
 */

export type CalendarEvent = {
  title: string
  description?: string | null
  venue?: string | null
  date: string
  endDate?: string | null
  startTime?: string | null
  endTime?: string | null
  url?: string
}

const IST_MINUTES = 330

// "7:00 PM" / "19:00" → minutes since midnight (null if unparseable).
const minutesOf = (t: string | null | undefined): number | null => {
  if (!t) return null
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!m) return null
  let h = Number(m[1])
  const min = Number(m[2])
  const meridiem = m[3]?.toUpperCase()
  if (meridiem === "PM" && h < 12) h += 12
  if (meridiem === "AM" && h === 12) h = 0
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

// The calendar day (y, m, d) of an instant, in India.
const istDay = (iso: string): { y: number; m: number; d: number } | null => {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return null
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dt)
  const num = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { y: num("year"), m: num("month"), d: num("day") }
}

const pad = (n: number) => String(n).padStart(2, "0")
const stamp = (dt: Date) =>
  `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00Z`
const dayStamp = (y: number, m: number, d: number) => `${y}${pad(m)}${pad(d)}`

/** UTC start and end of the event; null when the date cannot be read. */
export function eventWindow(e: CalendarEvent): { start: Date; end: Date; allDay: boolean } | null {
  const day = istDay(e.date)
  if (!day) return null
  const startMin = minutesOf(e.startTime)
  const endDay = istDay(e.endDate ?? e.date) ?? day
  if (startMin === null) {
    const start = new Date(Date.UTC(day.y, day.m - 1, day.d))
    const end = new Date(Date.UTC(endDay.y, endDay.m - 1, endDay.d + 1))
    return { start, end, allDay: true }
  }
  const start = new Date(Date.UTC(day.y, day.m - 1, day.d, 0, startMin - IST_MINUTES))
  const endMin = minutesOf(e.endTime)
  let end: Date
  if (endMin !== null) {
    end = new Date(Date.UTC(endDay.y, endDay.m - 1, endDay.d, 0, endMin - IST_MINUTES))
    if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
  } else {
    end = new Date(start.getTime() + 3 * 60 * 60 * 1000)
  }
  return { start, end, allDay: false }
}

export function googleCalendarUrl(e: CalendarEvent): string | null {
  const w = eventWindow(e)
  if (!w) return null
  const dates = w.allDay
    ? `${dayStamp(w.start.getUTCFullYear(), w.start.getUTCMonth() + 1, w.start.getUTCDate())}/${dayStamp(
        w.end.getUTCFullYear(),
        w.end.getUTCMonth() + 1,
        w.end.getUTCDate(),
      )}`
    : `${stamp(w.start)}/${stamp(w.end)}`
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates,
    details: [e.url, (e.description ?? "").slice(0, 400)].filter(Boolean).join("\n\n"),
    location: e.venue ?? "",
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

const escapeIcs = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;")

export function buildIcs(e: CalendarEvent): string | null {
  const w = eventWindow(e)
  if (!w) return null
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Baatasari//Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${stamp(w.start)}-${Math.abs(hash(e.title))}@baatasari.com`,
    `DTSTAMP:${stamp(new Date())}`,
    w.allDay
      ? `DTSTART;VALUE=DATE:${dayStamp(w.start.getUTCFullYear(), w.start.getUTCMonth() + 1, w.start.getUTCDate())}`
      : `DTSTART:${stamp(w.start)}`,
    w.allDay
      ? `DTEND;VALUE=DATE:${dayStamp(w.end.getUTCFullYear(), w.end.getUTCMonth() + 1, w.end.getUTCDate())}`
      : `DTEND:${stamp(w.end)}`,
    `SUMMARY:${escapeIcs(e.title)}`,
    e.venue ? `LOCATION:${escapeIcs(e.venue)}` : "",
    e.description || e.url ? `DESCRIPTION:${escapeIcs([e.url, (e.description ?? "").slice(0, 400)].filter(Boolean).join("\n\n"))}` : "",
    e.url ? `URL:${e.url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean)
  return lines.join("\r\n")
}

const hash = (s: string): number => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}
