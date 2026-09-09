"use client"

import type { ReactNode } from "react"

export function StateBlock({
  title,
  description,
  tone = "default",
  action,
}: {
  title: string
  description: string
  tone?: "default" | "error" | "success" | "warning"
  action?: ReactNode
}) {
  const toneClasses =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : tone === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-50 text-slate-700"

  return (
    <div className={`rounded-[1.5rem] border p-6 ${toneClasses}`}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function SkeletonGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-[1.5rem] border border-slate-200 bg-linear-to-br from-slate-100 via-white to-slate-100"
        />
      ))}
    </div>
  )
}
