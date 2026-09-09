"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type {
  ActiveRole,
  LegacyProfile,
  OrganizerProfile,
  SafeUser,
  SimplePreferences,
  TalentProfile,
} from "@/types/api"

type AuthStore = {
  bootstrapping: boolean
  hasHydrated: boolean
  user: SafeUser | null
  activeRole: ActiveRole
  profile: LegacyProfile | null
  organizerProfile: OrganizerProfile | null
  preferences: SimplePreferences | null
  talentProfile: TalentProfile | null
  setBootstrapping: (value: boolean) => void
  setHasHydrated: (value: boolean) => void
  setUser: (user: SafeUser | null) => void
  setActiveRole: (role: ActiveRole) => void
  setProfile: (profile: LegacyProfile | null) => void
  setOrganizerProfile: (profile: OrganizerProfile | null) => void
  setPreferences: (preferences: SimplePreferences | null) => void
  setTalentProfile: (profile: TalentProfile | null) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      bootstrapping: true,
      hasHydrated: false,
      user: null,
      activeRole: "USER",
      profile: null,
      organizerProfile: null,
      preferences: null,
      talentProfile: null,
      setBootstrapping: (value) => set({ bootstrapping: value }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setUser: (user) => set({ user }),
      setActiveRole: (role) => set({ activeRole: role }),
      setProfile: (profile) => set({ profile }),
      setOrganizerProfile: (profile) => set({ organizerProfile: profile }),
      setPreferences: (preferences) => set({ preferences }),
      setTalentProfile: (profile) => set({ talentProfile: profile }),
      clearSession: () =>
        set({
          user: null,
          activeRole: "USER",
          profile: null,
          organizerProfile: null,
          preferences: null,
          talentProfile: null,
        }),
    }),
    {
      name: "baatasari-auth",
      // localStorage (not sessionStorage) so a cached identity survives full
      // reloads and new tabs. No tokens are stored here — auth itself stays in
      // httpOnly cookies; this is only a UI snapshot to render instantly while
      // the session revalidates in the background.
      storage: createJSONStorage(() => localStorage),
      // Rehydrate manually (in Providers) so server and first client render
      // agree (both start empty), avoiding hydration mismatches.
      skipHydration: true,
      partialize: (state) => ({
        activeRole: state.activeRole,
        user: state.user,
        profile: state.profile,
        organizerProfile: state.organizerProfile,
        talentProfile: state.talentProfile,
        preferences: state.preferences,
      }),
    }
  )
)
