"use client"

// Cashfree v3 web SDK, loaded from their CDN (same pattern as the Razorpay
// loader — no npm dependency, no bundle weight, works on the Cloudflare
// Workers runtime).

type CashfreeCheckoutResult = {
  error?: { message?: string; code?: string }
  redirect?: boolean
  paymentDetails?: { paymentMessage?: string }
}

type CashfreeInstance = {
  checkout: (opts: {
    paymentSessionId: string
    redirectTarget?: "_self" | "_blank" | "_top" | "_modal"
  }) => Promise<CashfreeCheckoutResult>
}

declare global {
  interface Window {
    Cashfree?: (opts: { mode: "sandbox" | "production" }) => CashfreeInstance
  }
}

let loader: Promise<void> | null = null

export async function loadCashfree(
  mode: "sandbox" | "production",
): Promise<CashfreeInstance> {
  if (typeof window === "undefined") {
    throw new Error("Cashfree can only load in the browser.")
  }

  if (!window.Cashfree) {
    if (!loader) {
      loader = new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
          'script[data-cashfree="true"]',
        )
        if (existing) {
          existing.addEventListener("load", () => resolve(), { once: true })
          existing.addEventListener(
            "error",
            () => reject(new Error("Failed to load Cashfree.")),
            { once: true },
          )
          return
        }
        const s = document.createElement("script")
        s.src = "https://sdk.cashfree.com/js/v3/cashfree.js"
        s.async = true
        s.dataset.cashfree = "true"
        s.onload = () => resolve()
        s.onerror = () => reject(new Error("Failed to load Cashfree."))
        document.body.appendChild(s)
      }).finally(() => {
        loader = null
      })
    }
    await loader
  }

  const factory = window.Cashfree
  if (!factory) throw new Error("Cashfree failed to load.")
  return factory({ mode })
}
