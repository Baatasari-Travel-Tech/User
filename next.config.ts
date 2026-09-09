import type { NextConfig } from "next";

/**
 * Fail the build when a required public variable is missing.
 *
 * Every NEXT_PUBLIC_* value is inlined into the bundle at BUILD time. Miss one
 * and nothing complains: the build succeeds, the site deploys, pages render —
 * and then `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/v1/...` resolves to a
 * path on our own origin, so every API call 404s against ourselves.
 *
 * That failure has now happened twice, and it is genuinely hard to read from
 * the symptoms: sign-in breaks, the session never loads, and the maintenance
 * gate silently stops working because the middleware reads the same variable
 * and fails open. One missing string, four unrelated-looking bugs.
 *
 * A build that stops is a far cheaper way to learn this than a deployed site
 * that looks fine.
 *
 * Only enforced for production builds, so `next dev` and lint still run in a
 * bare checkout.
 *
 * Only NEXT_PUBLIC_API_URL is listed. The avatar and event-cover base URLs are
 * also NEXT_PUBLIC_, but lib/avatar.ts and lib/event-cover.ts both fall back to
 * the correct S3 bucket when unset — which is how they have always run, Vercel
 * included. Demanding them here would fail builds over variables that do not
 * need to exist.
 */
const REQUIRED_PUBLIC_ENV = ["NEXT_PUBLIC_API_URL"] as const;

if (process.env.NODE_ENV === "production") {
  const missing = REQUIRED_PUBLIC_ENV.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required build variables: ${missing.join(", ")}.\n\n` +
        "These are inlined into the bundle at BUILD time.\n\n" +
        "On Cloudflare there are two separate places, and only one of them works:\n" +
        "  Settings > Build          -> build variables   <- PUT IT HERE\n" +
        "  Settings > Variables and Secrets -> runtime    <- has no effect on this\n\n" +
        "The build section is the same screen that holds the build and deploy\n" +
        "commands. See DEPLOY-CLOUDFLARE.md step 4.",
    );
  }
}

const nextConfig: NextConfig = {
  experimental: {
    // Tree-shake heavy barrel imports so only the used exports ship. These are
    // the largest contributors to the public JS bundle (icons + animation +
    // charts + date utils + carousel).
    optimizePackageImports: [
      "lucide-react",
      "react-icons",
      "framer-motion",
      "recharts",
      "date-fns",
      "embla-carousel-react",
    ],
  },
  images: {
    // No host-side optimizer.
    //
    // This used to rely on Vercel's, which is not available on every runtime —
    // it needs sharp, a native binary. Rather than trade one host lock-in for a
    // paid transformation service, the bytes are made right at their source:
    // everything in public/ is pre-encoded to WebP by scripts/build-assets.mjs,
    // and event covers already arrive as 1000x1500 WebP because the backend
    // resizes them on upload (organizer.service.ts).
    //
    // This used to set `unoptimized: true`, which does more than skip the
    // optimizer — it stops Next emitting a `srcset` entirely. Every `sizes`
    // prop in the codebase was inert, so a phone downloaded the 1200px file to
    // paint it at ~460 CSS px. Lighthouse measured 533 KiB of waste on the
    // homepage alone.
    //
    // The loader instead maps a requested width onto a pre-encoded file that
    // scripts/build-assets.mjs already wrote and committed. Still no runtime
    // image processing, still no host lock-in, but responsive again.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
    // Next only ever asks the loader for widths drawn from these two lists.
    // Their union MUST equal VARIANT_WIDTHS in scripts/build-assets.mjs, or the
    // loader rewrites to a file that was never generated.
    imageSizes: [384],
    deviceSizes: [640, 828, 1200],
    remotePatterns: [
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Google account profile pictures (seeded as avatar on OAuth signup).
      // Google rotates between lh3, lh4, lh5, lh6, ... subdomains so we
      // wildcard the whole eTLD+1.
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
  async redirects() {
    return [
      {
        // Venue partners live on their own Worker at venue.baatasari.com
        // (D:/Restaurant/CodeBase/Frontend) — restaurant.baatasari.com until
        // this destination changed. That old hostname is still attached to
        // the same Worker (Cloudflare custom domains aren't torn down by
        // removing them from wrangler.jsonc) and keeps serving on purpose:
        // this redirect is permanent and browsers cache it hard, so anyone
        // who followed /for-restaurants before this change may still be
        // holding a cached 308 straight to the old hostname for a long
        // time yet. Do not detach restaurant.baatasari.com in Cloudflare
        // until well after this has had time to expire from caches.
        //
        // This path is what the nav, the footer and any campaign link point
        // at, so the subdomain is named in ONE place: if the venue pitch ever
        // moves onto this app, or onto a different host, that is a one-line
        // change here rather than a hunt through components.
        //
        // A config redirect, not middleware: next.config redirects are
        // evaluated BEFORE middleware runs. That keeps it working while
        // maintenance mode is ON — a partner following the link during a
        // deploy window should still reach the venue site, which is a separate
        // Worker and is not down — and it costs no site-config fetch.
        //
        // Permanent (308), so browsers cache it hard. Worth the SEO signal,
        // but it means retargeting this path later is slow to take effect for
        // anyone who has followed it once; change the path, not the
        // destination, if it ever has to move in a hurry.
        source: "/for-restaurants",
        destination: "https://venue.baatasari.com",
        permanent: true,
      },
      {
        // The page used to live at /terms&conditions. A literal "&" in a path
        // cannot appear in a sitemap without entity-escaping, which Next's
        // sitemap serializer does not do — the raw character made the whole
        // sitemap invalid XML, and Google discards an invalid sitemap outright
        // rather than skipping the one bad entry. Permanent so the old URL
        // (linked from older pages, and possibly registered with the payment
        // gateway) keeps resolving and passes its ranking on.
        source: "/terms&conditions",
        destination: "/terms-and-conditions",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Two years, and covering subdomains — the platform default omitted
          // includeSubDomains, which left api. and campus-connect. open to a
          // first-visit downgrade. Verified beforehand that every subdomain
          // already redirects HTTP to HTTPS, so nothing is cut off.
          //
          // The `preload` token is deliberately absent: it only does anything
          // once the domain is submitted at hstspreload.org, and getting back
          // off that list takes months. That is a decision to make on purpose,
          // not a side effect of a header tweak.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          // Cuts this origin off from any window that opened it. Google sign-in
          // is a full-page redirect here, not a popup, so `same-origin` would
          // also be safe — allow-popups is chosen so that adding a popup-based
          // flow later fails visibly rather than silently breaking sign-in.
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
