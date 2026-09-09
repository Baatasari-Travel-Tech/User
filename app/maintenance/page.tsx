import Image from "next/image"
import { MAINTENANCE_ALLOWED } from "@/lib/seo"

export const metadata = {
  title: "Under Maintenance",
  description: "Baatasari is currently undergoing scheduled maintenance.",
}

type MaintenanceInfo = {
  message: string | null
  /** From site-config, so changing it there changes it here. */
  contactEmail: string
  /**
   * The "we'll be back at" time, already parsed and validated to be in the
   * future. Null when absent, unparseable, or already past.
   *
   * Resolved here rather than in the component because comparing against
   * `Date.now()` is an impure read: doing it while rendering makes the output
   * depend on when React happens to run, which is exactly what the
   * react-hooks/purity rule flags. Data fetching is the right place for it.
   */
  backAt: Date | null
}

const FALLBACK_CONTACT_EMAIL = "contact-us@baatasari.com"

/**
 * Every event, every admin and every organizer is in India, and the time an
 * admin picks in the app is their local wall-clock time. This page renders on
 * the server, where Node's zone is UTC — formatting without an explicit
 * timeZone silently produced the UTC reading, so a window set for 11:00 PM
 * advertised itself as 5:30 pm.
 */
const IST = "Asia/Kolkata"

const formatBackAt = (at: Date) => ({
  day: at.toLocaleString("en-IN", { dateStyle: "medium", timeZone: IST }),
  time: `${at.toLocaleString("en-IN", { timeStyle: "short", timeZone: IST })}`,
})

const DEFAULT_MESSAGE =
  "We're carrying out some scheduled upgrades. Everything will be back exactly as you left it — thanks for your patience."

// Best-effort only — if this fails, the default copy below still renders
// correctly on its own. This page is excluded from the middleware's
// maintenance rewrite, so fetching here never recurses into itself.
async function getMaintenanceInfo(): Promise<MaintenanceInfo> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""
    const res = await fetch(`${base}/api/v1/site-config`, { cache: "no-store" })
    if (!res.ok) throw new Error(String(res.status))
    const json = (await res.json()) as {
      data?: {
        maintenanceMessage?: string | null
        maintenanceTo?: string | null
        contactEmail?: string | null
      }
    }
    const to = json?.data?.maintenanceTo ?? null
    const parsed = to ? new Date(to) : null
    return {
      message: json?.data?.maintenanceMessage ?? null,
      contactEmail: json?.data?.contactEmail?.trim() || FALLBACK_CONTACT_EMAIL,
      backAt:
        parsed && !Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()
          ? parsed
          : null,
    }
  } catch {
    return { message: null, contactEmail: FALLBACK_CONTACT_EMAIL, backAt: null }
  }
}

/**
 * Scoped to this route rather than globals.css: during maintenance the gate
 * rewrites every URL here, but the rest of the time this page is never seen,
 * and there is no reason for every other route to carry these bytes.
 *
 * Every animation below moves only `opacity` and `transform`. Both are handled
 * by the compositor, so none of this triggers layout or paint. Deliberately no
 * animated `filter: blur()` — re-rasterising a blurred layer every frame is
 * what made the About hero stutter, and the lesson generalises.
 */
