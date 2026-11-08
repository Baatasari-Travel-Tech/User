/**
 * Shown the moment someone clicks an event, while the server fetches the event
 * and builds the page. The same frame as the page itself (banner, facts, the
 * ticket card at the right, the content cards), so nothing jumps when the real
 * page replaces it.
 */
const bar = "animate-pulse rounded-full bg-slate-200"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the event…</span>

      {/* Banner */}
      <div className="bg-(--brand-navy)">
        <div className="mx-auto w-full max-w-[1400px] px-4 pb-8 pt-5 md:px-6 md:pb-12 lg:px-10">
          <div className="h-5 w-24 animate-pulse rounded-full bg-white/20" />
          <div className="mt-5 grid gap-5 md:grid-cols-[300px_minmax(0,1fr)] md:items-center md:gap-9">
            <div className="aspect-[16/10] w-full animate-pulse rounded-2xl bg-white/15 md:aspect-[10/7]" />
            <div>
              <div className="flex gap-2">
                <div className="h-6 w-24 animate-pulse rounded-full bg-white/20" />
                <div className="h-6 w-20 animate-pulse rounded-full bg-white/20" />
              </div>
              <div className="mt-4 h-9 w-4/5 animate-pulse rounded-xl bg-white/20 md:h-12" />
              <div className="mt-3 h-9 w-2/5 animate-pulse rounded-xl bg-white/20 md:hidden" />
              <div className="mt-5 flex flex-wrap gap-6">
                <div className="h-4 w-28 animate-pulse rounded-full bg-white/15" />
                <div className="h-4 w-32 animate-pulse rounded-full bg-white/15" />
                <div className="h-4 w-36 animate-pulse rounded-full bg-white/15" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6 md:px-6 md:pt-8 lg:px-10">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-8 lg:gap-y-6">
          {/* Facts */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-3xl bg-white p-5 md:grid-cols-4 md:px-7 md:py-5 lg:col-start-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-200" />
                <div className="space-y-2">
                  <div className="h-3 w-10 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
                </div>
              </div>
            ))}
          </div>

          {/* Ticket card */}
          <div className="rounded-3xl bg-white p-5 md:p-6 lg:col-start-2 lg:row-span-4 lg:row-start-1">
            <div className="flex items-center justify-between">
              <div className={`${bar} h-5 w-32`} />
              <div className={`${bar} h-6 w-16`} />
            </div>
            <div className="mt-4 h-16 animate-pulse rounded-2xl border border-slate-200 bg-slate-50" />
            <div className="mt-5 flex items-end justify-between">
              <div className={`${bar} h-4 w-24`} />
              <div className={`${bar} h-7 w-20`} />
            </div>
            <div className="mt-4 h-12 w-full animate-pulse rounded-full bg-slate-300" />
          </div>

          {/* Content cards */}
          <div className="space-y-3 rounded-3xl bg-white p-5 md:p-7 lg:col-start-1">
            <div className={`${bar} h-6 w-40`} />
            <div className={`${bar} h-4 w-full`} />
            <div className={`${bar} h-4 w-11/12`} />
            <div className={`${bar} h-4 w-3/4`} />
          </div>
          <div className="rounded-3xl bg-white p-5 md:p-7 lg:col-start-1">
            <div className={`${bar} h-6 w-24`} />
            <div className="mt-5 flex gap-4">
              <div className="h-12 w-12 animate-pulse rounded-full bg-slate-200" />
              <div className="space-y-2">
                <div className={`${bar} h-4 w-32`} />
                <div className={`${bar} h-3 w-20`} />
              </div>
            </div>
          </div>
          <div className="rounded-3xl bg-white p-5 md:p-7 lg:col-start-1">
            <div className={`${bar} h-6 w-20`} />
            <div className="mt-4 grid gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
              <div className="h-44 animate-pulse rounded-2xl bg-slate-200" />
              <div className="space-y-3">
                <div className={`${bar} h-5 w-48`} />
                <div className={`${bar} h-4 w-64 max-w-full`} />
                <div className={`${bar} h-9 w-36`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
