import type { Metadata } from "next"
import HomeClient from "./home-client"

const title = "Baatasari — Discover, Connect, Experience"
const description = "Book the best events, dining, and activities near you — curated events, venues, and experiences all in one place."

export const metadata: Metadata = {
  // `absolute` opts out of the root template — the homepage title already
  // carries the brand and would otherwise read "Baatasari — … · Baatasari".
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Baatasari",
    title,
    description,
    images: [{ url: "/og-home.jpg", width: 1200, height: 630, alt: "Baatasari" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-home.jpg"],
  },
}

export default function Page() {
  return (
    <>
      {/*
        The LCP element on this page is the hero background in
        components/about/hero.tsx. It already carries fetchPriority="high", but
        that only raises the priority of a request once the browser has FOUND
        it — and it was not being found until 730 ms in, because discovery sat
        behind ~780 ms of render-blocking CSS. Measured LCP was 4.4 s, of which
        730 ms was pure load *delay*.

        These two hints are in the document head, ahead of the stylesheets, so
        the fetch starts immediately. The `media` attributes mirror the
        <picture> breakpoint exactly — get them out of step and a phone
        preloads the desktop crop, downloading both.

        `type` is load-bearing, not decoration: it points at the AVIF, which is
        what <picture> will actually select for every browser we target. A
        browser that cannot decode AVIF skips a preload carrying a type it does
        not support, so it falls back to the WebP <source> having wasted
        nothing — which is exactly the behaviour we want, and is why the two
        must be kept in step with the <picture> in components/about/hero.tsx.
      */}
      <link
        rel="preload"
        as="image"
        href="/hero-bg-mobile.avif"
        type="image/avif"
        media="(max-width: 767px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href="/hero-bg.avif"
        type="image/avif"
        media="(min-width: 768px)"
        fetchPriority="high"
      />
      <HomeClient />
    </>
  )
}
