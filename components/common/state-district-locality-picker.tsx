"use client"

import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { MapPin } from "lucide-react"
import { listStates, listDistricts, searchLocalities, type LocationResult } from "@/lib/api/locations"

interface StateDistrictLocalityPickerProps {
  /** Prefill for a returning draft — shown until the user changes a step. */
  initialState?: string
  initialDistrict?: string
  initialLocalityLabel?: string
  /** Fires only once a locality is actually picked — state/district alone never commit. */
  onSelect: (loc: LocationResult) => void
  className?: string
}

const selectClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-900 focus:outline-none focus:ring-4 focus:ring-brand-900/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"

// Three cascading steps — State (full list) -> District (full list, scoped to
// state) -> Area (text search, scoped to state+district; also matches by
// pincode). Every step's list is bounded by the step before it, so nothing
// ever floods the dropdown
// the way a nationwide area-name search would.
export function StateDistrictLocalityPicker({
  initialState = "",
  initialDistrict = "",
  initialLocalityLabel = "",
  onSelect,
  className = "",
}: StateDistrictLocalityPickerProps) {
  const [states, setStates] = useState<string[]>([])
  const [statesLoading, setStatesLoading] = useState(true)
  const [state, setState] = useState(initialState)

  const [districtData, setDistrictData] = useState<{ forState: string; items: string[] }>({
    forState: "",
    items: [],
  })
  const [district, setDistrict] = useState(initialDistrict)
  const [localityData, setLocalityData] = useState<{ key: string; items: LocationResult[] }>({
    key: "",
    items: [],
  })

  const [localityText, setLocalityText] = useState(initialLocalityLabel)
  const [localityOpen, setLocalityOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  useEffect(() => {
    let active = true
    listStates()
      .then((s) => {
        if (active) setStates(s)
      })
      .finally(() => {
        if (active) setStatesLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Districts are stored together with the state they were fetched for, so an
  // empty list for a cleared state is derived rather than written back by an
  // effect. Same trick as the locality search below.
  useEffect(() => {
    if (!state) return
    let active = true
    listDistricts(state)
      .then((d) => {
        if (active) setDistrictData({ forState: state, items: d })
      })
      .catch(() => {
        if (active) setDistrictData({ forState: state, items: [] })
      })
    return () => {
      active = false
    }
  }, [state])

  const districts = districtData.forState === state ? districtData.items : []
  const districtsLoading = Boolean(state) && districtData.forState !== state

  const localityQuery = localityText.trim()
  const localityActive = Boolean(state) && Boolean(district) && localityQuery.length >= 1
  // Key the cached results by everything that defines them, so a stale list is
  // a mismatch rather than something an effect has to clear.
  const localityKey = `${state}|${district}|${localityQuery}`
  const localityResults = localityData.key === localityKey ? localityData.items : []
  const localityLoading = localityActive && localityData.key !== localityKey

  useEffect(() => {
    if (!localityActive) return
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const items = await searchLocalities(state, district, localityQuery)
        if (!cancelled) setLocalityData({ key: localityKey, items })
      } catch {
        if (!cancelled) setLocalityData({ key: localityKey, items: [] })
      }
    }, 250)
    return () => {
      // Also discards a response that lands after the query moved on, which
      // clearTimeout alone can't do once the request is in flight.
      cancelled = true
      clearTimeout(t)
    }
  }, [localityActive, localityKey, state, district, localityQuery])

  useEffect(() => {
    if (!localityOpen) return
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
  }, [localityOpen])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (anchorRef.current?.contains(target)) return
      if (menuRef.current?.contains(target)) return
      setLocalityOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const showMenu = localityOpen && localityActive

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
      {localityLoading ? (
        <p className="px-3 py-2 text-xs text-slate-400">Searching…</p>
      ) : localityResults.length === 0 ? (
        <p className="px-3 py-2 text-xs text-slate-400">No matches — keep typing</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {localityResults.map((r) => (
            <button
              key={r.id}
              type="button"
              role="option"
              aria-selected={r.label === localityText}
              onClick={() => {
                onSelect(r)
                setLocalityText(r.label)
                setLocalityOpen(false)
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
    <div className={className}>
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          value={state}
          disabled={statesLoading}
          onChange={(e) => {
            setState(e.target.value)
            setDistrict("")
            setLocalityText("")
          }}
          className={selectClass}
        >
          <option value="">{statesLoading ? "Loading states…" : "Select state"}</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={district}
          disabled={!state || districtsLoading}
          onChange={(e) => {
            setDistrict(e.target.value)
            setLocalityText("")
          }}
          className={selectClass}
        >
          <option value="">
            {!state ? "Select state first" : districtsLoading ? "Loading districts…" : "Select district"}
          </option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div ref={anchorRef} className="relative mt-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 has-disabled:bg-slate-50">
          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={localityText}
            disabled={!district}
            onChange={(e) => {
              setLocalityText(e.target.value)
              setLocalityOpen(true)
            }}
            onFocus={() => setLocalityOpen(true)}
            placeholder={district ? "Search area or pincode" : "Select district first"}
            name="baatasari-locality-search"
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
            className="w-full bg-transparent py-2.5 text-sm text-slate-900 outline-none disabled:cursor-not-allowed disabled:text-slate-400"
          />
        </div>
        {menu ? createPortal(menu, document.body) : null}
      </div>
    </div>
  )
}
