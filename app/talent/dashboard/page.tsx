"use client"

import { useQuery } from "@tanstack/react-query"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { PageShell, SectionCard, StatGrid } from "@/components/platform/page-shell"
import { SkeletonGrid, StateBlock } from "@/components/platform/state-block"
import { apiRequest } from "@/lib/api/client"
import type { TalentProfile } from "@/types/api"

type TalentDashboardResponse = {
  profile: TalentProfile
  stats: {
    activeStatus: string
    totalBookings: number
  }
}

export default function TalentDashboardPage() {
  const query = useQuery({
    queryKey: ["talent-dashboard"],
    queryFn: async () => {
      const response = await apiRequest<{ data: TalentDashboardResponse }>("/talent/dashboard", { auth: true })
      return response.data
    },
  })

  return (
    <ProtectedRoute requireTalentPaid>
      <PageShell
        eyebrow="Talent dashboard"
        title="Your talent profile is live"
        description="This area is ready for future booking workflows while already reflecting your verified onboarding state."
      >
        {query.isLoading ? (
          <SkeletonGrid />
        ) : query.isError || !query.data ? (
          <StateBlock tone="error" title="Talent dashboard unavailable" description="We couldn’t load your talent data from the API." />
        ) : (
          <>
            <StatGrid
              items={[
                { label: "Status", value: query.data.stats.activeStatus, hint: "Derived from verified payment state." },
                { label: "Bookings", value: String(query.data.stats.totalBookings), hint: "Reserved for future matching and booking features." },
                { label: "Stage name", value: query.data.profile.stageName ?? "-", hint: "Your public-facing talent identity." },
                { label: "Main skill", value: query.data.profile.mainSkill ?? "-", hint: "Primary performance specialty." },
              ]}
            />

            <div className="grid gap-6 lg:grid-cols-2">
              <SectionCard title="Profile summary">
                <div className="grid gap-3 text-sm leading-6 text-slate-600">
                  <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
                    <p className="font-medium text-slate-950">Experience</p>
                    <p className="mt-1">{query.data.profile.experienceLevel ?? "-"} · {query.data.profile.yearsOfExperience ?? "-"}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
                    <p className="font-medium text-slate-950">Availability</p>
                    <p className="mt-1">{query.data.profile.availableFor.join(", ") || "-"}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
                    <p className="font-medium text-slate-950">Preferred slots</p>
                    <p className="mt-1">{query.data.profile.preferredSlots.join(", ") || "-"}</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="What’s next">
                <div className="grid gap-3 text-sm leading-6 text-slate-600">
                  <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
                    Your profile is stored centrally in the backend and can now power organizer discovery flows later.
                  </div>
                  <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
                    Payment metadata is already preserved server-side, so future renewals or upgrades can hook into the same model.
                  </div>
                </div>
              </SectionCard>
            </div>
          </>
        )}
      </PageShell>
    </ProtectedRoute>
  )
}
