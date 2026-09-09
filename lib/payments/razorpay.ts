"use client"

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void
      // "payment.failed" is the one event we listen for — fired when a
      // charge attempt is declined while the checkout widget is open.
      on: (event: "payment.failed", handler: (response: { error?: { description?: string; reason?: string } }) => void) => void
    }
  }
}

let razorpayLoader: Promise<void> | null = null

export async function loadRazorpayScript() {
  if (typeof window === "undefined") return
  if (window.Razorpay) return

  if (!razorpayLoader) {
    razorpayLoader = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay="true"]')
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true })
        existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay.")), { once: true })
        return
      }

      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.async = true
      script.dataset.razorpay = "true"
      script.onload = () => resolve()
      script.onerror = () => reject(new Error("Failed to load Razorpay."))
      document.body.appendChild(script)
    }).finally(() => {
      razorpayLoader = null
    })
  }

  await razorpayLoader
}
