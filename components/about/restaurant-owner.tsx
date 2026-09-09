"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function RestaurantOwner() {
  return (
    <motion.section
      id="restaurants"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      viewport={{ once: true }}
      className="py-20 lg:py-0 lg:min-h-[88vh] lg:flex lg:items-center bg-(--gold-soft-bg) overflow-hidden relative"
    >
      <div className="page-x-wide">
        <div className="flex flex-col lg:flex-row-reverse items-center lg:items-start gap-12 lg:gap-16">

          {/* Text Content */}
          <motion.div
            className="lg:w-1/2 lg:mt-24"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <p className="font-poppins text-xs font-semibold uppercase tracking-[0.18em] text-(--gold-text) mb-4">
              For Cafés &amp; Restaurants
            </p>
            {/* Heading */}
            <h2 className="font-bricolage font-bold text-4xl md:text-5xl tracking-tight text-(--brand-blue) mb-4">
              Let More People Discover Your Café or Restaurant
            </h2>

            <div className="relative w-full mb-8 lg:hidden h-72">
              <Image
                src="/restar.webp"
                alt="Restaurant Owner Illustration"
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            {/* Subheading */}
            <p className="font-albert font-medium text-2xl md:text-3xl leading-tight tracking-tight text-(--about-heading-color) mb-6">
              Turn Hungry Searches Into Full Tables.
            </p>

            {/* Description */}
            <div className="font-albert text-lg leading-relaxed text-(--about-body-text) mb-8">
              <p className="mb-3">
                Showcase your menu, events, offers, and experiences to people actively looking for places to eat, relax, and explore nearby. Increase local visibility and connect with customers who are ready to visit. 
              </p>
              
            </div>

            {/* CTA */}
            {/*
              A real <a>, not a button with a router.push.

              /for-restaurants is a 308 to venue.baatasari.com. Pushed
              through the client router, Next first fetches the RSC payload for
              it, follows the redirect cross-origin, and has that response
              blocked by CORS — the venue Worker sends no
              Access-Control-Allow-Origin, and nothing it could send would make
              a foreign app's RSC payload useful. Next then falls back to a full
              page load, so it works, having first waited on a request that
              could never have succeeded.

              The rest is what any link gives and a button cannot: open in a new
              tab, copy link address, a destination in the accessibility tree,
              a crawlable path to the venue site, and it still works with JS off.

              asChild swaps the underlying element for the child while keeping
              every Button style — see components/ui/button.tsx.
            */}
            <Button
              asChild
              className="font-albert font-medium text-lg leading-6 text-(--white) bg-brand-900 hover:bg-(--brand-navy)/90 px-8 py-3 rounded-full transition h-auto"
            >
              <a href="/for-restaurants">Check It Out</a>
            </Button>
          </motion.div>

          {/* Desktop Image (Hidden on mobile, block on lg) */}
          <motion.div
            className="group lg:w-1/2 w-full hidden lg:block"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <div className="relative w-full h-96 lg:h-[34rem] overflow-hidden rounded-3xl shadow-[0_30px_60px_-20px_rgba(12,29,55,0.25)]">
              <Image
                src="/restar.webp"
                alt="Restaurant Owner Illustration"
                fill
                sizes="50vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
            </div>
          </motion.div>

        </div>
      </div>
    </motion.section>
  );
}
