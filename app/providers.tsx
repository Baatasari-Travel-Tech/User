"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { apiRequest, refreshSession } from "@/lib/api/client"
import {
  broadcastSessionCleared,
  broadcastSessionStarted,
  onSessionCleared,
  onSessionStarted,
} from "@/lib/auth/session-channel"
import { useAuthStore } from "@/lib/auth/store"
import { ApiError } from "@/types/api"
import type {
  ActiveRole,
  ApiEnvelope,
  AuthResponse,
  LegacyProfile,
  LoginChallengeResponse,
  OrganizerProfile,
  SafeUser,
  SimplePreferences,
  TalentProfile,
  UserProfile,
} from "@/types/api"

// login() either completes the session directly, or (2FA-enabled accounts)
// hands back a pending ticket the caller must resolve via verifyTwoFactor.
export type LoginResult = { requires2FA: false } | { requires2FA: true; pending: string }

export type AppRole = "USER" | "EVENT_ORGANIZER" | "TALENT"

export type UserRoleRecord = {
  id: string
  role: AppRole
  onboarding_completed: boolean
  updated_at: string
}

type Session = {
  user: {
    id: string
    email: string
  }
}

type AuthCtx = {
  session: Session | null
  user: SafeUser | null
  isLoading: boolean
  hasHydrated: boolean
  profile: LegacyProfile | null
  organizerProfile: OrganizerProfile | null
  talentProfile: TalentProfile | null
  isLoadingProfile: boolean
  organizerVerificationStatus: string | null
  isLoadingOrganizerStatus: boolean
  userPreferences: SimplePreferences | null
  isLoadingPreferences: boolean
  userRoles: UserRoleRecord[]
  isLoadingRoles: boolean
  activeRole: AppRole
  switchRole: (role: AppRole) => Promise<void>
  refreshProfile: () => Promise<void>
  refreshOrganizerStatus: () => Promise<void>
  refreshPreferences: () => Promise<void>
  refreshRoles: () => Promise<void>
  updateProfile: (payload: Record<string, unknown>, options?: { refresh?: boolean }) => Promise<void>
  updateUserPreferences: (payload: Partial<SimplePreferences>) => Promise<void>
  completeRoleOnboarding: (role: AppRole, payload?: Record<string, unknown>) => Promise<void>
  login: (payload: { email: string; password: string }) => Promise<LoginResult>
  verifyTwoFactor: (pending: string, code: string) => Promise<void>
  requestTwoFactorRecovery: (pending: string) => Promise<void>
  confirmTwoFactorRecovery: (pending: string, otp: string) => Promise<void>
  register: (payload: { email: string; password: string; role: "USER" | "ORGANIZER"; acceptedTerms: boolean }) => Promise<void>
  googleAuth: (idToken: string, role?: "USER" | "ORGANIZER") => Promise<void>
  logout: () => Promise<void>
  logoutAllDevices: () => Promise<void>
  bootstrap: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | undefined>(undefined)

const queryClient = new QueryClient()

const absolutizeMediaUrl = (url: string | null | undefined): string | null => {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  // Relative path returned by Django (e.g. "/media/avatars/...") — resolve against the API origin.
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "")
  if (!apiBase) return url
  return `${apiBase}${url.startsWith("/") ? "" : "/"}${url}`
}

const normalizeLegacyProfile = (user: SafeUser | null, profile: UserProfile | null): LegacyProfile | null => {
  if (!user && !profile) return null

  return {
    email: user?.email ?? null,
    full_name: profile?.fullName ?? null,
    phone: profile?.phone ?? null,
    avatar_url: absolutizeMediaUrl(profile?.avatarUrl ?? null),
    dob: profile?.dob ?? null,
    location: profile?.location ?? null,
    locationArea: profile?.locationArea ?? null,
    locationCity: profile?.locationCity ?? null,
    locationState: profile?.locationState ?? null,
    locationPincode: profile?.locationPincode ?? null,
    locationLat: profile?.locationLat ?? null,
    locationLng: profile?.locationLng ?? null,
    gender: profile?.gender ?? null,
    profession: profile?.profession ?? null,
    global_onboarding_completed: user?.onboardingStatus === "COMPLETED",
  }
}

