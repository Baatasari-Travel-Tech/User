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

// Clarity runs on every page EXCEPT these. A visit that starts on one of them
// never loads the script at all.
//  - /checkout and /profile: the founder's choice (payment details, personal data).
//  - /reset-password and /auth: Clarity records the page address, and these carry
//    a one-time secret in it (the reset token; the pending sign-in ticket on the
//    Google/2FA return), which would then sit in a third-party dashboard.
// Ticket QR codes (history, order-confirmed) are masked individually with
// data-clarity-mask on the image, on top of the Strict masking set in Clarity.
const EXCLUDED_PREFIXES = ['/checkout', '/profile', '/reset-password', '/auth']

const isRecordable = (pathname: string): boolean =>
  !EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

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
    const recordable = isRecordable(pathname ?? '/')

    // Moving on to an excluded page WITHOUT a reload keeps an already-loaded
    // Clarity running, so everything there is masked (text, inputs and images)
    // for as long as the visitor stays on it. Hard loads of those pages never
    // load Clarity at all.
    if (recordable) document.body.removeAttribute('data-clarity-mask')
    else document.body.setAttribute('data-clarity-mask', 'True')

    if (!recordable) return

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
