// One-off generator for the brand asset set on all three sites:
//   favicon.ico (16/32/48), icon-16/32/192/512.png, apple-touch-icon.png (opaque,
//   iOS paints transparency black), and the 1200x630 social cards for Organizer
//   and Venue (User already has og-home.jpg).
//
// Run from D:\Baatasari\User:  node scripts/build-brand-assets.mjs
// Source mark: User/public/nlogo.png (the walking figure, navy on transparent).
// Re-run it only if the mark changes; the outputs are committed.
import fs from "node:fs"
import path from "node:path"
import sharp from "sharp"

const ROOT = path.resolve(import.meta.dirname, "../..")
const SITES = ["User", "Organizer", "Venue"]
const NAVY = "#0c1d37"
const mark = path.join(ROOT, "User/public/nlogo.png")

/** The figure centred on a solid tile, with `pad` of the side kept clear around it. */
async function tile(size, { bg = "#ffffff", pad = 0.16, radius = 0 } = {}) {
  const inner = Math.round(size * (1 - pad * 2))
  const fig = await sharp(mark).resize(inner, inner, { fit: "contain", kernel: "lanczos3", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  let img = sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: fig, gravity: "center" }])
    .png()
  if (radius) {
    const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`)
    img = sharp(await img.toBuffer()).composite([{ input: mask, blend: "dest-in" }]).png()
  }
  return img.toBuffer()
}

/** ICO container holding PNG-encoded images (supported everywhere that matters). */
function ico(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  const dir = []
  let offset = 6 + images.length * 16
  for (const { size, data } of images) {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0)
    e.writeUInt8(size >= 256 ? 0 : size, 1)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    dir.push(e)
    offset += data.length
  }
  return Buffer.concat([header, ...dir, ...images.map((i) => i.data)])
}

const icoImages = []
for (const s of [16, 32, 48]) icoImages.push({ size: s, data: await tile(s, { bg: "#ffffff", pad: 0.08, radius: Math.round(s * 0.2) }) })

const outputs = {
  "icon-16.png": await tile(16, { bg: "#ffffff", pad: 0.08, radius: 3 }),
  "icon-32.png": await tile(32, { bg: "#ffffff", pad: 0.08, radius: 6 }),
  "icon-192.png": await tile(192, { bg: "#ffffff", pad: 0.2 }),
  "icon-512.png": await tile(512, { bg: "#ffffff", pad: 0.2 }),
  "apple-touch-icon.png": await tile(180, { bg: "#ffffff", pad: 0.14 }),
  "favicon.ico": ico(icoImages),
}

async function card(srcRel, out, headline, sub, position = "center") {
  const W = 1200, H = 630
  const photo = await sharp(path.join(ROOT, srcRel)).resize(W, H, { fit: "cover", position }).toBuffer()
  const shade = Buffer.from(
    `<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="${NAVY}" stop-opacity="0.94"/><stop offset="0.55" stop-color="${NAVY}" stop-opacity="0.72"/><stop offset="1" stop-color="${NAVY}" stop-opacity="0.15"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>
<text x="72" y="300" font-family="Arial, Helvetica, sans-serif" font-size="60" font-weight="700" fill="#ffffff">${headline[0]}</text>
<text x="72" y="372" font-family="Arial, Helvetica, sans-serif" font-size="60" font-weight="700" fill="#ffffff">${headline[1]}</text>
<text x="72" y="436" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#dbe4f0">${sub}</text></svg>`,
  )
  const chip = await tile(120, { bg: "#ffffff", pad: 0.14, radius: 28 })
  return sharp(photo)
    .composite([{ input: shade }, { input: chip, left: 72, top: 96 }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer()
}

const cards = {
  Organizer: await card("Organizer/public/for-organizers/hero.png", "og-home.jpg", ["Sell tickets. Run the door.", "Get paid. Free to start."], "Baatasari for Organizers"),
  Venue: await card("Venue/public/hero-venue.jpg", "og-home.jpg", ["List your venue.", "Get found by organizers."], "Baatasari for Venues"),
}

for (const site of SITES) {
  for (const [name, buf] of Object.entries(outputs)) fs.writeFileSync(path.join(ROOT, site, "public", name), buf)
  if (cards[site]) fs.writeFileSync(path.join(ROOT, site, "public", "og-home.jpg"), cards[site])
  console.log(site, "ok")
}
