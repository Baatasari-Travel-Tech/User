import type { MetadataRoute } from "next"
import { PRIVATE_PATH_PREFIXES, SITE_ORIGIN } from "@/lib/seo"

/**
 * Served at /robots.txt.
 *
 * Disallow rules are only a crawl hint. The real exclusion for private paths is
 * the `X-Robots-Tag: noindex` header set in middleware.ts — see lib/seo.ts.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_PATH_PREFIXES,
    },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  }
}
