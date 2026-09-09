"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Clock, MapPin, Users, Music, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { EventStatus } from "@/lib/events-data"

interface HandpickedEventCardProps {
    id: string
    image: string
    title: string
    price: string
    numericPrice?: number
    category: string
    date: string
    location: string
    time?: string
    day?: string
    ageRange?: string
    bookedCount?: number
    tag?: string
    chiefGuest?: string
    sponsors?: string
    eventTime?: string
    highlights?: string[]
    gridMode?: boolean
    compact?: boolean
    status?: EventStatus
    cancelled?: boolean
}

export function HandpickedEventCard({
    id,
    image,
    title,
    numericPrice = 0,
    category,
    date,
    location,
    time,
    day,
    ageRange,
    status,
    cancelled = false,
}: HandpickedEventCardProps) {
    // Tracked per-src (YouTube-style): the card renders its data immediately
    // and the thumbnail box shimmers until this image has actually loaded.
    const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
    const [erroredSrc, setErroredSrc] = useState<string | null>(null)
    const loaded = loadedSrc === image
    const errored = erroredSrc === image

    const isPast = status === "past"
    // Both cancelled and completed events render dimmed/greyed.
    const dimmed = cancelled || isPast
    const priceLabel = numericPrice <= 0 ? "Free" : `₹${Math.round(numericPrice)}`

    const card = (
            <Card className="flex h-full flex-col gap-0 overflow-hidden rounded-3xl border-x-0 border-b-0 border-t-2 border-(--brand-navy) bg-(--white) py-0 shadow-sm transition-all duration-300 hover:shadow-md">
                {/* Cover — fills flush to the rounded top edge (no card padding) */}
                {/* Covers are contract-locked 2:3 portrait (1000×1500) at upload —
                    the card shows the poster at its exact ratio, never cropped. */}
                <div className="relative aspect-[2/3] w-full shrink-0 overflow-hidden">
                    {image && !errored ? (
                        <>
                            {!loaded && (
                                <div className="absolute inset-0 animate-pulse bg-slate-200" aria-hidden />
                            )}
                            <Image
                                src={image}
                                alt={title}
                                fill
                                sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                                className={`object-cover transition-[transform,opacity] duration-500 group-hover:scale-105 ${
                                    !loaded ? "opacity-0" : dimmed ? "grayscale opacity-60" : "opacity-100"
                                }`}
                                onLoad={() => setLoadedSrc(image)}
                                onError={() => setErroredSrc(image)}
                            />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-slate-100" />
                    )}

                    {/* Status badge — top-right */}
                    {cancelled ? (
                        <span className="absolute right-3 top-3 z-10 rounded-full bg-rose-600 px-3 py-1 font-poppins text-[10px] font-bold uppercase tracking-wider text-white">
                            Cancelled
                        </span>
                    ) : isPast ? (
                        <span className="absolute right-3 top-3 z-10 rounded-full bg-(--brand-navy) px-3 py-1 font-poppins text-[10px] font-bold uppercase tracking-wider text-white">
                            Completed
                        </span>
                    ) : status === "live" || status === "upcoming" ? (
                        <span className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 font-poppins text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                            <span className="relative flex h-2 w-2">
                                {status === "live" ? (
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                ) : null}
                                <span
                                    className={`relative inline-flex h-2 w-2 rounded-full ${
                                        status === "live" ? "bg-emerald-500" : "bg-orange-500"
                                    }`}
                                />
                            </span>
                            {status === "live" ? "Live" : "Upcoming"}
                        </span>
                    ) : null}
                </div>

                {/* Body */}
                <CardContent className="flex flex-1 flex-col gap-1.5 p-3">
                    {/* Date · day · time */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-(--brand-blue)">
                            <Calendar className="h-4 w-4 shrink-0" />
                            <span className="truncate">{date}</span>
                            {day ? (
                                <span className="rounded-full border border-(--blue-100) bg-(--blue-50) px-2 py-0.5 text-[11px] font-bold text-(--brand-blue)">
                                    {day}
                                </span>
                            ) : null}
                        </div>
                        {time ? (
                            <div className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-(--gray-500)">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{time}</span>
                            </div>
                        ) : null}
                    </div>

                    {/* Title */}
                    <h3 className="font-poppins text-[18px] font-bold leading-tight text-(--brand-navy) line-clamp-2">
                        {title}
                    </h3>

                    {/* Category + age chips */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-(--gray-200) bg-(--gray-50) px-3 py-1 text-[12px] font-semibold text-(--gray-700)">
                            <Music className="h-3.5 w-3.5 text-(--brand-blue)" />
                            <span className="max-w-40 truncate">{category}</span>
                        </span>
                        {ageRange ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-(--gray-200) bg-(--gray-50) px-3 py-1 text-[12px] font-semibold text-(--gray-700)">
                                <Users className="h-3.5 w-3.5 text-(--brand-blue)" />
                                {ageRange}
                            </span>
                        ) : null}
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-1.5">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-(--brand-blue)" />
                        <span className="text-[14px] font-semibold text-(--brand-navy) line-clamp-1">
                            {location}
                        </span>
                    </div>

                    {/* Price + arrow */}
                    <div className="mt-auto flex items-end justify-between border-t border-(--gray-100) pt-2.5">
                        <div>
                            <p className="text-[10px] font-medium text-(--gray-400)">Starting from</p>
                            <p className="font-poppins text-[17px] font-bold text-(--brand-navy)">
                                {priceLabel}
                                {numericPrice > 0 ? (
                                    <span className="ml-1 text-[11px] font-medium text-(--gray-400)">onwards</span>
                                ) : null}
                            </p>
                        </div>
                        {!isPast ? (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--brand-navy) text-white transition group-hover:bg-(--brand-navy)/90">
                                <ArrowRight className="h-4 w-4" />
                            </span>
                        ) : null}
                    </div>
                </CardContent>
            </Card>
    )

    // Completed events have no detail page — show the card only (not clickable).
    if (isPast) {
        return <div className="block h-full w-full">{card}</div>
    }

    return (
        <Link href={`/events/${id}`} className="group block h-full w-full">
            {card}
        </Link>
    )
}
