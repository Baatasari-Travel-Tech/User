"use client"

// Cross-tab session sync for this site (BroadcastChannel is origin-scoped, so
// this only ever talks to other tabs of the same site — never another surface).
//
// The session itself lives in httpOnly cookies that every tab already shares,
// so a login or logout in one tab is real in every tab immediately. What these
// messages do is make each tab's on-screen state catch up straight away
// instead of waiting for its next API call:
//
// - "session-cleared": tab A signed out (or its session expired). Every other
//   tab clears its own state and leaves any signed-in-only page.
// - "session-started": tab A signed in (password, 2FA, Google, sign-up).
//   Every other tab picks the session up. It carries the userId so a tab
//   still showing a *different* account knows to reload rather than mix two
//   accounts' data on one screen.
//
// Only explicit sign-in/sign-out actions broadcast — never the act of loading
// the current session — so two tabs can't set each other off in a loop.
//
// Falls back to a no-op on browsers without BroadcastChannel (Safari before
// 15.4); those tabs simply catch up on their next API call.

const CHANNEL_NAME = "baatasari-auth"

type SessionMessage =
  | { type: "session-cleared"; reason?: string }
  | { type: "session-started"; userId: string }

const hasChannel = typeof BroadcastChannel !== "undefined"

let channel: BroadcastChannel | null = null

const getChannel = (): BroadcastChannel | null => {
  if (!hasChannel) return null
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME)
  return channel
}

const post = (message: SessionMessage): void => {
  const c = getChannel()
  if (!c) return
  try {
    c.postMessage(message)
  } catch {
    // Channel can throw if the page is closing; safe to swallow.
  }
}

export const broadcastSessionCleared = (reason?: string): void => {
  post({ type: "session-cleared", reason })
}

export const broadcastSessionStarted = (userId: string): void => {
  post({ type: "session-started", userId })
}

const subscribe = (listener: (message: SessionMessage) => void): (() => void) => {
  const c = getChannel()
  if (!c) return () => undefined
  const onMessage = (event: MessageEvent<SessionMessage>) => {
    if (event.data?.type) listener(event.data)
  }
  c.addEventListener("message", onMessage)
  return () => c.removeEventListener("message", onMessage)
}

export const onSessionCleared = (handler: (reason?: string) => void): (() => void) =>
  subscribe((message) => {
    if (message.type === "session-cleared") handler(message.reason)
  })

export const onSessionStarted = (handler: (userId: string) => void): (() => void) =>
  subscribe((message) => {
    if (message.type === "session-started") handler(message.userId)
  })
