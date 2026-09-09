"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Heart } from "lucide-react"
import { useAuth } from "@/app/providers"
import {
  type PreferenceCategory,
  type Preferences,
  PREFERENCE_OPTIONS,
  TAB_TITLES,
  CATEGORY_ORDER,
  MIN_REQUIRED,
} from "@/lib/preferences-data"
import { SectionHeader } from "../field-primitives"

export function PreferencesSection() {
  const { userPreferences, updateUserPreferences, isLoadingPreferences } = useAuth()

  const [prefs, setPrefs] = useState<Preferences>({
    travel: [],
    interests: [],
    food: [],
    emotional: [],
    logistics: [],
  })
  const [prefSaving, setPrefSaving] = useState(false)
  const [prefMsg, setPrefMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  // Load the saved preferences into the editable copy whenever the server
  // hands us a new object. React's "adjust state during render" pattern — an
  // effect would paint one frame with the stale (empty) selection first.
  const [syncedFrom, setSyncedFrom] = useState(userPreferences)
  if (userPreferences && userPreferences !== syncedFrom) {
    setSyncedFrom(userPreferences)
    setPrefs({
      travel: userPreferences.travel ?? [],
      interests: userPreferences.interests ?? [],
      food: userPreferences.food ?? [],
      emotional: userPreferences.emotional ?? [],
      logistics: userPreferences.logistics ?? [],
    })
  }

  const togglePref = (cat: PreferenceCategory, opt: string) => {
    setPrefMsg(null)
    setPrefs((prev) => {
      const current = prev[cat]
      return {
        ...prev,
        [cat]: current.includes(opt) ? current.filter((x) => x !== opt) : [...current, opt],
      }
    })
  }

  const prefCompletion = useMemo(() => {
    const map = {} as Record<PreferenceCategory, { count: number; done: boolean }>
    for (const c of CATEGORY_ORDER) {
      const count = prefs[c].length
      map[c] = { count, done: count >= MIN_REQUIRED }
    }
    return map
  }, [prefs])

  const prefDone = useMemo(
    () => CATEGORY_ORDER.filter((c) => prefCompletion[c].done).length,
    [prefCompletion],
  )
  const prefPercent = Math.round((prefDone / CATEGORY_ORDER.length) * 100)

  const savePrefs = async () => {
    setPrefMsg(null)
    setPrefSaving(true)
    try {
      await updateUserPreferences(prefs)
      setPrefMsg({ type: "ok", text: "Preferences saved." })
    } catch (e) {
      setPrefMsg({
        type: "err",
        text: e instanceof Error ? e.message : "Could not save preferences.",
      })
    } finally {
      setPrefSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={Heart}
        title="Preferences"
        subtitle="Tell us what you love. We'll surface events you'll actually enjoy."
      />

      {/* Overall progress */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Overall progress
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-900">
              {prefDone} of {CATEGORY_ORDER.length} sections complete
            </p>
          </div>
          <span className="font-bricolage text-2xl font-bold text-(--brand-navy)">
            {prefPercent}%
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-linear-to-r from-(--brand-blue) via-(--brand-navy) to-emerald-500 transition-[width] duration-700"
            style={{ width: `${prefPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Pick at least {MIN_REQUIRED} per section.
        </p>
      </div>

      {/* Category sections */}
      {CATEGORY_ORDER.map((cat) => {
        const { count, done } = prefCompletion[cat]
        const options = PREFERENCE_OPTIONS[cat]
        return (
          <div
            key={cat}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-bricolage text-base font-bold text-slate-900 md:text-lg">
                  {TAB_TITLES[cat]}
                </h4>
                <p className="mt-0.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{count}</span>
                  <span>
                    {" "}
                    / {options.length} picked
                  </span>
                  <span className="ml-1 text-slate-400">· need {MIN_REQUIRED}</span>
                </p>
              </div>
              {done ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Done
                </span>
              ) : count > 0 ? (
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  In progress
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Get started
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {options.map((opt) => {
                const selected = prefs[cat].includes(opt)
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => togglePref(cat, opt)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition md:text-sm ${
                      selected
                        ? "border-(--brand-navy) bg-(--brand-navy) text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {selected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Save footer */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center md:p-6">
        <div className="min-w-0 text-xs text-slate-600 sm:text-sm">
          {prefMsg ? (
            prefMsg.type === "ok" ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {prefMsg.text}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium text-rose-600">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {prefMsg.text}
              </span>
            )
          ) : isLoadingPreferences ? (
            <span className="text-slate-500">Loading your preferences…</span>
          ) : prefDone === CATEGORY_ORDER.length ? (
            <span>All sections complete. Save to update your recommendations.</span>
          ) : (
            <span>
              {prefDone} of {CATEGORY_ORDER.length} sections complete.
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={savePrefs}
          disabled={prefSaving || isLoadingPreferences}
          className="w-full rounded-full bg-(--brand-navy) px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-(--brand-navy)/20 transition hover:bg-(--brand-navy)/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {prefSaving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </div>
  )
}
