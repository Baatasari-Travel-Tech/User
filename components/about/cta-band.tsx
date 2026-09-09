"use client";

import { motion } from "framer-motion";
import Link from "next/link";

/**
 * High-contrast CTA band that sits right after the hero. Breaks the all-cream
 * rhythm with one strong dark moment + a clear primary action.
 */
export default function CtaBand() {
  return (
    <section className="relative isolate overflow-hidden bg-(--brand-navy) py-20 md:py-28">
      {/* Dot-grid texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in srgb, var(--gold) 60%, transparent) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 75%)",
        }}
      />

      {/* Warm spotlight */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -z-[1] h-[120%] w-[70vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50 blur-[130px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--gold) 55%, transparent) 0%, transparent 70%)",
        }}
      />

      {/* gold hairline at top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-(--gold) to-transparent opacity-60" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        viewport={{ once: true }}
        className="relative z-10 mx-auto w-full max-w-3xl px-6 text-center"
      >
        <p className="font-poppins text-xs font-semibold uppercase tracking-[0.28em] text-(--gold) mb-5">
          For artists &amp; performers
        </p>

        <h2 className="font-bricolage font-bold text-4xl md:text-6xl tracking-tight text-(--white) leading-[1.05]">
          Your{" "}
          <span className="bg-gradient-to-r from-(--gold) via-amber-200 to-(--white) bg-clip-text text-transparent">
            stage
          </span>{" "}
          is waiting
        </h2>

        <p className="font-poppins text-lg md:text-xl text-(--white)/65 mt-6 max-w-xl mx-auto">
          Singers, anchors, dancers, photographers — get discovered by organizers
          booking talent for events near you.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/talent"
            className="font-poppins font-bold text-lg px-12 py-4 rounded-full bg-(--gold) text-(--brand-navy) shadow-[0_14px_40px_-10px_rgba(194,150,46,0.7)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_18px_50px_-8px_rgba(194,150,46,0.85)]"
          >
            Showcase your talent
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
