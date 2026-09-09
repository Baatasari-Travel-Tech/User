import { defineCloudflareConfig } from "@opennextjs/cloudflare"
import s3IncrementalCache from "./open-next/s3-incremental-cache"

/**
 * How this app runs on Cloudflare Workers.
 *
 * The incremental cache is not optional. On Vercel, ISR is handled by the
 * platform; on Workers there is nowhere for a revalidated page to live unless
 * one is configured. These are the routes that depend on it:
 *
 *   app/sitemap.ts          revalidate = 3600   <- newly published events
 *   app/events/[id]         revalidate = 60
 *   app/checkout            revalidate = 30
 *   lib/event-helpers       revalidate = 60
 *
 * S3 rather than the adapter's built-in R2 or KV: it keeps this in the same AWS
 * account as the event covers, in ap-south-2, which is close enough to the edge
 * for the cache to be worth having. The trade is that it is our code to
 * maintain, and reads are billed as egress — see open-next/s3-incremental-cache.ts.
 */
export default defineCloudflareConfig({
  incrementalCache: s3IncrementalCache,
})
