import Link from "next/link"

export default function ForbiddenPage() {
  return (
    <main className="page-x flex min-h-[calc(100dvh-96px)] items-center justify-center py-12">
      <div className="max-w-xl rounded-[2rem] border border-white/60 bg-white/90 p-8 text-center shadow-[0_25px_60px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-900">403</p>
        <h1 className="mt-3 font-bricolage text-5xl text-slate-950">Access denied</h1>
        <p className="mt-4 text-sm text-slate-500">This route is not available for your current account state or active role.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-brand-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
        >
          Back to home
        </Link>
      </div>
    </main>
  )
}
