"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { format } from "date-fns"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/lib/api/client"
import { useAuth } from "@/app/providers"
import { useToast } from "@/components/use-toast"
import { ApiError } from "@/types/api"
import type { EventReviewsResponse } from "@/types/api"

type HighlightedDate = { date: Date; count: number }

type DateRequestItem = {
  requestedDate: string
  count: number
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  )
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

function StarPicker({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className="disabled:cursor-not-allowed"
        >
          <Star
            className={`h-6 w-6 transition ${n <= value ? "fill-amber-400 text-amber-400" : "text-gray-300 hover:text-amber-300"}`}
          />
        </button>
      ))}
    </div>
  )
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
      ))}
    </div>
  )
}

function ReviewsPanel({ eventId }: { eventId?: string }) {
  const { session } = useAuth()
  const { toast } = useToast()
  const isLoggedIn = Boolean(session?.user)
  const queryClient = useQueryClient()
  const { data, isLoading } = useEventReviews(eventId)
  const reviews = data?.reviews ?? []

  const [rating, setRating] = React.useState(0)
  const [comment, setComment] = React.useState("")

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest(`/events/${eventId}/reviews`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      })
    },
    onSuccess: () => {
      setRating(0)
      setComment("")
      toast({ title: "Thanks for your review!" })
      void queryClient.invalidateQueries({ queryKey: ["event-reviews", eventId] })
    },
    onError: (err) => {
      const message =
        err instanceof ApiError && err.code === "FORBIDDEN"
          ? "Only ticket holders can review this event."
          : err instanceof Error
            ? err.message
            : "Could not submit your review."
      toast({ title: "Couldn't submit review", description: message, variant: "destructive" })
    },
  })

  return (
    <div className="border border-border rounded-2xl p-6 md:p-8 bg-background shadow-sm flex flex-col overflow-hidden flex-1 min-w-70 lg:min-w-95 max-h-[70vh]">
      <div className="mb-4 flex items-center justify-between px-2">
        <h2 className="text-2xl font-bold text-blue-soft">Reviews</h2>
        {data && data.count > 0 ? (
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <StarRow rating={data.average} />
            {data.average.toFixed(1)} · {data.count}
          </div>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-gray-500">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            No reviews yet — be the first to share how it went.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map((review) => (
              <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{review.reviewerName}</p>
                  <StarRow rating={review.rating} />
                </div>
                {review.comment ? <p className="mt-1.5 text-sm text-gray-600">{review.comment}</p> : null}
                <p className="mt-1 text-xs text-gray-400">
                  {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(review.createdAt))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4 px-2">
        {isLoggedIn ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-700">Attended? Leave a review</p>
            <StarPicker value={rating} onChange={setRating} disabled={mutation.isPending} />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience (optional)"
              maxLength={1000}
              disabled={mutation.isPending}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-400"
              rows={2}
            />
            <Button
              className="w-full rounded-xl"
              disabled={rating === 0 || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Submitting..." : "Submit review"}
            </Button>
            <p className="text-[11px] text-gray-400">Only available to ticket holders for this event.</p>
          </div>
        ) : (
          <p className="text-center text-xs text-gray-500">Log in to write a review.</p>
        )}
      </div>
    </div>
  )
}

export function DateReviewsSection({ eventId }: { eventId?: string }) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonthStart = new Date(currentYear, now.getMonth(), 1)
  const [date, setDate] = React.useState<Date | undefined>(undefined)
  const [month, setMonth] = React.useState<Date>(currentMonthStart)
  const [submitted, setSubmitted] = React.useState(false)

  const queryClient = useQueryClient()
  const { data: dateRequests = [] } = useDateRequests(eventId)

  const mutation = useMutation({
    mutationFn: async (selectedDate: Date) => {
      await apiRequest(`/events/${eventId}/date-requests`, {
        method: "POST",
        body: JSON.stringify({ requestedDate: format(selectedDate, "yyyy-MM-dd") }),
      })
    },
    onSuccess: () => {
      setSubmitted(true)
      queryClient.invalidateQueries({ queryKey: ["event-date-requests", eventId] })
    },
  })

  const handleSubmit = () => {
    if (!date || !eventId) return
    mutation.mutate(date)
  }

  // Can't go before the current month; cap at December of the current year.
  const isFirstMonth = month.getMonth() === now.getMonth() && month.getFullYear() === currentYear
  const isLastMonth = month.getMonth() === 11 && month.getFullYear() === currentYear

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full justify-center items-center lg:items-stretch">
      {/* Calendar Card */}
      <div className="flex flex-col gap-6 w-full lg:w-auto">
        <div className="border border-border rounded-2xl p-6 md:p-8 bg-background shadow-sm flex flex-col overflow-hidden flex-1 min-w-70 lg:min-w-95">
          <h2 className="text-2xl font-bold text-blue-soft mb-6 px-2">Date Change</h2>
          <div className="flex items-center justify-between mb-6 px-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-transparent"
              disabled={isFirstMonth}
              onClick={() => {
                if (!isFirstMonth) setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }}
            >
              <ChevronLeft className={`h-5 w-5 ${isFirstMonth ? "text-gray-300" : "text-gray-600"}`} />
            </Button>

            <span className="text-lg text-gray-900 font-normal">
              {format(month, "MMMM yyyy")}
            </span>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-transparent"
              disabled={isLastMonth}
              onClick={() => {
                if (!isLastMonth) setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }}
            >
              <ChevronRight className={`h-5 w-5 ${isLastMonth ? "text-gray-300" : "text-gray-600"}`} />
            </Button>
          </div>

          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={date}
            onSelect={setDate}
            weekStartsOn={1}
            disabled={(d) => d < today || d.getFullYear() !== currentYear}
            formatters={{
              formatWeekdayName: (d) => format(d, "EEE"),
            }}
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
                const { day, modifiers, ...buttonProps } = props
                const dateObj = day.date
                const data = dateRequests.find((d) => isSameDay(d.date, dateObj))

                let wrapperClass = "bg-gray-50 text-gray-900 hover:bg-gray-100"
                if (data) wrapperClass = "bg-[#dcfce7] text-gray-900 hover:bg-[#bbf7d0]"
                if (modifiers.selected && !data) wrapperClass = "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
                if (modifiers.selected && data) wrapperClass = "border-2 border-emerald-500 bg-[#dcfce7] text-gray-900"
                if (modifiers.disabled) wrapperClass = "bg-gray-50 text-gray-300 cursor-not-allowed"

                return (
                  <button
                    {...buttonProps}
                    className={`w-full aspect-square flex flex-col items-center justify-center rounded-xl transition-all ${wrapperClass}`}
                  >
                    <span className="text-sm font-medium">{dateObj.getDate()}</span>
                    {data ? (
                      <span className="text-[10px] font-bold leading-none mt-0.5 text-emerald-600">
                        {data.count}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold opacity-0 leading-none mt-0.5" aria-hidden="true">
                        00
                      </span>
                    )}
                  </button>
                )
              },
            }}
          />

          <div className="mt-4 px-2">
            {submitted ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 text-center">
                Your date request has been submitted!
              </p>
            ) : (
              <Button
                className="w-full rounded-xl"
                disabled={!date || mutation.isPending || !eventId}
                onClick={handleSubmit}
              >
                {mutation.isPending
                  ? "Submitting..."
                  : date
                  ? `Request ${format(date, "dd/MM/yyyy")}`
                  : "Select a date to request"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <ReviewsPanel eventId={eventId} />
    </div>
  )
}
