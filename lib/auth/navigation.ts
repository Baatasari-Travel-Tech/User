import type { SafeUser } from "@/types/api"

/**
 * Where a signed-in visitor of baatasari.com belongs: the events list once
 * their profile is set up, onboarding before that. Organizer and venue
 * accounts have their own sites (organizer.baatasari.com,
 * venue.baatasari.com), so nothing here routes to them.
 */
export function resolveUserHome(user: SafeUser | null): string {
  if (!user) return "/"
  return user.onboardingStatus === "COMPLETED" ? "/events" : "/onboarding"
}
