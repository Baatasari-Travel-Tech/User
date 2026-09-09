import { apiRequest } from "./client"

export type LocationResult = {
  id: string
  area: string
  city: string | null
  district: string | null
  state: string | null
  pincode: string | null
  lat: number | null
  lng: number | null
  // "Area, City, State - Pincode"
  label: string
}

export const searchLocations = (q: string) =>
  apiRequest<{ data: { locations: LocationResult[] } }>(
    `/locations/search?q=${encodeURIComponent(q)}`,
  ).then((r) => r.data.locations)

// Area-only search (event creation) — no pincode typing, just area/city text.
export const searchAreas = (q: string) =>
  apiRequest<{ data: { areas: LocationResult[] } }>(
    `/locations/areas?q=${encodeURIComponent(q)}`,
  ).then((r) => r.data.areas)

// Cascading State -> District -> Locality picker.

export const listStates = () =>
  apiRequest<{ data: { states: string[] } }>("/locations/states").then((r) => r.data.states)

export const listDistricts = (state: string) =>
  apiRequest<{ data: { districts: string[] } }>(
    `/locations/districts?state=${encodeURIComponent(state)}`,
  ).then((r) => r.data.districts)

export const searchLocalities = (state: string, district: string, q: string) =>
  apiRequest<{ data: { localities: LocationResult[] } }>(
    `/locations/localities?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&q=${encodeURIComponent(q)}`,
  ).then((r) => r.data.localities)
