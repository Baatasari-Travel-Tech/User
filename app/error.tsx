"use client"

import Link from "next/link"

/**
 * Shown when something throws while a page renders. The header stays (it sits
 * above this in the layout); "Try again" re-renders just this part.
 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto flex min-h-[60dvh] w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">That didn’t load properly</h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600">
        It’s on our side, not yours. Your booking and payment are not affected. Try again, or come back in a minute.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#0c1d37] px-7 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 px-7 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          Go to the home page
        </Link>
      </div>
      <p className="mt-6 text-sm text-slate-500">
        Still stuck? Write to{" "}
        <a className="underline underline-offset-2" href="mailto:contact-us@baatasari.com">
          contact-us@baatasari.com
        </a>
        .
      </p>
    </section>
  )
}
