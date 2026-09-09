"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import Link from "next/link";
import { useShellReady } from "@/components/site-shell";

const HEADLINE = ["Discover", "the", "best", "things", "to", "do", "in", "your", "city"];

export default function Hero() {
  const reduce = useReducedMotion();
  // Every entrance below waits for the boot loader to start lifting. They used
  // to fire on mount, underneath an opaque overlay, and were long finished by
  // the time it cleared — which is why the page appeared to snap straight from
  // spinner to a fully settled hero.
  const shellReady = useShellReady();

  // The hero used to be scroll-linked: useScroll drove the background's y and
  // scale and the content's y and opacity, so everything drifted as you moved.
  // Removed deliberately — it reads as the section sliding rather than the page
  // scrolling. It was also the expensive kind of motion, recalculating layout
  // on every scroll frame for properties the compositor cannot handle alone.
  // The one-time entrance settle below is unaffected.

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.045, delayChildren: 0.04 },
    },
  };

  // Words rise and fade in.
  //
  // They used to also animate `filter: blur(10px)` -> `blur(0px)`, on a spring
  // with overshoot. Blur is the most expensive property to animate: it cannot
  // be handed to the compositor, so every frame re-rasterises the element —
  // and nine words animating at once meant nine simultaneous re-rasters on a
  // mid-range phone. That is the stutter. opacity and transform are the two
  // properties the compositor CAN animate on its own, so this is now GPU work
  // only. The spring is a tween for the same reason: it settled over roughly a
  // second, which reads as sluggish on the first thing a visitor sees.
  const word: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 26 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduce ? { duration: 0.2 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const rise: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <section
      className="hero-section relative min-h-[calc(100dvh-72px)] flex flex-col items-center justify-center px-6 py-16 overflow-hidden"
    >
      {/* Fixed background layer wrapping the one-time cinematic settle */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Scale only, and deliberately no opacity.

            No opacity because this image is the LCP element and an element at
            opacity 0 has not painted — starting there put a floor under LCP
            equal to however long the fade ran.

            No blur because animating `filter` over a full-viewport image is
            the single most expensive thing on this page: it re-rasterises the
            whole layer every frame instead of letting the compositor handle
            it. Scale alone is a GPU transform and costs nothing. */}
        <motion.div
          className="absolute inset-0"
          initial={reduce ? false : { scale: 1.08 }}
          animate={shellReady ? { scale: 1 } : { scale: 1.08 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Art direction needs real <source media> entries: the two crops are
              genuinely different images (1536x1024 landscape vs 759x1600
              portrait), and rendering both as next/image and hiding one with
              `hidden md:block` downloaded BOTH — CSS display:none does not
              cancel a fetch, and `priority` preloaded each of them. A <source>
              cannot point at /_next/image, so these are pre-encoded WebP
              (see scripts/build-assets.mjs). */}
          {/* AVIF first, WebP second, <img> last. Order is the selection
              order — the browser takes the first <source> it both matches and
              can decode, so the type-annotated AVIF entries must precede their
              WebP twins or they are never reached.

              Everything in package.json#browserslist decodes AVIF, so in
              practice the WebP lines are the fallback for browsers we do not
              target rather than the common path. The mobile hero is the LCP
              element: 122 KiB as WebP, 70 KiB as AVIF. */}
          <picture>
            <source media="(min-width: 768px)" type="image/avif" srcSet="/hero-bg.avif" />
            <source media="(min-width: 768px)" srcSet="/hero-bg.webp" />
            <source type="image/avif" srcSet="/hero-bg-mobile.avif" />
            <img
              src="/hero-bg-mobile.webp"
              alt=""
              fetchPriority="high"
              decoding="async"
              // One <img> now serves both crops, so the object-position has to
              // be per-breakpoint: the portrait mobile art was always centred,
              // only the landscape desktop art sits high.
              className="absolute inset-0 h-full w-full object-cover object-center md:object-[center_30%]"
            />
          </picture>
        </motion.div>
      </div>

      {/* Readability overlay — directional warm-cream gradient */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--background) 78%, transparent) 0%, color-mix(in srgb, var(--background) 60%, transparent) 45%, color-mix(in srgb, var(--background) 88%, transparent) 100%)",
        }}
      />

      {/* Soft brand glow */}
      <div
        aria-hidden
        // Was `blur-[120px]`. Blurring an 80vw square is a large, expensive
        // rasterisation on first paint — and pointless here, because the thing
        // being blurred is a radial gradient, which is already soft. The extra
        // colour stops below reproduce the falloff at no cost.
        className="absolute z-[1] -top-24 left-1/2 -translate-x-1/2 w-[80vw] max-w-3xl aspect-square rounded-full opacity-50 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--gold) 35%, transparent) 0%, color-mix(in srgb, var(--gold) 22%, transparent) 35%, color-mix(in srgb, var(--gold) 8%, transparent) 60%, transparent 78%)",
        }}
      />

      {/* One-time light streak sweeping across on load (the "swoosh").
          Mounted only once the shell is ready — a sweep nobody can see is a
          sweep that has been spent. */}
      {!reduce && shellReady && (
        <motion.div
          aria-hidden
          initial={{ x: "-130%" }}
          animate={{ x: "150%" }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-y-0 left-0 z-[2] w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none"
        />
      )}

      <motion.div
        variants={container}
        initial="hidden"
        animate={shellReady ? "show" : "hidden"}
        className="relative z-10 w-full max-w-4xl text-center"
      >
        {/* Kicker badge */}
        <motion.div variants={rise} className="mb-8 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-(--gold-bar-border) bg-(--gold-bar-bg)/80 px-4 py-1.5 text-sm font-medium text-(--gold-text) backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Curated events, venues &amp; experiences
          </span>
        </motion.div>

        {/* Title — springy word-by-word woosh */}
        <h1 className="hero-title font-bricolage font-bold tracking-tight leading-[1.04] text-4xl md:text-6xl lg:text-[4.75rem] mb-8">
          {HEADLINE.map((w, i) => (
            <motion.span key={i} variants={word} className="inline-block mr-[0.25em]">
              {w === "city" ? (
                <span className="bg-gradient-to-r from-(--brand-blue) to-(--gold) bg-clip-text text-transparent">
                  {w}
                </span>
              ) : (
                w
              )}
            </motion.span>
          ))}
        </h1>

        {/* Subtitle */}
        <motion.p
          variants={rise}
          className="hero-description font-poppins font-medium text-lg md:text-2xl leading-relaxed mb-10 max-w-2xl mx-auto"
        >
          Your city has more to offer than you think.
          <br className="hidden md:block" />
          Start exploring today.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={rise}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/events"
            className="hero-button group relative inline-flex items-center justify-center font-poppins font-bold text-lg px-12 py-4 rounded-full transition-all duration-300 hover:scale-[1.03] hover:shadow-xl cursor-pointer overflow-hidden"
          >
            <span className="relative z-10 flex items-center gap-2.5">
              Explore your city
              <span className="transition-transform duration-300 group-hover:translate-x-1.5">
                &raquo;
              </span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-[120%] group-hover:translate-x-[120%] transition-transform duration-[1100ms] ease-out" />
          </Link>

          <Link
            href="/for-organizers"
            className="font-poppins font-semibold text-lg px-8 py-4 rounded-full border border-(--brand-blue)/30 text-(--brand-navy) transition-all duration-300 hover:border-(--brand-blue) hover:bg-(--brand-navy)/[0.04]"
          >
            List your event
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
