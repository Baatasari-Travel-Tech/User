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

let refreshPromise: Promise<boolean> | null = null

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

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = fetch(withPrefix("/auth/refresh"), {
      method: "POST",
      credentials: "include"
    })
      .then(async (response) => {
        if (!response.ok) {
          useAuthStore.getState().clearSession()
          // Tell sibling tabs to clear too — otherwise tab B continues
          // showing the user as "signed in" until its next API call.
          broadcastSessionCleared("refresh_failed")
          redirectToLogin()
          return false
        }
        return true
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
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
    const refreshed = await refreshAccessToken()
    if (!refreshed) {
      throw new ApiError(401, {
        code: "TOKEN_INVALID",
        message: "Session expired. Please log in again."
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
