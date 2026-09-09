"use client"

// Cross-tab session sync.
//
// When the API client detects refresh failure (or the user logs out
// explicitly in one tab), we broadcast a single message on the
// "baatasari-auth" BroadcastChannel. Every other open tab listens and
// clears its own session state — so a user who is signed out in tab A
// doesn't keep using a stale-looking auth UI in tab B.
//
// Falls back to a no-op on browsers without BroadcastChannel (Safari
// versions before 15.4). The cookie-level session is still gone in
// every tab once the BE clears the refresh cookie; this channel just
// makes the FE state catch up immediately instead of waiting for the
// next API call to 401.

const CHANNEL_NAME = "baatasari-auth"

type SessionMessage =
  | { type: "session-cleared"; reason?: string }
  | { type: "session-refreshed" }

const hasChannel = typeof BroadcastChannel !== "undefined"

let channel: BroadcastChannel | null = null

const getChannel = (): BroadcastChannel | null => {
  if (!hasChannel) return null
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

export const broadcastSessionCleared = (reason?: string): void => {
  const c = getChannel()
  if (!c) return
  try {
    const message: SessionMessage = { type: "session-cleared", reason }
    c.postMessage(message)
  } catch {
    // Channel can throw if the page is closing; safe to swallow.
  }
}

export const onSessionCleared = (handler: (reason?: string) => void): (() => void) => {
  const c = getChannel()
  if (!c) return () => undefined

  const listener = (event: MessageEvent<SessionMessage>) => {
    if (event.data?.type === "session-cleared") {
      handler(event.data.reason)
    }
  }
  c.addEventListener("message", listener)
  return () => c.removeEventListener("message", listener)
}
