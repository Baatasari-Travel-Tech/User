"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { addMonths, subMonths, format } from "date-fns"
import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api/client"
import type { EventReviewsResponse } from "@/types/api"

function useEventReviews(eventId?: string) {
  return useQuery({
    queryKey: ["event-reviews", eventId],
    queryFn: async () => {
      const response = await apiRequest<{ data: EventReviewsResponse }>(`/events/${eventId}/reviews`)
      return response.data
    },
    enabled: Boolean(eventId),
  })
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          className={n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"}
        />
      ))}
    </div>
  )
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  )
}

type HighlightedDate = { date: Date; count: number }

type DateRequestItem = {
  requestedDate: string
  count: number
}

function useDateRequests(eventId?: string) {
  return useQuery({
    queryKey: ["event-date-requests", eventId],
    queryFn: async () => {
      const response = await apiRequest<{ data: { dateRequests: DateRequestItem[] } }>(
        `/events/${eventId}/date-requests`
      )
      return response.data.dateRequests.map((item) => ({
        date: new Date(item.requestedDate + "T00:00:00"),
        count: item.count,
      })) as HighlightedDate[]
    },
    enabled: Boolean(eventId),
  })
}

export function DateReviewsSection({
  eventId,
  dateRequests: propDateRequests,
}: {
  eventId?: string
  dateRequests?: HighlightedDate[]
}) {
  const [month, setMonth] = React.useState<Date>(new Date())

  const { data: fetchedDates } = useDateRequests(eventId)
  const dateRequests = eventId ? (fetchedDates ?? []) : (propDateRequests ?? [])
  const { data: reviewsData, isLoading: reviewsLoading } = useEventReviews(eventId)
  const reviews = reviewsData?.reviews ?? []

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[520px_1fr] lg:grid-cols-[480px_1fr] w-full">
      {/* Calendar Card */}
      <div className="flex flex-col gap-6 h-full">
        <div className="border border-border rounded-2xl p-6 md:p-8 bg-white shadow-sm flex flex-col overflow-hidden flex-1">
          <h2 className="text-2xl font-bold text-blue-soft mb-6 px-2">Date Change Requests</h2>
          <div className="flex items-center justify-between mb-6 px-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMonth((prev) => subMonths(prev, 1))}
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </Button>
            <span className="text-lg text-gray-900 font-normal">
              {format(month, "MMMM yyyy")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setMonth((prev) => addMonths(prev, 1))}
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </Button>
          </div>

          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            weekStartsOn={1}
            formatters={{ formatWeekdayName: (d) => format(d, "EEE") }}
            className="p-0 w-full max-w-full"
            classNames={{
              months: "w-full",
              month: "flex flex-col w-full gap-4",
              month_caption: "hidden",
              nav: "hidden",
              table: "w-full border-collapse",
              weekdays: "flex w-full",
              weekday: "text-gray-600 font-normal text-sm flex-1 text-center p-2",
              week: "flex w-full mt-2",
              day: "flex-1 p-1 text-center relative aspect-square",
              today: "bg-transparent",
              outside: "text-muted-foreground opacity-50",
              disabled: "text-muted-foreground opacity-50",
            }}
            components={{
              DayButton: (props) => {
                const { day, ...buttonProps } = props
                const dateObj = day.date
                const data = dateRequests.find((d) => isSameDay(d.date, dateObj))
                const wrapperClass = data
                  ? "bg-[#dcfce7] text-gray-900 hover:bg-[#bbf7d0]"
                  : "bg-white text-gray-900"

                return (
                  <button
                    {...buttonProps}
                    disabled
                    className={`w-full aspect-square flex flex-col items-center justify-center rounded-xl ${wrapperClass} cursor-default`}
                  >
                    <span className="text-sm font-medium">{dateObj.getDate()}</span>
                    {data ? (
                      <span className="text-[10px] font-bold leading-none mt-0.5 text-emerald-600">{data.count}</span>
                    ) : (
                      <span className="text-[10px] font-bold opacity-0 leading-none mt-0.5" aria-hidden="true">00</span>
                    )}
                  </button>
                )
              },
            }}
          />
        </div>
      </div>

      {/* Reviews */}
      <div className="relative w-full mt-6 lg:mt-0 lg:h-full">
        <div className="lg:absolute lg:inset-x-0 lg:bottom-0 lg:top-0 flex flex-col w-full h-auto lg:h-auto">
          <Card className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-xl font-bold text-blue-soft">Customer Reviews</CardTitle>
              {reviewsData && reviewsData.count > 0 ? (
                <div className="flex items-center gap-2">
                  <StarRow rating={reviewsData.average} size={16} />
                  <span className="text-sm font-semibold text-slate-700">
                    {reviewsData.average.toFixed(1)} · {reviewsData.count}
                  </span>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col overflow-y-auto py-4">
              {reviewsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading reviews...</p>
              ) : reviews.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center text-center py-12">
                  <p className="text-4xl mb-3">💬</p>
                  <p className="text-base font-semibold text-slate-700">No reviews yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Reviews will appear here once attendees submit them.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-slate-100 pb-4 last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{review.reviewerName}</p>
                        <StarRow rating={review.rating} />
                      </div>
                      {review.comment ? (
                        <p className="mt-1.5 text-sm text-slate-600">{review.comment}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-400">
                        {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(review.createdAt))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