const css = `
@keyframes mtn-rise {
  from { opacity: 0; transform: translate3d(0, 16px, 0); }
  to   { opacity: 1; transform: none; }
}
@keyframes mtn-drift {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to   { transform: translate3d(4%, -3%, 0) scale(1.12); }
}
@keyframes mtn-pulse {
  0%, 100% { opacity: 1;   transform: scale(1); }
  50%      { opacity: .35; transform: scale(.78); }
}
@keyframes mtn-halo {
  0%        { opacity: .5; transform: scale(.85); }
  70%, 100% { opacity: 0;  transform: scale(2.6); }
}
@keyframes mtn-sweep {
  from { transform: translate3d(-100%, 0, 0); }
  to   { transform: translate3d(320%, 0, 0); }
}

/* Staggered entrance. --d is set per element so the order reads top-to-bottom
   instead of everything arriving at once. */
.mtn-in {
  animation: mtn-rise .62s cubic-bezier(.22, .61, .36, 1) both;
  animation-delay: var(--d, 0ms);
}
.mtn-glow  { animation: mtn-drift 19s ease-in-out infinite alternate; }
.mtn-glow2 { animation: mtn-drift 24s ease-in-out infinite alternate-reverse; }
.mtn-dot   { animation: mtn-pulse 2.4s ease-in-out infinite; }
.mtn-halo  { animation: mtn-halo 2.4s ease-out infinite; }
.mtn-sweep { animation: mtn-sweep 2.8s cubic-bezier(.5, 0, .5, 1) infinite; }

/* Underline that grows from the left instead of appearing all at once. */
.mtn-link::after {
  content: "";
  position: absolute;
  left: 0; right: 0; bottom: -2px;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform .28s cubic-bezier(.22, .61, .36, 1);
}
.mtn-link:hover::after,
.mtn-link:focus-visible::after { transform: scaleX(1); }

/* Not a preference to second-guess: vestibular disorders make drifting and
   pulsing genuinely unpleasant. Everything lands in its final state instead. */
@media (prefers-reduced-motion: reduce) {
  .mtn-in, .mtn-glow, .mtn-glow2, .mtn-dot, .mtn-halo, .mtn-sweep {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .mtn-link::after { transition: none; }
}
`

