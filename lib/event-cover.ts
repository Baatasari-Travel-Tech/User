const DEFAULT_EVENT_COVER_BASE_URL =
  "https://baatasari-events-public-535709430287-ap-south-2-an.s3.ap-south-2.amazonaws.com"

const baseUrl = (
  process.env.NEXT_PUBLIC_EVENT_COVER_BASE_URL?.trim() || DEFAULT_EVENT_COVER_BASE_URL
).replace(/\/+$/, "")

const toEpochVersion = (value?: string | number | null) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value)
  }

  if (typeof value === "string" && value.trim()) {
    const asNumber = Number(value)
    if (Number.isFinite(asNumber)) {
      return Math.floor(asNumber)
    }

    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return null
}

export const getEventCoverImageUrl = (eventId: string, version?: string | number | null) => {
  const objectKey = `events/${encodeURIComponent(eventId)}/cover.webp`
  const normalizedVersion = toEpochVersion(version)
  const versionParam = normalizedVersion !== null ? `?v=${normalizedVersion}` : ""

  return `${baseUrl}/${objectKey}${versionParam}`
}

/**
 * Width of the smaller cover the backend writes alongside the 1000x1500 one.
 * Must match EVENT_COVER_SMALL_WIDTH in the backend's config/s3.ts — the key
 * contains the number, so a mismatch is a 404 rather than a wrong size.
 */
export const EVENT_COVER_SMALL_WIDTH = 500

export const getEventCoverSmallImageUrl = (eventId: string, version?: string | number | null) => {
  const objectKey = `events/${encodeURIComponent(eventId)}/cover-${EVENT_COVER_SMALL_WIDTH}.webp`
  const normalizedVersion = toEpochVersion(version)
  const versionParam = normalizedVersion !== null ? `?v=${normalizedVersion}` : ""

  return `${baseUrl}/${objectKey}${versionParam}`
}

/**
 * A srcset offering both widths, so a phone downloads the 500px file instead of
 * the 1000px one.
 *
 * Covers uploaded before 16 Aug 2026 have only the large file, and a srcset
 * candidate that 404s is a broken image rather than a silent fallback. Two
 * things cover that: `pnpm covers:backfill` in the backend generates the
 * missing variants, and every call site here keeps an onError that drops back
 * to the full-size URL. The backfill is the fix; the fallback is what makes
 * shipping this before running it safe.
 */
export const getEventCoverSrcSet = (eventId: string, version?: string | number | null) =>
  `${getEventCoverSmallImageUrl(eventId, version)} ${EVENT_COVER_SMALL_WIDTH}w, ` +
  `${getEventCoverImageUrl(eventId, version)} 1000w`
