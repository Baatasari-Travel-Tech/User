"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchPublicSiteConfig } from "@/lib/api/site-config"

export const siteConfigQueryKey = ["public-site-config"]

/**
 * Whether the site is currently in maintenance, as the backend sees it.
 *
 * The middleware already gates routing, but it cannot tell the browser
 * anything a client component can read — so the pages that stay reachable
 * during maintenance (contact, the policy pages) would otherwise still render
 * a working "Login" button pointing at a route that no longer resolves.
 *
 * Defaults to false until the answer arrives, which means the auth controls can
 * flash for a moment on those pages before hiding. Deliberate: the alternative
 * is holding the header back on every normal page load for a request that
 * almost always says "not in maintenance". The actions are guarded separately,
 * so a click landing inside that window still does nothing.
 */
export function useMaintenance(): boolean {
  const { data } = useQuery({
    queryKey: siteConfigQueryKey,
    queryFn: fetchPublicSiteConfig,
    staleTime: 60_000,
    // Picks up the switch being flipped without needing a reload.
    refetchOnWindowFocus: true,
    retry: false,
  })
  return data?.maintenanceActive === true
}
