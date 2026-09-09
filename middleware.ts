import { NextResponse, type NextRequest } from "next/server"
import { bypassesMaintenance, isPrivatePath } from "@/lib/seo"

// --- Maintenance gate -------------------------------------------------------
// When maintenance mode is turned ON (site-config, from the Admin-Backend /
// mobile app), every public route is rewritten to /maintenance.

const TTL_MS = 15_000 // re-check the flag at most every 15s per edge instance

type Maintenance = { active: boolean; until: string | null }

const OFF: Maintenance = { active: false, until: null }

let cache: { value: Maintenance; at: number } | null = null

async function maintenanceState(): Promise<Maintenance> {
  const now = Date.now()
  if (cache && now - cache.at < TTL_MS) return cache.value
  try {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""
    const res = await fetch(`${base}/api/v1/site-config`, { cache: "no-store" })
    if (!res.ok) throw new Error(`site-config ${res.status}`)
    const json = (await res.json()) as {
      data?: { maintenanceActive?: boolean; maintenanceTo?: string | null }
    }
    const value: Maintenance = {
      active: Boolean(json?.data?.maintenanceActive),
      until: json?.data?.maintenanceTo ?? null,
    }
    cache = { value, at: now }
    return value
  } catch {
    // Fail OPEN: never take the whole site down just because the config fetch
    // hiccupped. Reuse the last known value if we have one, else assume live.
    return cache?.value ?? OFF
  }
}

// Fallbacks for Retry-After when no end time is scheduled, and clamps so a
// stale or malformed date can't produce a nonsense hint.
const RETRY_DEFAULT_S = 3600
const RETRY_MIN_S = 60
const RETRY_MAX_S = 86_400

const retryAfterSeconds = (until: string | null): number => {
  if (!until) return RETRY_DEFAULT_S
  const ms = new Date(until).getTime() - Date.now()
  if (Number.isNaN(ms)) return RETRY_DEFAULT_S
  return Math.min(RETRY_MAX_S, Math.max(RETRY_MIN_S, Math.ceil(ms / 1000)))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // The policy/contact pages stay up (see MAINTENANCE_ALLOWED), as does the
  // maintenance page itself.
  const exempt =
    pathname === "/maintenance" || bypassesMaintenance(pathname)

  const maintenance = exempt ? OFF : await maintenanceState()

  if (maintenance.active) {
    // 503, not 200.
    //
    // This is the documented way to take a site down temporarily: a 503 with
    // Retry-After tells crawlers "still here, come back later", and Google
    // holds the existing index entry rather than reading the holding page as
    // the new content of every URL.
    //
    // This used to be a 200 carrying `X-Robots-Tag: noindex`, which is the
    // wrong tool and actively dangerous over a long window — noindex is a
    // removal directive, so a multi-hour outage could quietly evict real pages
    // from the index. The status code does the job without that risk, so the
    // noindex is gone. /maintenance visited directly is still noindexed below,
    // via isPrivatePath, so the holding page cannot be indexed on its own.
    const res = NextResponse.rewrite(new URL("/maintenance", req.url), {
      status: 503,
    })
    res.headers.set("Retry-After", String(retryAfterSeconds(maintenance.until)))
    return res
  }

  const res = NextResponse.next()

  // The real exclusion for everything that must stay out of search. robots.txt
  // Disallow is only a crawl hint — a linked-to URL can be indexed without ever
  // being fetched, so the noindex has to travel with the response. This is also
  // the only mechanism available to the client-rendered pages (consoles,
  // checkout, invoices), which cannot export Next metadata at all.
  if (isPrivatePath(pathname)) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow")
  }

  return res
}

export const config = {
  // Next 16 renamed middleware.ts to proxy.ts and made the proxy Node-only,
  // rejecting runtime config outright. The Cloudflare adapter refuses Node
  // middleware. The legacy filename plus this runtime is the only combination
  // the two will both accept today.
  //
  // Next calls it experimental in its own error message, and that is accurate:
  // the maintenance gate, the 503 and every noindex header ride on it. Revisit
  // the moment @opennextjs/cloudflare supports a Node proxy — at which point
  // this file goes back to being proxy.ts with this block deleted.
  runtime: "experimental-edge",
  // Everything except Next internals and static assets. Route-level decisions
  // are made in the handler above, where they can be read.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|txt|xml|woff|woff2|ttf)).*)",
  ],
}
