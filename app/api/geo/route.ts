import { NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"

/**
 * Approximate location of the visitor (city level), worked out by Cloudflare
 * from their connection. Used only to pre-select "events near you" on /events.
 *
 * Nothing is stored or logged here, and nothing precise is returned: city,
 * region and country, no coordinates. A visitor can always change the city.
 * Returns nulls (never an error) when the location is unknown, so the page
 * simply shows all events.
 */
export const dynamic = "force-dynamic"

type Geo = { city: string | null; region: string | null; country: string | null }

export async function GET(request: Request) {
  let geo: Geo = { city: null, region: null, country: null }
  try {
    const cf = getCloudflareContext().cf as { city?: string; region?: string; country?: string } | undefined
    geo = { city: cf?.city ?? null, region: cf?.region ?? null, country: cf?.country ?? null }
  } catch {
    // Not running on Cloudflare (local build/dev): fall back to the headers.
  }
  if (!geo.city) {
    const h = request.headers
    geo = {
      city: h.get("cf-ipcity"),
      region: h.get("cf-region"),
      country: h.get("cf-ipcountry"),
    }
  }
  return NextResponse.json(geo, {
    headers: { "Cache-Control": "private, no-store" },
  })
}
