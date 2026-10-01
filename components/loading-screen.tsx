"use client";

import type { FC } from "react";

/**
 * The full-page "Loading your experience" screen. Same file in all three
 * frontends (User, Organizer, Venue — copy-pasted, not a shared package, per
 * THREE-FRONTENDS.md §5), used the same way in each: app/loading.tsx (route
 * transitions), the Google sign-in return page, and the signed-in-only page
 * gates while the session is checked. Keep the three copies identical.
 *
 * Ring speeds, the reversed middle ring and the dot delays are inline styles
 * on purpose: they were written as `animation-duration-[3s]`,
 * `direction-[reverse]` and `[animation-delay:…]` classes, but the first two
 * don't exist in Tailwind and all three lost to the `animation` shorthand from
 * `animate-spin`/`animate-dot-bounce` — so every ring spun at the same speed
 * and the dots never moved. An inline style always wins over a class.
 * `motion-reduce:animate-none` still turns all of it off.
 *
 * Needs `animate-dot-bounce` from globals.css and the brand-900 / brand-700 /
 * background / foreground colour tokens.
 */
export const LoadingScreen: FC = () => {
  return (
    <div
      // Was `bg-brand-900/5 backdrop-blur-[6px]`. A full-screen backdrop-blur
      // re-filters everything behind it on every frame, and since the page now
      // server-renders there is a whole painted page back there to filter —
      // while the loader's own spinners animate on top. Opaque costs nothing,
      // and it no longer shows a half-legible page through the overlay.
      className="fixed inset-0 z-50 flex min-h-screen flex-col items-center justify-center bg-background font-sans"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading Baatasari experience"
    >
      {/* backdrop-blur-2xl dropped too — with an opaque backdrop there is
          nothing behind the card left to blur, so it was pure cost. */}
      <div className="relative w-[min(92vw,420px)] rounded-[28px] border border-white/60 bg-white/70 px-10 py-12 text-center shadow-[0_30px_90px_rgba(12,29,55,0.18)]">
        <div className="absolute inset-0 -z-10 rounded-[28px] bg-linear-to-br from-white/80 via-white/40 to-white/10" />

        <div className="relative mx-auto w-fit">
          <div className="absolute inset-0 rounded-full bg-brand-900/10 blur-sm animate-pulse" />
          <div
            className="relative h-14 w-14 rounded-full border-4 border-transparent border-t-brand-900/80 animate-spin motion-reduce:animate-none"
            style={{ animationDuration: "3s" }}
          >
            <div
              className="absolute inset-0.5 rounded-full border-[3px] border-transparent border-t-brand-700/70 animate-spin motion-reduce:animate-none"
              style={{ animationDuration: "2s", animationDirection: "reverse" }}
            />
            <div
              className="absolute inset-1.25 rounded-full border-2 border-transparent border-b-brand-900/60 animate-spin motion-reduce:animate-none"
              style={{ animationDuration: "1s" }}
            />
          </div>
        </div>

        <div className="mt-6">
          <h1 className="text-3xl font-semibold tracking-[0.35em] text-transparent bg-linear-to-r from-brand-900 to-brand-700 bg-clip-text">
            BAATASARI
          </h1>
          <p className="mt-2 text-sm text-foreground/70 animate-pulse">
            Loading your experience
          </p>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="h-2 w-2 rounded-full bg-brand-900/30 animate-dot-bounce motion-reduce:animate-none" />
          <div
            className="h-2 w-2 rounded-full bg-brand-900/30 animate-dot-bounce motion-reduce:animate-none"
            style={{ animationDelay: "0.2s" }}
          />
          <div
            className="h-2 w-2 rounded-full bg-brand-900/30 animate-dot-bounce motion-reduce:animate-none"
            style={{ animationDelay: "0.4s" }}
          />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
