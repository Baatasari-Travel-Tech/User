"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api/client"

type DateRequestItem = {
  requestedDate: string
  count: number
}

// Total pending date-change requests for an event — the same public endpoint
// the analytics calendar uses, summed for the dashboard/manage-events tiles.
export function useDateChangeCount(eventId?: string) {
  return useQuery({
    queryKey: ["event-date-requests-count", eventId],
    queryFn: async () => {
      const response = await apiRequest<{ data: { dateRequests: DateRequestItem[] } }>(
        `/events/${eventId}/date-requests`,
      )
      return response.data.dateRequests.reduce((sum, item) => sum + Number(item.count ?? 0), 0)
    },
    enabled: Boolean(eventId),
    staleTime: 60_000,
  })
}
