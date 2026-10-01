// Talent (performers) — shared by the sign-up/edit form, the dashboard, the
// public directory (/talent/browse) and profile pages (/talent/p/[slug]).

export const TALENT_FEE = 299

export const MAIN_SKILLS: { group: string; options: string[] }[] = [
  { group: "Hosting & Speaking", options: ["Event Anchor", "Public Speaker"] },
  { group: "Music", options: ["Singer", "Band", "DJ"] },
  { group: "Dance", options: ["Dancer", "Choreographer", "Flash Mob Team", "Cultural Performer"] },
  { group: "Comedy & Variety", options: ["Stand-up Comedian", "Mimicry Artist", "Ventriloquist", "Beatboxer"] },
  { group: "Art", options: ["Live Painter", "Sketch Artist", "Calligraphy Artist", "Caricature Artist", "Craft Artist", "Face Painter"] },
  { group: "Photo & Video", options: ["Photographer", "Videographer", "Cinematographer", "Video Editor", "Content Creator"] },
  { group: "Fashion & Beauty", options: ["Makeup Artist", "Hair Stylist", "Fashion Stylist", "Model", "Fashion Choreographer"] },
  { group: "Other", options: ["Event Coordinator", "Fitness Trainer"] },
]

// Suggestions for the city field — it accepts any city; these just make the
// common ones one tap away. Andhra Pradesh and Telangana first (launch
// region), then the large metros.
export const CITY_SUGGESTIONS = [
  "Visakhapatnam, Andhra Pradesh",
  "Vijayawada, Andhra Pradesh",
  "Guntur, Andhra Pradesh",
  "Tirupati, Andhra Pradesh",
  "Nellore, Andhra Pradesh",
  "Kakinada, Andhra Pradesh",
  "Rajahmundry, Andhra Pradesh",
  "Vizianagaram, Andhra Pradesh",
  "Srikakulam, Andhra Pradesh",
  "Kurnool, Andhra Pradesh",
  "Anantapur, Andhra Pradesh",
  "Eluru, Andhra Pradesh",
  "Ongole, Andhra Pradesh",
  "Hyderabad, Telangana",
  "Warangal, Telangana",
  "Karimnagar, Telangana",
  "Bengaluru, Karnataka",
  "Mysuru, Karnataka",
  "Chennai, Tamil Nadu",
  "Coimbatore, Tamil Nadu",
  "Bhubaneswar, Odisha",
  "Kolkata, West Bengal",
  "Mumbai, Maharashtra",
  "Pune, Maharashtra",
  "Delhi",
  "Gurugram, Haryana",
  "Noida, Uttar Pradesh",
  "Ahmedabad, Gujarat",
  "Jaipur, Rajasthan",
  "Kochi, Kerala",
  "Goa",
] as const

/* ------------------------------------------------------------ links */

const hostOf = (url: string) => {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^(www|m)\./, "")
  } catch {
    return ""
  }
}

export const isInstagram = (url: string) => hostOf(url) === "instagram.com"
export const isYouTube = (url: string) => ["youtube.com", "youtu.be"].includes(hostOf(url))

/** portfolioLinks is one list; sort it back into the three form boxes by
 *  what each link is, not by position (positions shift when one is blank). */
export function splitPortfolioLinks(links: string[]) {
  let instagram = ""
  let youtube = ""
  let website = ""
  for (const link of links) {
    if (!instagram && isInstagram(link)) instagram = link
    else if (!youtube && isYouTube(link)) youtube = link
    else if (!website) website = link
  }
  return { instagram, youtube, website }
}

/** "@name" or a bare handle → a full Instagram URL; anything else unchanged. */
export function normalizeInstagram(value: string) {
  const v = value.trim()
  if (!v) return ""
  if (/^https?:\/\//i.test(v) || v.includes("instagram.com")) return v.startsWith("http") ? v : `https://${v}`
  return `https://instagram.com/${v.replace(/^@/, "")}`
}

export function normalizeUrl(value: string) {
  const v = value.trim()
  if (!v) return ""
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

/** What a video link plays as on the profile page. null = not embeddable
 *  (shown as a plain link instead). */
export function videoEmbed(url: string): { kind: "youtube" | "instagram"; src: string } | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  const host = u.hostname.replace(/^(www|m)\./, "")
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0]
    return id ? { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` } : null
  }
  if (host === "youtube.com") {
    const id =
      u.searchParams.get("v") ??
      u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1] ??
      null
    return id ? { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` } : null
  }
  if (host === "instagram.com") {
    const m = u.pathname.match(/^\/(p|reel|reels|tv)\/([\w-]+)/)
    return m ? { kind: "instagram", src: `https://www.instagram.com/${m[1] === "reels" ? "reel" : m[1]}/${m[2]}/embed` } : null
  }
  return null
}

export const VIDEO_LINK_PATTERN = /^https:\/\/(www\.|m\.)?(youtube\.com|youtu\.be|instagram\.com)\//i

/* ------------------------------------------------------------ public API */

export type PublicTalent = {
  slug: string
  stageName: string
  mainSkill: string | null
  experienceLevel: string | null
  yearsOfExperience: string | null
  bio: string | null
  preferredSlots: string[]
  availableFor: string[]
  location: string | null
  expectedPriceBand: string | null
  portfolioLinks: string[]
  videoLinks: string[]
  photoUrl: string | null
  memberSince: string | null
}

export type TalentListResponse = {
  items: PublicTalent[]
  page: number
  limit: number
  total: number
  totalPages: number
  facets: { skills: string[]; cities: string[] }
}

const apiBase = () => process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""

/** Server-side fetch for the directory page. */
export async function fetchTalentList(params: {
  q?: string
  skill?: string
  city?: string
  page?: number
}): Promise<TalentListResponse | null> {
  const qs = new URLSearchParams()
  if (params.q) qs.set("q", params.q)
  if (params.skill) qs.set("skill", params.skill)
  if (params.city) qs.set("city", params.city)
  if (params.page && params.page > 1) qs.set("page", String(params.page))
  try {
    const res = await fetch(`${apiBase()}/api/v1/talent/public?${qs}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: TalentListResponse }
    return json.data ?? null
  } catch {
    return null
  }
}

/** Server-side fetch for one public profile. */
export async function fetchPublicTalent(slug: string): Promise<PublicTalent | null> {
  try {
    const res = await fetch(`${apiBase()}/api/v1/talent/public/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: { talent?: PublicTalent } }
    return json.data?.talent ?? null
  } catch {
    return null
  }
}

/** Where an organizer sees this performer's contact details. */
export const organizerTalentUrl = (slug: string) =>
  `https://organizer.baatasari.com/talent/${encodeURIComponent(slug)}`

export const formatPrice = (band: string | null) => {
  if (!band) return null
  const n = Number(band.replace(/\D/g, ""))
  return Number.isFinite(n) && n > 0 ? `From ₹${n.toLocaleString("en-IN")}` : band
}
