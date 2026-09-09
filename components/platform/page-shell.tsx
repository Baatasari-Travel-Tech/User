"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <main className={cn("page-x py-8 sm:py-10", className)}>
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-background p-6 shadow-[0_20px_60px_rgba(12,29,55,0.06)] sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-brand-900 via-brand-700 to-sky-500" />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              {eyebrow ? (
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand-900">{eyebrow}</p>
              ) : null}
              <h1 className="mt-2 font-bricolage text-3xl text-slate-950 sm:text-4xl">{title}</h1>
              {description ? <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}

export function SectionCard({
  title,
  description,
  children,
  className,
  id,
}: {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  // Anchor target, so a link can deep-link straight to this section
  // (e.g. /organizer/profile#bank-details from a "fix your bank details" email).
  // scroll-mt keeps the heading clear of the sticky header when jumped to.
  id?: string
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-5 sm:p-6",
        id ? "scroll-mt-24" : undefined,
        className,
      )}
    >
      {title ? <h2 className="text-lg font-semibold text-slate-950">{title}</h2> : null}
      {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
      <div className={cn(title || description ? "mt-5" : undefined)}>{children}</div>
    </section>
  )
}

export function StatGrid({
  items,
}: {
  items: Array<{ label: string; value: string; hint?: string }>
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-[1.5rem] border border-slate-200 bg-background p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{item.value}</p>
          {item.hint ? <p className="mt-2 text-sm text-slate-500">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}
