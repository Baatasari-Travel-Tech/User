"use client"

import { X } from "lucide-react"
import { LocationAutocomplete } from "@/components/common/location-autocomplete"

/** The cities a performer works in are stored in one text field, joined like this. */
export const CITY_SEPARATOR = " · "

export const splitCities = (value: string | null | undefined): string[] =>
  (value ?? "")
    .split(CITY_SEPARATOR)
    .map((c) => c.trim())
    .filter(Boolean)

export const joinCities = (cities: string[]): string => cities.join(CITY_SEPARATOR)

/**
 * "Cities you perform in": start typing a city and pick it from the dropdown
 * (cities of India, with the state). Each pick becomes a chip you can remove, so
 * a performer can work in as many cities as they like.
 */
export function CityChips({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const cities = splitCities(value)

  const add = (city: string) => {
    if (!city.trim()) return
    if (cities.some((c) => c.toLowerCase() === city.toLowerCase())) return
    onChange(joinCities([...cities, city]))
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
      <LocationAutocomplete
        variant="city"
        clearOnSelect
        placeholder={cities.length > 0 ? "Add another city" : "Type a city and pick it from the list"}
        onSelect={(r) => add(r.label)}
      />
    </div>
  )
}
