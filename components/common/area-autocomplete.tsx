"use client"

import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { MapPin } from "lucide-react"
import { searchAreas, type LocationResult } from "@/lib/api/locations"

interface AreaAutocompleteProps {
  /** Current display value (e.g. the saved "Area, City, State - Pincode"). */
  value?: string
  /** Called when the user picks a place. */
  onSelect: (loc: LocationResult) => void
  placeholder?: string
  className?: string
}

/** Shortest query we'll send to the server. */
const MIN_QUERY = 3

// Area/city-name-only picker (min 3 chars) — no pincode typing. Used for
// event creation, where the organizer names the venue's area by hand and
// precise geolocation is the separate Google Maps URL field's job, so the
// "type a pincode to page through every area under it" behaviour that
// LocationAutocomplete offers isn't needed here.
export function AreaAutocomplete({
  value,
  onSelect,
  placeholder = "Search area or city",
  className = "",
}: AreaAutocompleteProps) {
  const [text, setText] = useState(value ?? "")
  // Results are stored together with the query they belong to, so "is this
  // list stale?" is a comparison rather than a second piece of state kept in
  // sync by hand. That makes `searching` derivable and keeps the fetch effect
  // free of synchronous setState.
  const [data, setData] = useState<{ query: string; items: LocationResult[] }>({
    query: "",
    items: [],
  })
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  // Mirror the `value` prop into the editable text when the parent changes it.
  // This is React's documented "adjust state during render" pattern: an effect
  // would render once with the stale text first, and re-running it on every
  // parent render would stomp on what the user is typing.
  const [syncedValue, setSyncedValue] = useState(value)
  if (value !== syncedValue) {
    setSyncedValue(value)
    setText(value ?? "")
  }

  const query = text.trim()
  const active = query.length >= MIN_QUERY
  // Derived, not stored: we're searching whenever the loaded list belongs to a
  // different query than the one currently typed.
  const searching = active && data.query !== query
  const results = data.query === query ? data.items : []

  useEffect(() => {
    if (!active) return
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const items = await searchAreas(query)
        if (!cancelled) setData({ query, items })
      } catch {
        if (!cancelled) setData({ query, items: [] })
      }
    }, 250)
    return () => {
      // `cancelled` also discards a response that lands after the query moved
      // on, which clearTimeout alone can't do once the request is in flight.
      cancelled = true
      clearTimeout(t)
    }
  }, [query, active])

  useEffect(() => {
    if (!open) return
    const reposition = () => {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setCoords({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    reposition()
    window.addEventListener("scroll", reposition, true)
    window.addEventListener("resize", reposition)
    return () => {
      window.removeEventListener("scroll", reposition, true)
      window.removeEventListener("resize", reposition)
    }
  }, [open])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (anchorRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const showMenu = open && active

  // `coords` is only ever set from an effect, so it stays null during SSR —
  // which is what keeps createPortal off the server render. No separate
  // "mounted" flag needed.
  const menu = showMenu && coords ? (
    <div
      ref={menuRef}
      id={listboxId}
      role="listbox"
      style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
      className="z-[100] max-h-80 overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
    >
      {searching ? (
        <p className="px-3 py-2 text-xs text-slate-400">Searching…</p>
      ) : results.length === 0 ? (
        <p className="px-3 py-2 text-xs text-slate-400">No matches — keep typing</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              role="option"
              aria-selected={r.label === text}
              onClick={() => {
                onSelect(r)
                setText(r.label)
                setOpen(false)
              }}
              className="block w-full px-3 py-2.5 text-left text-sm leading-snug text-slate-700 hover:bg-slate-50"
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null

  return (
    <div ref={anchorRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          name="baatasari-area-search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showMenu}
          aria-controls={listboxId}
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          className="w-full bg-transparent py-2.5 text-sm text-slate-900 outline-none"
        />
      </div>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  )
}
