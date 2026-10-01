"use client"

import { useAuthStore } from "@/lib/auth/store"
import { broadcastSessionCleared } from "@/lib/auth/session-channel"
import { ApiError, type ActiveRole, type ApiErrorPayload } from "@/types/api"

const API_PREFIX = "/api/v1"
const DEFAULT_REQUEST_TIMEOUT_MS = 12000

const withPrefix = (path: string) => {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${base}${API_PREFIX}${normalized}`
}

const redirectToLogin = () => {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login"
  }
}

const tryParseJson = async (response: Response) => {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Renewing the session rotates the refresh token: the backend deletes the one
 * presented, issues a new one, and treats any later use of the old one as a
 * stolen token — it signs the account out on every device. The cookies are
 * shared by every open tab of this site, so two tabs renewing at the same
 * moment (a browser restoring several tabs, or two tabs waking up after the
 * 15-minute access token lapsed) would trip exactly that.
 *
 * So renewals take turns across tabs (Web Locks API), and a tab that waited
 * while another tab renewed reuses that fresh session instead of presenting
 * the token that was just replaced. Each renewal also restarts the backend's
 * inactivity window (REFRESH_TOKEN_EXPIRY), which is what keeps an
 * occasionally-used session alive.
 *
 * Only a 401 means the session is over. A 5xx, a rate limit or no network is
 * "unavailable" — the session is left alone and the request fails with a
 * retryable error, rather than signing someone out over a server hiccup.
 * Same code as Venue's and Organizer's lib/api/client.ts.
 */
export type RefreshOutcome = "refreshed" | "expired" | "unavailable"

const REFRESH_LOCK = "baatasari-refresh-user"
const LAST_REFRESH_KEY = "baatasari-last-refresh-user"
// Comfortably longer than one renewal round-trip, far shorter than the
// 15-minute access token a renewal produces.
const RECENT_REFRESH_MS = 10_000

const readLastRefresh = (): number => {
  try {
    return Number(window.localStorage.getItem(LAST_REFRESH_KEY)) || 0
  } catch {
    return 0
  }
}

const writeLastRefresh = (): void => {
  try {
    window.localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()))
  } catch {
    // Private mode / storage disabled — the lock alone still serialises.
  }
}

const renewSession = async (): Promise<RefreshOutcome> => {
  if (Date.now() - readLastRefresh() < RECENT_REFRESH_MS) return "refreshed"

  let response: Response
  try {
    response = await fetch(withPrefix("/auth/refresh"), {
      method: "POST",
      credentials: "include"
    })
  } catch {
    return "unavailable"
  }

  if (response.ok) {
    writeLastRefresh()
    return "refreshed"
  }
  return response.status === 401 ? "expired" : "unavailable"
}

let refreshPromise: Promise<RefreshOutcome> | null = null

/**
 * Renews the session with no side effects — callers decide what an expired
 * session means for them (app/providers.tsx's bootstrap treats it as a quiet
 * "not signed in"). Shared by every caller in this tab (one request in flight
 * at a time) and by every tab of this site (one renewal at a time).
 */
export const refreshSession = (): Promise<RefreshOutcome> => {
  if (!refreshPromise) {
    const locks = typeof navigator !== "undefined" ? navigator.locks : undefined
    // Awaited inside an async function: the lock API types its result as a
    // nested promise, which await flattens.
    const run = async (): Promise<RefreshOutcome> =>
      locks ? await locks.request(REFRESH_LOCK, renewSession) : renewSession()
    refreshPromise = run().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

const refreshAccessToken = async (): Promise<RefreshOutcome> => {
  const outcome = await refreshSession()
  if (outcome === "expired") {
    useAuthStore.getState().clearSession()
    // Tell sibling tabs to clear too — otherwise tab B continues
    // showing the user as "signed in" until its next API call.
    broadcastSessionCleared("refresh_failed")
    redirectToLogin()
  }
  return outcome
}

type RequestOptions = RequestInit & {
  auth?: boolean
  retryOn401?: boolean
  activeRole?: ActiveRole | null
  timeoutMs?: number
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    auth = false,
    retryOn401 = auth,
    activeRole,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    headers,
    ...init
  } = options
  const roleHeader = activeRole ?? useAuthStore.getState().activeRole
  const finalHeaders = new Headers(headers)

  if (!finalHeaders.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    finalHeaders.set("Content-Type", "application/json")
  }

  if (roleHeader) {
    finalHeaders.set("x-active-role", roleHeader)
  }

  const makeRequest = async () => {
    const controller = init.signal ? null : new AbortController()
    const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

    try {
      return await fetch(withPrefix(path), {
        ...init,
        headers: finalHeaders,
        credentials: "include",
        signal: init.signal ?? controller?.signal
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ApiError(408, {
          code: "REQUEST_TIMEOUT",
          message: "Request timed out. Please try again."
        })
      }
      throw error
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  }

  let response = await makeRequest()

  if (response.status === 401 && retryOn401) {
    const outcome = await refreshAccessToken()
    if (outcome === "expired") {
      throw new ApiError(401, {
        code: "TOKEN_INVALID",
        message: "Session expired. Please log in again."
      })
    }
    if (outcome === "unavailable") {
      throw new ApiError(503, {
        code: "SERVICE_UNAVAILABLE",
        message: "Couldn't reach Baatasari. Check your connection and try again."
      })
    }
    response = await makeRequest()
  }

  if (response.status >= 500 && response.status < 600) {
    await new Promise(r => setTimeout(r, 1000))
    response = await makeRequest()
  }

  const payload = await tryParseJson(response)
  if (!response.ok) {
    throw new ApiError(
      response.status,
      (payload as ApiErrorPayload | null) ?? {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected request failure."
      }
    )
  }

  return payload as T
}