// Static fallback page shown across the whole site while the admin has
// maintenance mode ON. The middleware rewrites every public route here, so
// this must stand entirely on its own even if the data fetch below fails.
export default async function MaintenancePage() {
  const { message, backAt, contactEmail } = await getMaintenanceInfo()
  const back = backAt ? formatBackAt(backAt) : null
  const links = MAINTENANCE_ALLOWED.filter(({ path }) => path !== "/contact-us")

  return (
    <main
      // 100svh, not min-h-screen. `vh` on mobile is the viewport with the URL
      // bar *hidden*, so a page sized to it is taller than what is actually on
      // screen and scrolls by exactly the height of the browser chrome. `svh`
      // is the small viewport — chrome showing — which is what a visitor lands
      // in, and this page is supposed to sit still.
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-[#f5efe4] px-4 py-6 text-center text-[#0c1D37] sm:px-6 sm:py-10"
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Ambient wash. Static gradients that are slowly transformed — the blur
          is baked into the gradient's own falloff, so nothing re-rasterises. */}
      <div
        aria-hidden
        className="mtn-glow pointer-events-none absolute -left-1/4 -top-1/3 h-[38rem] w-[38rem] rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle at center, rgba(43,69,112,.16), rgba(43,69,112,0) 68%)",
        }}
      />
      <div
        aria-hidden
        className="mtn-glow2 pointer-events-none absolute -bottom-1/3 -right-1/4 h-[34rem] w-[34rem] rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle at center, rgba(194,150,46,.18), rgba(194,150,46,0) 68%)",
        }}
      />

      <section className="relative z-10 w-full max-w-md rounded-[28px] border border-[#e3d9c4] bg-[#faf9f6]/90 px-6 py-8 shadow-[0_24px_60px_-32px_rgba(12,29,55,.45)] sm:px-9 sm:py-10">
        <div className="mtn-in flex justify-center" style={{ "--d": "0ms" } as React.CSSProperties}>
          <Image
            src="/brand-96.webp"
            alt="Baatasari"
            width={72}
            height={72}
            className="h-14 w-14 rounded-2xl bg-white p-2 shadow-[0_10px_24px_-12px_rgba(12,29,55,.5)] sm:h-16 sm:w-16"
            priority
          />
        </div>

        <div className="mtn-in mt-5" style={{ "--d": "70ms" } as React.CSSProperties}>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e3d9c4] bg-[#f0e8d8] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-[#8a7136]">
            <span className="relative flex h-2 w-2">
              <span className="mtn-halo absolute inset-0 rounded-full bg-[#c2962e]" />
              <span className="mtn-dot relative h-2 w-2 rounded-full bg-[#c2962e]" />
            </span>
            Scheduled maintenance
          </span>
        </div>

        <h1
          className="mtn-in mt-4 text-[1.7rem] font-semibold leading-[1.15] tracking-tight sm:text-4xl"
          style={{ "--d": "140ms" } as React.CSSProperties}
        >
          We&apos;ll be back shortly
        </h1>

        {/* Reads as "something is happening", which a static page otherwise
            cannot convey. Purely decorative, so it is hidden from assistive
            tech rather than announced as content. */}
        <div
          aria-hidden
          className="mtn-in mx-auto mt-4 h-[3px] w-28 overflow-hidden rounded-full bg-[#e3d9c4]"
          style={{ "--d": "200ms" } as React.CSSProperties}
        >
          <div className="mtn-sweep h-full w-1/3 rounded-full bg-[#c2962e]" />
        </div>

        <p
          className="mtn-in mx-auto mt-4 max-w-[34ch] text-[13px] leading-relaxed text-[#0c1D37]/65 sm:text-[15px]"
          style={{ "--d": "260ms" } as React.CSSProperties}
        >
          {message?.trim() ? message : DEFAULT_MESSAGE}
        </p>

        {/* The single most useful fact on the page, so it gets its own frame
            rather than being one more line of grey text. */}
        {back ? (
          <div
            className="mtn-in mt-5 inline-flex flex-col items-center rounded-2xl border border-[#e3d9c4] bg-white/70 px-5 py-2.5"
            style={{ "--d": "320ms" } as React.CSSProperties}
          >
            <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#a98b4f]">
              Expected back
            </span>
            <span className="mt-0.5 text-sm font-semibold sm:text-base">{back.time}</span>
            <span className="text-[11px] text-[#0c1D37]/45">{back.day}</span>
          </div>
        ) : null}

        {/* Links to the real contact page, which the maintenance gate lets
            through — a mailto: does nothing at all on a device with no mail
            client configured, which is most desktop browsers. */}
        <div className="mtn-in mt-6" style={{ "--d": "380ms" } as React.CSSProperties}>
          <a
            href="/contact-us"
            className="group inline-flex items-center gap-2 rounded-full bg-[#0c1D37] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgba(12,29,55,.9)] transition-[transform,box-shadow,background-color] duration-300 ease-out hover:-translate-y-0.5 hover:bg-[#16294a] hover:shadow-[0_18px_34px_-14px_rgba(12,29,55,.85)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2962e] active:translate-y-0"
          >
            Need help? Contact us
            <span
              aria-hidden
              className="transition-transform duration-300 ease-out group-hover:translate-x-1"
            >
              →
            </span>
          </a>
        </div>

        {/* Spelled out as well, so there is still a way to reach us if the
            contact form's API is part of whatever is being worked on. */}
        <p className="mtn-in mt-3 text-[11px] text-[#0c1D37]/45" style={{ "--d": "440ms" } as React.CSSProperties}>
          or email{" "}
          <a
            href={`mailto:${contactEmail}`}
            className="mtn-link relative font-medium text-[#8a7136] transition-colors duration-200 hover:text-[#0c1D37]"
          >
            {contactEmail}
          </a>
        </p>

        {/* The pages that stay up during maintenance, listed from the same
            allowlist the gate uses — so a link here can never point at
            something the gate rewrites out from under it. */}
        <nav
          className="mtn-in mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-[#e3d9c4] pt-5"
          style={{ "--d": "500ms" } as React.CSSProperties}
        >
          {links.map(({ path, label }) => (
            <a
              key={path}
              href={path}
              className="mtn-link relative text-[11px] text-[#0c1D37]/50 transition-colors duration-200 hover:text-[#0c1D37]"
            >
              {label}
            </a>
          ))}
        </nav>
      </section>

      <p
        className="mtn-in relative z-10 mt-5 text-[11px] text-[#0c1D37]/40"
        style={{ "--d": "560ms" } as React.CSSProperties}
      >
        © Baatasari · Discover, Connect, Experience
      </p>
    </main>
  )
}
