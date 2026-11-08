/**
 * Shown while checkout reads the event fresh (it is never served from a saved
 * copy, so a ticket type the organizer just changed is always the current one).
 * The same frame as the page: title, the event, the form, the order summary.
 */
const bar = "animate-pulse rounded-full bg-slate-200"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading checkout…</span>
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-16 pt-6 md:px-6 md:pt-10 lg:px-8">
        <div className={`${bar} h-4 w-14`} />
        <div className="mt-5 h-9 w-72 max-w-full animate-pulse rounded-xl bg-slate-200 md:h-10" />
        <div className={`${bar} mt-3 h-4 w-96 max-w-full`} />

        <div className="mt-6 overflow-hidden rounded-3xl bg-white">
          <div className="flex flex-col md:flex-row">
            <div className="aspect-[16/10] w-full animate-pulse bg-slate-200 md:aspect-auto md:min-h-40 md:w-72 md:shrink-0" />
            <div className="flex-1 space-y-4 p-5 md:p-6">
              <div className={`${bar} h-3 w-24`} />
              <div className="h-6 w-3/4 animate-pulse rounded-xl bg-slate-200" />
              <div className="grid gap-4 md:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className={`${bar} h-3 w-14`} />
                    <div className={`${bar} h-4 w-28`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="space-y-6">
            <div className="space-y-4 rounded-3xl bg-white p-5 md:p-7">
              <div className={`${bar} h-5 w-36`} />
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <div className={`${bar} h-3 w-24`} />
                  <div className="h-11 w-full animate-pulse rounded-lg bg-slate-100" />
                </div>
              ))}
            </div>
            <div className="space-y-4 rounded-3xl bg-white p-5 md:p-7">
              <div className={`${bar} h-5 w-32`} />
              <div className="h-16 w-full animate-pulse rounded-lg bg-slate-100" />
            </div>
          </div>
          <div className="space-y-4 rounded-3xl bg-white p-5 md:p-7">
            <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-12 w-full animate-pulse rounded-xl bg-slate-300" />
          </div>
        </div>
      </div>
    </div>
  )
}
