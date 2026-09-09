// Derives two kinds of asset that Next's image optimizer cannot help with,
// and writes them into public/ alongside their sources.
//
//   1. Social share cards. openGraph.images URLs are fetched RAW by Facebook,
//      WhatsApp and X — they never pass through /_next/image. Pointing them at
//      the 1.9 MB source PNG meant WhatsApp frequently rendered no preview at
//      all, since it drops images it considers too heavy.
//   2. Hero backgrounds for the <picture> element in components/about/hero.tsx.
//      Art direction needs real <source media> entries, and a <source> cannot
//      point at the optimizer, so these two are pre-encoded.
//
// Run with `pnpm assets`. Outputs are committed — this is a one-off derivation,
// not a build step, so a deploy never depends on sharp being installable.

import sharp from "sharp"
import { readdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"

const PUBLIC = path.resolve(import.meta.dirname, "..", "public")

// 1200x630 is the size every platform crops to. Producing it here rather than
// letting them crop a 3:2 source means we choose what survives the crop.
const OG = [
  { from: "hero-bg.png", to: "og-home.jpg" },
  { from: "events-hero.png", to: "og-events.jpg" },
]

const HEROES = [
  { from: "hero-bg.png", to: "hero-bg.webp", width: 1920 },
  { from: "hero-bg-mobile.png", to: "hero-bg-mobile.webp", width: 900 },
]

// Every raster in public/ that a component renders, pre-encoded to WebP at a
// width it could plausibly be displayed at.
//
// These used to arrive as multi-megabyte PNGs and lean on the host's image
// optimizer to become something a phone should download. That made the app
// dependent on one specific host doing that work. Doing it here instead means
// the bytes are already right wherever it is deployed — and the sources stay
// in the repo, so a re-encode is always one command away.
// Widths every responsive raster is ALSO emitted at, so a phone downloads a
// phone-sized file. MUST stay identical to the union of `imageSizes` and
// `deviceSizes` in next.config.ts — Next only ever asks the loader for widths
// from those lists, and the loader rewrites to `<name>-<width>.webp`, so a
// width present in the config but missing here is a 404 on a real page.
const VARIANT_WIDTHS = [384, 640, 828, 1200]

// Which rasters get the treatment. Everything the layout renders at a size that
// varies with the viewport.
//
// Deliberately excluded: the two hero backgrounds (art-directed through
// <picture> + <source media>, which needs whole separate crops rather than
// widths of one image) and brand-96 (already 96px — a "variant" would be the
// same bytes under four names).
const VARIANT_OF = new Set([
  "talents-hero-mobile.webp",
  "talent-hero.webp",
  "campus.webp",
  "events-hero.webp",
  "events-hero-mobile.webp",
  "restar.webp",
  "event.webp",
  "last.webp",
  "av.webp",
  "as.webp",
  "an2.webp",
  "p2.webp",
  "plan.webp",
])

const RASTERS = [
  { from: "talents-hero-mobile.png", to: "talents-hero-mobile.webp", width: 900 },
  { from: "talent-hero.png", to: "talent-hero.webp", width: 1600 },
  { from: "campus.png", to: "campus.webp", width: 1600 },
  { from: "events-hero.png", to: "events-hero.webp", width: 1600 },
  { from: "events-hero-mobile.jpeg", to: "events-hero-mobile.webp", width: 900 },
  { from: "restar.jpeg", to: "restar.webp", width: 1200 },
  { from: "event.jpeg", to: "event.webp", width: 1200 },
  // Card art from lib/about-data.ts — referenced as data, not as a src
  // attribute, which is why a JSX-shaped search missed them. Together they were
  // 12 MB of PNG rendered into tiles a few hundred pixels wide.
  { from: "last.png", to: "last.webp", width: 1200 },
  { from: "av.png", to: "av.webp", width: 1200 },
  { from: "as.png", to: "as.webp", width: 1200 },
  { from: "an2.png", to: "an2.webp", width: 1200 },
  { from: "p2.png", to: "p2.webp", width: 1200 },
  { from: "plan.png", to: "plan.webp", width: 1200 },
  // The brand mark as the UI actually uses it — 32px in the header, 72px on the
  // holding page. nlogo.png itself stays as the canonical asset for JSON-LD,
  // where a crawler wants the full-resolution mark.
  { from: "nlogo.png", to: "brand-96.webp", width: 96 },
]

// The brand mark is an 870x870 source. A favicon is drawn at 16-32px and an
// Apple touch icon at 180 — pointing either straight at the source would ship
// a six-figure byte count to render a few dozen pixels, and neither is served
// through the image optimizer.
const ICONS = [
  { from: "nlogo.png", to: "icon-32.png", size: 32 },
  { from: "nlogo.png", to: "apple-touch-icon.png", size: 180 },
]

const kib = async (file) => Math.round((await stat(path.join(PUBLIC, file))).size / 1024)

// The testing canvas needs a list of the images sitting in public/. That list
// used to come from a route handler calling fs.readdirSync at request time,
// which cannot work on a runtime without a filesystem. The filenames are known
// at build, so they are written out here instead — same answer, no server.
const MANIFEST = "image-manifest.json"
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"])

const writeImageManifest = async () => {
  const entries = await readdir(PUBLIC, { withFileTypes: true })
  const images = entries
    .filter((e) => e.isFile() && IMAGE_EXT.has(path.extname(e.name).toLowerCase()))
    .map((e) => `/${e.name}`)
    .sort((a, b) => a.localeCompare(b))
  await writeFile(path.join(PUBLIC, MANIFEST), `${JSON.stringify({ images }, null, 2)}\n`)
  console.log(`list  public/*.{png,jpg,webp,...} -> ${MANIFEST} (${images.length} images)`)
}

// The loader has to know which sources actually have variants on disk — a
// rewrite to a file that was never generated is a 404 in the page, not a
// fallback. Generating the list here, from the same loop that writes the files,
// is what keeps the two from drifting.
const VARIANTS_MODULE = path.resolve(import.meta.dirname, "..", "lib", "image-variants.ts")

const writeVariantManifest = async () => {
  const sources = [...VARIANT_OF].sort().map((name) => `  "/${name}",`).join("\n")
  const body = `// GENERATED by scripts/build-assets.mjs — do not edit by hand.
// Regenerate with \`pnpm assets\`.

/** Widths emitted for every source below. Mirrors next.config imageSizes+deviceSizes. */
export const VARIANT_WIDTHS = [${VARIANT_WIDTHS.join(", ")}] as const

/** Sources that have \`<name>-<width>.webp\` siblings on disk. */
export const VARIANT_SOURCES: ReadonlySet<string> = new Set([
${sources}
])
`
  await writeFile(VARIANTS_MODULE, body)
  console.log(`gen   lib/image-variants.ts (${VARIANT_OF.size} sources x ${VARIANT_WIDTHS.length} widths)`)
}

const run = async () => {
  for (const { from, to } of OG) {
    await sharp(path.join(PUBLIC, from))
      .resize(1200, 630, { fit: "cover", position: "attention" })
      // JPEG, not WebP: a handful of crawlers still fall back to "no preview"
      // on WebP, and a share card is exactly where compatibility beats bytes.
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(path.join(PUBLIC, to))
    console.log(`og    ${from} (${await kib(from)} KiB) -> ${to} (${await kib(to)} KiB)`)
  }

  for (const { from, to, width } of HEROES) {
    await sharp(path.join(PUBLIC, from))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(path.join(PUBLIC, to))
    console.log(`hero  ${from} (${await kib(from)} KiB) -> ${to} (${await kib(to)} KiB)`)

    // AVIF alongside, because the mobile hero is the LCP element and 122 KB of
    // it was most of what remained of LCP once the preload fixed discovery.
    //
    // Every browser in package.json#browserslist (Chrome/Edge/Firefox 111+,
    // Safari 16.4+) decodes AVIF, so the WebP above is a fallback rather than
    // the main path. quality 48 rather than the WebP's 78: this image sits
    // under a gradient overlay with text on it, so it takes far more
    // compression than a photograph shown on its own would. Measured
    // 119 KiB -> 70 KiB at the same 900px width — no resolution given up.
    const avif = to.replace(/\.webp$/, ".avif")
    await sharp(path.join(PUBLIC, from))
      .resize({ width, withoutEnlargement: true })
      .avif({ quality: 48, effort: 6 })
      .toFile(path.join(PUBLIC, avif))
    console.log(`  └─  ${avif} (${await kib(avif)} KiB)`)
  }

  for (const { from, to, size } of ICONS) {
    await sharp(path.join(PUBLIC, from))
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(path.join(PUBLIC, to))
    console.log(`icon  ${from} (${await kib(from)} KiB) -> ${to} (${await kib(to)} KiB)`)
  }

  for (const { from, to, width } of RASTERS) {
    await sharp(path.join(PUBLIC, from))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(path.join(PUBLIC, to))
    console.log(`img   ${from} (${await kib(from)} KiB) -> ${to} (${await kib(to)} KiB)`)

    if (!VARIANT_OF.has(to)) continue

    // withoutEnlargement means a source narrower than the requested width just
    // comes out at its own width — the file still exists, so the loader can
    // point at it unconditionally.
    //
    // effort: 6 spends more encoder time for smaller output. This runs once, by
    // hand, and the result is committed, so the time is free.
    const base = to.replace(/\.webp$/, "")
    for (const w of VARIANT_WIDTHS) {
      const out = `${base}-${w}.webp`
      await sharp(path.join(PUBLIC, from))
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 74, effort: 6 })
        .toFile(path.join(PUBLIC, out))
      console.log(`  └─  ${out} (${await kib(out)} KiB)`)
    }
  }

  await writeVariantManifest()

  // Last, so it catches everything the steps above just produced.
  await writeImageManifest()
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
