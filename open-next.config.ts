import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache"

/**
 * How this app runs on Cloudflare Workers.
 *
 * The incremental cache is not optional. On Vercel, ISR is handled by the
 * platform; on Workers there is nowhere for a revalidated page to live unless
 * one is configured. These are the routes that depend on it:
 *
 *   app/sitemap.ts          revalidate = 3600   <- newly published events
 *   app/events/[id]         revalidate = 60     (event pages and city pages)
 *   app/checkout            revalidate = 30
 *   lib/event-helpers       revalidate = 60
 *   lib/events-server       revalidate = 300    <- city pages and the sitemap
 *
 * Workers KV, via the adapter's own implementation: free at our size, no keys
 * to hold or rotate, and the binding is declared in wrangler.jsonc
 * (NEXT_INC_CACHE_KV). It replaced a hand-written Amazon S3 cache on
 * 2026-10-21. KV is eventually consistent, so a revalidated page can take up
 * to about a minute to show everywhere, which these routes already tolerate.
 */
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
})
