"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { CITY_SUGGESTIONS } from "@/lib/talent"

/** The cities a performer works in are stored in one text field, joined like this. */
export const CITY_SEPARATOR = " · "

export const splitCities = (value: string | null | undefined): string[] =>
  (value ?? "")
    .split(CITY_SEPARATOR)
    .map((c) => c.trim())
    .filter(Boolean)

export const joinCities = (cities: string[]): string => cities.join(CITY_SEPARATOR)

/**
 * "Cities you perform in": add as many as you work in. Each one shows as a chip
 * you can remove. Suggestions help with the common ones; any city can be typed.
 */
export function CityChips({
  value,
  onChange,
  inputClass,
}: {
  value: string
  onChange: (next: string) => void
  inputClass: string
}) {
  const cities = splitCities(value)
  const [text, setText] = useState("")

  const add = (raw: string) => {
    const city = raw.trim()
    if (city.length < 2) return
    if (cities.some((c) => c.toLowerCase() === city.toLowerCase())) {
      setText("")
      return
    }
    onChange(joinCities([...cities, city]))
    setText("")
  }

  const remove = (city: string) => onChange(joinCities(cities.filter((c) => c !== city)))

  return (
    <div>
      {cities.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-2">
          {cities.map((city) => (
            <li
              key={city}
              className="inline-flex items-center gap-1.5 rounded-full border border-(--gold-bar-border) bg-(--gold-bar-bg) py-1.5 pl-3.5 pr-2 font-albert text-sm font-medium text-(--brand-navy)"
            >
              {city}
              <button
                type="button"
                onClick={() => remove(city)}
                aria-label={`Remove ${city}`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-(--gray-500) hover:bg-white hover:text-(--brand-navy)"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <input
          className={`${inputClass} min-w-0 flex-1`}
          list="talent-city-suggestions"
          placeholder={cities.length > 0 ? "Add another city" : "Start typing your city"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              add(text)
            }
          }}
          onBlur={() => add(text)}
        />
        <button
          type="button"
          onClick={() => add(text)}
          className="mt-2 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-(--gold-bar-border) px-4 font-poppins text-sm font-semibold text-(--brand-navy) transition hover:border-(--gold)"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add
        </button>
      </div>
      <datalist id="talent-city-suggestions">
        {CITY_SUGGESTIONS.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  )
}
