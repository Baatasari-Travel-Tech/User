"use client"

/**
 * Last-resort screen: replaces the whole root layout, so it cannot rely on the
 * app's CSS or fonts. Inline styles only.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Arial, sans-serif", color: "#0f172a", background: "#ffffff" }}>
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
          <h1 style={{ fontSize: "28px", margin: "0 0 12px" }}>Baatasari is having a problem</h1>
          <p style={{ maxWidth: "420px", lineHeight: 1.6, color: "#475569", margin: "0 0 24px" }}>
            Please try again in a moment. If it keeps happening, write to contact-us@baatasari.com.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ minHeight: "44px", padding: "0 28px", borderRadius: "999px", border: "none", background: "#0c1d37", color: "#ffffff", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
