import { apiRequest } from "@/lib/api/client"
import type { ApiEnvelope, SiteConfig } from "@/types/api"

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  instagram: "#",
  linkedin: "#",
  twitter: "#",
  contactEmail: "contact-us@baatasari.com",
  maintenanceEnabled: false,
  maintenanceMessage: null,
  maintenanceFrom: null,
  maintenanceTo: null,
  maintenanceActive: false,
}

// Public site config (social links + maintenance) for the footer / public pages.
// Served by the main backend at /api/v1/site-config (admin moved to its own service).
export const fetchPublicSiteConfig = async (): Promise<SiteConfig> => {
  try {
    const envelope = await apiRequest<ApiEnvelope<SiteConfig>>("/site-config")
    return envelope.data ?? { ...DEFAULT_SITE_CONFIG }
  } catch {
    return { ...DEFAULT_SITE_CONFIG }
  }
}
