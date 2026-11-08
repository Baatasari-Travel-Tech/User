/**
 * Shown while checkout reads the event fresh (it is never served from a saved
 * copy, so a ticket type the organizer just changed is always the current one).
 * The same navy frame as the page: Back, the title, the event, the form.
 */
export default function Loading() {
  return (
    <div className="relative min-h-screen" aria-busy="true" aria-live="polite">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(60rem_40rem_at_0%_0%,rgba(37,99,235,0.30),transparent_60%),radial-gradient(60rem_40rem_at_100%_100%,rgba(56,189,248,0.22),transparent_60%),linear-gradient(135deg,#0c1d37,#142a4f_55%,#1a3a6b)]"
      />
      <span className="sr-only">Loading checkout…</span>
      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pb-16 pt-16 md:px-6 md:pt-24 lg:px-10">
        <div className="h-9 w-20 animate-pulse rounded-full bg-white/15" />
        <div className="mx-auto mt-10 max-w-6xl">
          <div className="h-9 w-80 max-w-full animate-pulse rounded-xl bg-white/20 md:h-12" />
          <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded-full bg-white/15" />

          <div className="mt-8 overflow-hidden rounded-3xl border border-white/15 bg-white/10">
            <div className="flex flex-col md:flex-row">
              <div className="h-44 w-full animate-pulse bg-white/15 md:h-40 md:w-72 md:shrink-0" />
              <div className="flex-1 space-y-4 p-5 md:p-6">
                <div className="h-3 w-24 animate-pulse rounded-full bg-white/15" />
                <div className="h-6 w-3/4 animate-pulse rounded-xl bg-white/20" />
                <div className="grid gap-3 md:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-10 animate-pulse rounded-xl bg-white/10" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/15 bg-white/[0.07] p-1">
            <div className="space-y-4 rounded-[1.4rem] bg-white p-6 md:p-8">
              <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-11 w-full animate-pulse rounded-lg bg-slate-100" />
                </div>
              ))}
              <div className="h-12 w-full animate-pulse rounded-xl bg-slate-300" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