const getOrganizerVerificationStatus = (user: SafeUser | null) => {
  if (!user || user.role !== "ORGANIZER") return null
  if (!user.organizerEmailVerified) return "EMAIL_NOT_VERIFIED"
  if (!user.organizerDocumentsSubmitted) return "DOCUMENTS_REQUIRED"
  if (user.organizerApproved) return "APPROVED"
  // CHANGES_REQUESTED / REJECTED / PENDING — the richer status from
  // Admin-Backend's review state machine, so /organizer/pending can explain
  // *why* instead of showing the same "under review" copy for all three.
  if (user.organizerReviewStatus === "CHANGES_REQUESTED") return "CHANGES_REQUESTED"
  if (user.organizerReviewStatus === "REJECTED") return "REJECTED"
  return "PENDING"
}

const userToSession = (user: SafeUser | null): Session | null =>
  user
    ? {
        user: {
          id: user.id,
          email: user.email,
        },
      }
    : null

const mapProfilePayload = (payload: Record<string, unknown>) => ({
  fullName:
    typeof payload.full_name === "string"
      ? payload.full_name
      : typeof payload.fullName === "string"
        ? payload.fullName
        : undefined,
  phone: typeof payload.phone === "string" ? payload.phone : undefined,
  dob: typeof payload.dob === "string" ? payload.dob : undefined,
  location: typeof payload.location === "string" ? payload.location : undefined,
  locationArea: typeof payload.locationArea === "string" ? payload.locationArea : undefined,
  locationCity: typeof payload.locationCity === "string" ? payload.locationCity : undefined,
  locationState: typeof payload.locationState === "string" ? payload.locationState : undefined,
  locationPincode: typeof payload.locationPincode === "string" ? payload.locationPincode : undefined,
  locationLat: typeof payload.locationLat === "number" ? payload.locationLat : undefined,
  locationLng: typeof payload.locationLng === "number" ? payload.locationLng : undefined,
  gender: typeof payload.gender === "string" ? payload.gender : undefined,
  profession: typeof payload.profession === "string" ? payload.profession : undefined,
  organizerDisplayName:
    typeof payload.organizer_display_name === "string"
      ? payload.organizer_display_name
      : typeof payload.organizerDisplayName === "string"
        ? payload.organizerDisplayName
        : undefined,
  organizerDescription:
    typeof payload.organizer_description === "string"
      ? payload.organizer_description
      : typeof payload.organizerDescription === "string"
        ? payload.organizerDescription
        : undefined,
  companyName:
    typeof payload.company_name === "string"
      ? payload.company_name
      : typeof payload.companyName === "string"
        ? payload.companyName
        : undefined,
  companyWebsite:
    typeof payload.company_website === "string"
      ? payload.company_website
      : typeof payload.companyWebsite === "string"
        ? payload.companyWebsite
        : undefined,
})

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be inside <Providers>")
  return ctx
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [isLoadingOrganizerStatus, setIsLoadingOrganizerStatus] = useState(false)
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false)
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)

  const {
    bootstrapping,
    hasHydrated,
    user,
    activeRole,
    profile,
    organizerProfile,
    preferences,
    talentProfile,
    setBootstrapping,
    setUser,
    setActiveRole,
    setProfile,
    setOrganizerProfile,
    setPreferences,
    setTalentProfile,
    clearSession,
  } = useAuthStore()

  const loadProfile = useCallback(async (currentUser: SafeUser | null = useAuthStore.getState().user) => {
    if (!currentUser) {
      setProfile(null)
      return
    }

    setIsLoadingProfile(true)
    try {
      const response = await apiRequest<{ data: { user: SafeUser; profile: UserProfile } }>("/user/profile", {
        auth: true,
      })
      setProfile(normalizeLegacyProfile(response.data.user, response.data.profile))
      setUser(response.data.user)
    } finally {
      setIsLoadingProfile(false)
    }
  }, [setProfile, setUser])

  const loadOrganizerProfile = useCallback(async (currentUser: SafeUser | null = useAuthStore.getState().user) => {
    if (!currentUser || currentUser.role !== "ORGANIZER") {
      setOrganizerProfile(null)
      return
    }

    setIsLoadingOrganizerStatus(true)
    try {
      const response = await apiRequest<{ data: { user: SafeUser; profile: OrganizerProfile } }>("/organizer/profile", {
        auth: true,
      })
      setOrganizerProfile(response.data.profile)
      setUser(response.data.user)
    } finally {
      setIsLoadingOrganizerStatus(false)
    }
  }, [setOrganizerProfile, setUser])

  const loadPreferences = useCallback(async (currentUser: SafeUser | null = useAuthStore.getState().user) => {
    if (!currentUser || currentUser.onboardingStatus !== "COMPLETED") {
      setPreferences(null)
      return
    }

    setIsLoadingPreferences(true)
    try {
      const response = await apiRequest<{ data: { preferences: SimplePreferences } }>("/user/preferences", {
        auth: true,
      })
      setPreferences(response.data.preferences)
    } finally {
      setIsLoadingPreferences(false)
    }
  }, [setPreferences])

  const loadTalentProfile = useCallback(async (currentUser: SafeUser | null = useAuthStore.getState().user) => {
    if (!currentUser || currentUser.onboardingStatus !== "COMPLETED") {
      setTalentProfile(null)
      return
    }

    try {
      const response = await apiRequest<{ data: { profile: TalentProfile } }>("/talent/profile", {
        auth: true,
      })
      setTalentProfile(response.data.profile)
    } catch {
      setTalentProfile(null)
    }
  }, [setTalentProfile])

  const hydrateForUser = useCallback(async (currentUser: SafeUser) => {
    const nextActiveRole: ActiveRole = currentUser.role === "ORGANIZER" ? "ORGANIZER" : "USER"

    setUser(currentUser)
    setActiveRole(nextActiveRole)
    // Prime minimal profile state immediately so route guards can use
    // onboarding status from the auth payload even if profile APIs lag.
    setProfile(normalizeLegacyProfile(currentUser, null))

    // /user/preferences and /talent/profile sit behind requireUserAccess, which
    // rejects an ORGANIZER unless their active role is USER. Calling them while
    // acting as an organizer is a guaranteed 403 on every login: harmless
    // (allSettled swallows it) but it fills the console with red herrings.
    // switchRole() loads them when the organizer moves to USER mode.
    const canUseUserRoutes = nextActiveRole === "USER"
    if (!canUseUserRoutes) {
      setPreferences(null)
      setTalentProfile(null)
    }

    await Promise.allSettled([
      loadProfile(currentUser),
      loadOrganizerProfile(currentUser),
      ...(canUseUserRoutes ? [loadPreferences(currentUser), loadTalentProfile(currentUser)] : []),
    ])
  }, [
    loadOrganizerProfile,
    loadPreferences,
    loadProfile,
    loadTalentProfile,
    setActiveRole,
    setPreferences,
    setProfile,
    setTalentProfile,
    setUser,
  ])

  const bootstrap = useCallback(async () => {
    setBootstrapping(true)
    try {
      // Probe the session. We pass retryOn401:false and refresh manually so a
      // logged-out 401 stays a quiet "not signed in" — it must NOT route through
      // the API client's global refresh, which hard-redirects to /login and would
      // loop the bootstrap on the login page itself.
      const fetchMe = () =>
        apiRequest<ApiEnvelope<{ user: SafeUser }>>("/auth/me", {
          auth: true,
          retryOn401: false,
          activeRole: useAuthStore.getState().activeRole,
        })

      let me: ApiEnvelope<{ user: SafeUser }>
      try {
        // Common case: the access-token cookie is still valid — a single call.
        me = await fetchMe()
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          // Access token expired: renew directly (no redirect side-effect),
          // then retry. refreshSession() takes turns with this site's other
          // tabs — several tabs bootstrapping at once (a restored browser
          // session) must not each present the same refresh token, which the
          // backend treats as theft and signs the account out everywhere.
          // Expired → handled below as logged-out; unavailable (5xx, network)
          // → left signed in, same as any other transient failure.
          const outcome = await refreshSession()
          if (outcome !== "refreshed") {
            throw new ApiError(outcome === "expired" ? 401 : 503, {
              code: outcome === "expired" ? "TOKEN_INVALID" : "SERVICE_UNAVAILABLE",
              message: outcome === "expired" ? "Session expired." : "Couldn't reach Baatasari.",
            })
          }
          me = await fetchMe()
        } else {
          throw error
        }
      }

      await hydrateForUser(me.data.user)
    } catch (error) {
      // Only clear session on explicit auth rejection — not on transient network errors
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearSession()
      }
      // Transient failures (timeout, 5xx, network) leave the session intact
    } finally {
      setBootstrapping(false)
    }
  }, [clearSession, hydrateForUser, setBootstrapping])

  // Rehydrate the persisted identity snapshot first (synchronous localStorage
  // read), so cached pages can render instantly before bootstrap revalidates.
  useEffect(() => {
    const result = useAuthStore.persist.rehydrate()
    Promise.resolve(result).finally(() => {
      useAuthStore.getState().setHasHydrated(true)
    })
  }, [])

  // Kick off the session probe once, on mount.
  //
  // bootstrap() sets `bootstrapping` as its first act, which trips
  // react-hooks/set-state-in-effect. That rule exists to catch state derived
  // from other state in an effect, causing a second render for no reason. This
  // is the other thing an effect is for: talking to an external system. The
  // session lives on a server, the answer arrives over the network, and a
  // loading flag has to be raised before the request goes out.
  //
  // The alternatives are worse. Calling it during render makes rendering
  // impure and fires it twice under StrictMode; moving it to an event has no
  // event to hang from — the trigger IS "the app started". Rewriting the auth
  // bootstrap to satisfy a heuristic would put every session at risk for no
  // correctness gain.
  //
  // `setBootstrapping` was in the dependency array and is not used here; the
  // effect only ever called bootstrap, which closes over it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void bootstrap()
  }, [bootstrap])

  // Cross-tab session sync. When tab A signs out (or hits a refresh
  // failure), the API client broadcasts on the "baatasari-auth" channel.
  // Tab B's listener fires here and clears its own session state, so the
  // UI doesn't lie about being signed in until the next API call 401s.
  useEffect(() => {
    const unsubscribe = onSessionCleared(() => {
      clearSession()
    })
    return unsubscribe
  }, [clearSession])

  // And the other direction: tab A signed in. Signed-in-only pages here
  // already react to the store (ProtectedRoute), so:
  // - same account already showing: nothing to do;
  // - a different account showing: reload, so nothing from the previous
  //   account stays on screen;
  // - signed out, on a login/register screen: go where signing in from this
  //   tab would have gone (the form's `?redirect`, else home — which sends a
  //   signed-in user on to their own home page);
  // - signed out anywhere else: pick the session up in place (bootstrap).
  useEffect(() => {
    const unsubscribe = onSessionStarted((userId) => {
      const current = useAuthStore.getState().user
      if (current?.id === userId) return
      if (current) {
        window.location.reload()
        return
      }
      const { pathname, search } = window.location
      const params = new URLSearchParams(search)
      if (pathname === "/login" || pathname === "/register" || params.has("auth")) {
        const redirect = params.get("redirect")
        window.location.replace(redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/")
        return
      }
      void bootstrap()
    })
    return unsubscribe
  }, [bootstrap])

  // One signed-in device per account: signing in on another device ends this
  // one's session on the backend at once, but an idle tab only finds out on
  // its next request. So whenever the person comes back to a signed-in tab,
  // quietly re-check — if the session is gone, the API client's own expired-
  // session path signs this tab (and its sibling tabs) out. Throttled to once
  // per 30s so flicking between windows doesn't fire a request each time.
  useEffect(() => {
    let lastCheck = 0
    const recheck = () => {
      if (document.visibilityState !== "visible" || !useAuthStore.getState().user) return
      if (Date.now() - lastCheck < 30_000) return
      lastCheck = Date.now()
      apiRequest("/auth/me", { auth: true }).catch(() => undefined)
    }
    document.addEventListener("visibilitychange", recheck)
    window.addEventListener("focus", recheck)
    return () => {
      document.removeEventListener("visibilitychange", recheck)
      window.removeEventListener("focus", recheck)
    }
  }, [])

  // Every way of signing in on this tab calls this once the session exists, so
  // the site's other open tabs sign in too. bootstrap()/hydrateForUser() do
  // NOT broadcast — they only load a session that already exists, and they're
  // what the other tabs run when they hear this.
  const announceSignIn = (user: SafeUser) => {
    broadcastSessionStarted(user.id)
  }

  const login = async (payload: { email: string; password: string }): Promise<LoginResult> => {
    const response = await apiRequest<AuthResponse | LoginChallengeResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    if ("requires2FA" in response.data) {
      return { requires2FA: true, pending: response.data.pending }
    }

    await hydrateForUser(response.data.user)
    announceSignIn(response.data.user)
    return { requires2FA: false }
  }

  const verifyTwoFactor = async (pending: string, code: string) => {
    const response = await apiRequest<AuthResponse>("/auth/verify-2fa", {
      method: "POST",
      body: JSON.stringify({ pending, code }),
    })

    await hydrateForUser(response.data.user)
    announceSignIn(response.data.user)
  }

  // Lost-authenticator recovery: emails a code that, once confirmed, turns
  // 2FA off and completes the login in one step (see auth.service on the
  // backend). The user can re-enable 2FA from Security settings afterward.
  const requestTwoFactorRecovery = async (pending: string) => {
    await apiRequest("/auth/2fa/recovery/request", {
      method: "POST",
      body: JSON.stringify({ pending }),
    })
  }

  const confirmTwoFactorRecovery = async (pending: string, otp: string) => {
    const response = await apiRequest<AuthResponse>("/auth/2fa/recovery/confirm", {
      method: "POST",
      body: JSON.stringify({ pending, otp }),
    })

    await hydrateForUser(response.data.user)
    announceSignIn(response.data.user)
  }

  const register = async (payload: { email: string; password: string; role: "USER" | "ORGANIZER"; acceptedTerms: boolean }) => {
    const response = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    })

    setActiveRole(payload.role === "ORGANIZER" ? "ORGANIZER" : "USER")
    await hydrateForUser(response.data.user)
    announceSignIn(response.data.user)
  }

  const logout = async () => {
    try {
      await apiRequest("/auth/logout", {
        method: "POST",
        auth: true,
      })
    } finally {
      clearSession()
      // Tell any other tabs in this browser that the session is gone
      // — same channel that auto-refresh failure uses.
      broadcastSessionCleared("logout")
    }
  }

  // Ends every signed-in session for this account, not just this tab's —
  // e.g. after recovering from a lost 2FA device, or if a device is suspected
  // compromised.
  const logoutAllDevices = async () => {
    try {
      await apiRequest("/auth/logout-all", {
        method: "POST",
        auth: true,
      })
    } finally {
      clearSession()
      broadcastSessionCleared("logout")
    }
  }

  const googleAuth = async (idToken: string, role: "USER" | "ORGANIZER" = "USER") => {
    const response = await apiRequest<AuthResponse>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken, role }),
    })

    setActiveRole(response.data.user.role === "ORGANIZER" ? "ORGANIZER" : "USER")
    await hydrateForUser(response.data.user)
    announceSignIn(response.data.user)
  }

  const switchRole = async (role: AppRole) => {
    if (role === "EVENT_ORGANIZER" && useAuthStore.getState().user?.role === "ORGANIZER") {
      setActiveRole("ORGANIZER")
      return
    }

    setActiveRole("USER")
    // User routes are reachable now. An organizer's bootstrap skips these (they
    // would 403 while acting as an organizer), so this is where they get loaded.
    // Set first: the store is synchronous, so these requests carry the USER role.
    await Promise.allSettled([loadPreferences(), loadTalentProfile()])
  }

  const updateProfile = async (payload: Record<string, unknown>) => {
    await apiRequest("/user/profile", {
      method: "PUT",
      auth: true,
      body: JSON.stringify(mapProfilePayload(payload)),
    })

    await loadProfile()
  }

  const updateUserPreferences = async (payload: Partial<SimplePreferences>) => {
    const response = await apiRequest<{ data: { preferences: SimplePreferences } }>("/user/preferences", {
      method: "PUT",
      auth: true,
      body: JSON.stringify(payload),
    })

    setPreferences(response.data.preferences)
  }

  const completeRoleOnboarding = async (role: AppRole, payload?: Record<string, unknown>) => {
    if (role === "EVENT_ORGANIZER") {
      await apiRequest("/organizer/onboarding/complete", {
        method: "POST",
        auth: true,
        body: JSON.stringify(payload ?? {}),
      })
      const currentUser = useAuthStore.getState().user
      if (currentUser) {
        const completedUser: SafeUser = {
          ...currentUser,
          onboardingStatus: "COMPLETED",
          updatedAt: new Date().toISOString(),
        }
        setUser(completedUser)
        setProfile(normalizeLegacyProfile(completedUser, null))
      }
      void bootstrap()
      return
    }

    await apiRequest("/user/onboarding/complete", {
      method: "POST",
      auth: true,
      body: JSON.stringify(mapProfilePayload(payload ?? {})),
    })

    const currentUser = useAuthStore.getState().user
    if (currentUser) {
      const completedUser: SafeUser = {
        ...currentUser,
        onboardingStatus: "COMPLETED",
        updatedAt: new Date().toISOString(),
      }
      setUser(completedUser)
      setProfile(normalizeLegacyProfile(completedUser, null))
    }

    void bootstrap()
  }

  const userRoles = useMemo<UserRoleRecord[]>(() => {
    if (!user) return []

    const roles: UserRoleRecord[] = [
      {
        id: `${user.id}-user`,
        role: "USER",
        onboarding_completed: user.onboardingStatus === "COMPLETED",
        updated_at: user.updatedAt,
      },
    ]

    if (user.role === "ORGANIZER") {
      roles.push({
        id: `${user.id}-organizer`,
        role: "EVENT_ORGANIZER",
        onboarding_completed: user.onboardingStatus === "COMPLETED",
        updated_at: user.updatedAt,
      })
    }

    if (talentProfile?.paymentStatus === "PAID") {
      roles.push({
        id: `${user.id}-talent`,
        role: "TALENT",
        onboarding_completed: true,
        updated_at: talentProfile.updatedAt ?? user.updatedAt,
      })
    }

    return roles
  }, [talentProfile, user])

  const value: AuthCtx = {
    session: userToSession(user),
    user,
    isLoading: bootstrapping,
    hasHydrated,
    profile,
    organizerProfile,
    talentProfile,
    isLoadingProfile,
    organizerVerificationStatus: getOrganizerVerificationStatus(user),
    isLoadingOrganizerStatus,
    userPreferences: preferences
      ? {
          ...preferences,
          travel: preferences.travel ?? [],
          interests: preferences.interests ?? [],
          food: preferences.food ?? [],
          emotional: preferences.emotional ?? [],
          logistics: preferences.logistics ?? [],
        }
      : null,
    isLoadingPreferences,
    userRoles,
    isLoadingRoles,
    activeRole: activeRole === "ORGANIZER" ? "EVENT_ORGANIZER" : "USER",
    switchRole,
    refreshProfile: () => loadProfile(),
    refreshOrganizerStatus: () => loadOrganizerProfile(),
    refreshPreferences: () => loadPreferences(),
    refreshRoles: async () => {
      setIsLoadingRoles(true)
      try {
        await bootstrap()
      } finally {
        setIsLoadingRoles(false)
      }
    },
    updateProfile,
    updateUserPreferences,
    completeRoleOnboarding,
    login,
    verifyTwoFactor,
    requestTwoFactorRecovery,
    confirmTwoFactorRecovery,
    register,
    googleAuth,
    logout,
    logoutAllDevices,
    bootstrap,
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </QueryClientProvider>
  )
}
