"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"
import type {
  LegacyProfile,
  SafeUser,
  SimplePreferences,
  TalentProfile,
} from "@/types/api"

// No activeRole / organizerProfile any more: the in-app USER↔ORGANIZER mode
// went with the legacy organizer screens (organizers use
// organizer.baatasari.com). Old snapshots in localStorage that still carry
// those keys are simply ignored on rehydrate.
type AuthStore = {
  bootstrapping: boolean
  hasHydrated: boolean
  user: SafeUser | null
  profile: LegacyProfile | null
  preferences: SimplePreferences | null
  talentProfile: TalentProfile | null
  setBootstrapping: (value: boolean) => void
  setHasHydrated: (value: boolean) => void
  setUser: (user: SafeUser | null) => void
  setProfile: (profile: LegacyProfile | null) => void
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
      profile: null,
      preferences: null,
      talentProfile: null,
      setBootstrapping: (value) => set({ bootstrapping: value }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setPreferences: (preferences) => set({ preferences }),
      setTalentProfile: (profile) => set({ talentProfile: profile }),
      clearSession: () =>
        set({
          user: null,
          profile: null,
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
        user: state.user,
        profile: state.profile,
        talentProfile: state.talentProfile,
        preferences: state.preferences,
      }),
    }
  )
)
