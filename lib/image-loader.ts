import { EVENT_COVER_SMALL_WIDTH } from "./event-cover"
import { VARIANT_SOURCES, VARIANT_WIDTHS } from "./image-variants"

/**
 * Custom `next/image` loader.
 *
 * There is no host-side optimizer here — see the note in next.config.ts. What
 * we do have is pre-encoded widths sitting next to their originals, and this
 * maps the width Next asks for onto a file that actually exists.
 *
 * Before this, `images.unoptimized` was set, which does more than skip the
 * optimizer: it stops Next emitting a `srcset` at all. Every `sizes` prop in
 * the codebase was therefore inert, and a phone downloaded the 1200px file to
 * paint it at ~460 CSS px — 533 KiB of waste on the homepage alone.
 *
 * Two sources of widths, and everything else is returned untouched:
 *
 *   1. Assets in public/, listed in image-variants.ts, written at build time by
 *      scripts/build-assets.mjs.
 *   2. Event covers on S3, written at UPLOAD time by the backend, because a
 *      cover does not exist until an organizer uploads one and so cannot be
 *      pre-encoded into the repo.
 */

// `events/<uuid>/cover.webp`, with or without the `?v=` cache-buster. Anchored
// on the events/ segment so it cannot match some other cover.webp that happens
// to live elsewhere in the same bucket.
const EVENT_COVER = /\/events\/[^/]+\/cover\.webp(\?|$)/

export default function imageLoader({ src, width }: { src: string; width: number }): string {
  // Event covers exist at exactly two widths: 500 and the stored 1000x1500.
  // Anything a phone-sized `sizes` asks for takes the small one, which is
  // roughly a third of the bytes — measured across the live events at the time
  // this shipped: 165K->50K, 217K->77K, 286K->92K.
  //
  // Safe only because `pnpm covers:backfill` has been run: covers uploaded
  // before 16 Aug 2026 had no small file, and every cover image on the event
  // page carries an onError that falls back to a PLACEHOLDER. A 404 here would
  // therefore have hidden the cover entirely rather than degrading to the large
  // one. Do not enable this for a new variant width without backfilling first.
  if (EVENT_COVER.test(src) && width <= EVENT_COVER_SMALL_WIDTH) {
    return src.replace("/cover.webp", `/cover-${EVENT_COVER_SMALL_WIDTH}.webp`)
  }

  if (!VARIANT_SOURCES.has(src)) return src

  // Smallest emitted width that still covers the request, so we never upscale
  // in the browser. Past the largest, the largest is all there is.
  const chosen = VARIANT_WIDTHS.find((w) => w >= width) ?? VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1]
  return src.replace(/\.webp$/, `-${chosen}.webp`)
}
