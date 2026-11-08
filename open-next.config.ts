import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache"
import memoryQueue from "@opennextjs/cloudflare/overrides/queue/memory-queue"

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
 * (NEXT_INC_CACHE_KV).
 *
 * The QUEUE is what refreshes a stale entry. Without one (the adapter's default
 * is a "dummy" that does nothing) a cached copy NEVER refreshes until the next
 * deploy: on 2026-11-08 an event page and checkout kept serving ticket ids from
 * before the organizer edited the event, and every booking failed with "Selected
 * ticket tier is invalid". The memory queue asks the Worker to refresh the page
 * through the WORKER_SELF_REFERENCE service binding (wrangler.jsonc). It replaced a hand-written Amazon S3 cache on
 * 2026-10-21. KV is eventually consistent, so a revalidated page can take up
 * to about a minute to show everywhere, which these routes already tolerate.
 */
export default defineCloudflareConfig({
  incrementalCache: kvIncrementalCache,
  queue: memoryQueue,
})
