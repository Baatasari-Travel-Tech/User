'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Microsoft Clarity (session recordings + heatmaps) for the founder and the
 * design team. It is NOT a data source for the product: organizer and admin
 * analytics read our own database, which also knows about paid orders.
 *
 * The project ID is not a secret (it is visible in any page's source), so it
 * lives here as the default, the way the avatar and event-cover base URLs do;
 * NEXT_PUBLIC_CLARITY_ID can override it at build time. Only production builds
 * load Clarity, so `next dev` and local checks never send recordings.
 */
const CLARITY_ID =
  process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_CLARITY_ID?.trim() || 'z6fdykqcax'
    : ''

// Pages where nothing personal is shown. Clarity is only ever LOADED on one of
// these: a visit that starts on checkout, My tickets (ticket QR codes), sign-in,
// profile or an invoice never loads the script at all.
const PUBLIC_EXACT = new Set(['/', '/talent', '/talent/browse', '/for-organizers', '/help', '/contact-us'])
const PUBLIC_PREFIXES = ['/events', '/talent/p/']

const isPublicPath = (pathname: string): boolean =>
  PUBLIC_EXACT.has(pathname) ||
  PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`))

let injected = false

function injectClarity(id: string) {
  if (injected) return
  injected = true
  // Clarity's own install snippet, minus the global-scope wrapper.
  const w = window as unknown as Record<string, unknown>
  w.clarity =
    w.clarity ||
    function () {
      const c = w.clarity as { q?: unknown[] }
      // eslint-disable-next-line prefer-rest-params
      ;(c.q = c.q || []).push(arguments)
    }
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.clarity.ms/tag/${id}`
  document.head.appendChild(script)
}

export default function Clarity() {
  const pathname = usePathname()

  useEffect(() => {
    if (!CLARITY_ID) return
    const publicPage = isPublicPath(pathname ?? '/')

    // Moving on from a public page to checkout / tickets / account WITHOUT a
    // reload keeps an already-loaded Clarity running, so everything there is
    // masked (text, inputs and images) for as long as the visitor stays off the
    // public pages. Hard loads of those pages never load Clarity at all.
    if (publicPage) document.body.removeAttribute('data-clarity-mask')
    else document.body.setAttribute('data-clarity-mask', 'True')

    if (!publicPage) return

    // After the page is usable, so it never competes with the first paint.
    const start = () => injectClarity(CLARITY_ID)
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(start, { timeout: 4000 })
      return () => window.cancelIdleCallback(handle)
    }
    const timer = window.setTimeout(start, 2000)
    return () => window.clearTimeout(timer)
  }, [pathname])

  return null
}
