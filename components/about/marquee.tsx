"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

const ITEMS = [
  "Music",
  "Comedy",
  "Food & Dining",
  "Workshops",
  "Sports",
  "Art & Culture",
  "Tech Meetups",
  "Nightlife",
  "Theatre",
  "Markets",
  "Festivals",
  "Wellness",
];

/**
 * Infinite category ticker — a thin band of constant motion signalling the
 * breadth of the platform. Two copies of the track scroll by -50% for a
 * seamless loop. Reduced-motion users get a static, centred row.
 */
export default function Marquee() {
  const reduce = useReducedMotion();
  const track = [...ITEMS, ...ITEMS];

  return (
    <div className="relative overflow-hidden border-y border-(--gold-bar-border) bg-(--gold-bar-bg) py-4">
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-(--gold-bar-bg) to-transparent md:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-(--gold-bar-bg) to-transparent md:w-32" />

      <motion.div
        className={`flex w-max items-center gap-6 md:gap-8 ${reduce ? "justify-center" : ""}`}
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={
          reduce ? undefined : { duration: 34, repeat: Infinity, ease: "linear" }
        }
      >
        {track.map((item, i) => (
          <span key={i} className="flex items-center gap-6 md:gap-8">
            <Link
              href={`/events?category=${encodeURIComponent(item)}`}
              className="font-poppins text-[13px] font-semibold uppercase tracking-[0.22em] text-(--brand-navy)/75 transition hover:text-(--brand-navy) md:text-sm"
            >
              {item}
            </Link>
            <span className="text-(--gold) text-xs">✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
