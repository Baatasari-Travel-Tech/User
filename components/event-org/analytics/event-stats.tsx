"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { EventDetail } from "@/types/api"
import { UNLIMITED_TICKET_CAPACITY } from "@/components/event-org/data/create-event-data"

type Props = {
  event: EventDetail | null
  isLoading: boolean
}

export function EventStats({ event, isLoading }: Props) {
  const tiers = event?.ticketTiers ?? []

  const totalSold = tiers.reduce((sum, tier) => sum + Number(tier.soldCount || 0), 0)
  const totalCapacity = tiers.reduce((sum, tier) => sum + Number(tier.quantity || 0), 0)
  const isUnlimited = tiers.some((tier) => Number(tier.quantity) >= UNLIMITED_TICKET_CAPACITY)
  const totalAvailable = isUnlimited ? null : Math.max(0, totalCapacity - totalSold)

  const bookedPercent =
    !isUnlimited && totalCapacity > 0
      ? Math.round((totalSold / totalCapacity) * 100)
      : 0

  if (isLoading) {
    return (
      <div className="w-full animate-pulse">
        <div className="rounded-xl border bg-card p-6 h-48" />
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="items-start pb-2">
        <CardTitle className="text-lg font-medium text-foreground">
          Ticket Registrations
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Total capacity:{" "}
          <span className="font-semibold text-foreground">
            {isUnlimited ? "Unlimited" : totalCapacity}
          </span>
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex justify-between w-full text-sm">
          <div>
            <span className="text-xs font-semibold uppercase text-muted-foreground">Registered</span>
            <div className="text-3xl font-bold text-foreground mt-0.5">{totalSold}</div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold uppercase text-muted-foreground">Available</span>
            <div className="text-3xl font-bold text-foreground mt-0.5">
              {isUnlimited ? "∞" : (totalAvailable ?? 0)}
            </div>
          </div>
        </div>

        {!isUnlimited && totalCapacity > 0 && (
          <div>
            <div className="flex gap-2 w-full">
              {totalSold > 0 && (
                <div
                  className="h-3 rounded-full transition-all duration-300"
                  style={{ backgroundColor: "#7c83db", flex: totalSold }}
                />
              )}
              {(totalAvailable ?? 0) > 0 && (
                <div
                  className="h-3 rounded-full"
                  style={{ backgroundColor: "#a3e635", flex: totalAvailable ?? 0 }}
                />
              )}
              {totalSold === 0 && (totalAvailable ?? 0) === 0 && (
                <div className="h-3 rounded-full bg-muted w-full" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{bookedPercent}% booked</p>
          </div>
        )}

        {tiers.length > 1 && (
          <div className="mt-2 space-y-2">
            {tiers.map((tier) => {
              const sold = Number(tier.soldCount || 0)
              const capacity = Number(tier.quantity || 0)
              const unlimited = capacity >= UNLIMITED_TICKET_CAPACITY
              const pct = !unlimited && capacity > 0 ? Math.round((sold / capacity) * 100) : 0
              return (
                <div key={tier.id ?? tier.name} className="flex items-center gap-3 text-xs">
                  <span className="w-28 truncate font-medium text-slate-700">{tier.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100">
                    {!unlimited && (
                      <div
                        className="h-2 rounded-full"
                        style={{ backgroundColor: "#7c83db", width: `${pct}%` }}
                      />
                    )}
                  </div>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {sold} / {unlimited ? "∞" : capacity}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
