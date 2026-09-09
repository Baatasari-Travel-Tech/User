"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function EventOrganizer() {
  return (
    <motion.section
      id="events"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      viewport={{ once: true }}
      className="py-20 lg:py-0 lg:min-h-[88vh] lg:flex lg:items-center bg-background overflow-hidden relative"
    >
      <div className="page-x-wide">
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-12 lg:gap-16">

          {/* Text Content */}
          <motion.div
            className="lg:w-1/2 lg:mt-24"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <p className="font-poppins text-xs font-semibold uppercase tracking-[0.18em] text-(--gold-text) mb-4">
              For Organizers
            </p>
            {/* Heading */}
            <h2 className="font-bricolage font-bold text-4xl md:text-5xl tracking-tight text-(--brand-blue) mb-4">
              For Event Organizers and Experience Hosts
            </h2>

            <div className="relative w-full mb-8 lg:hidden h-72">
              <Image
                src="/event.webp"
                alt="Event Organizer Illustration"
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            {/* Subheading */}
            <p className="font-albert font-medium text-2xl md:text-3xl leading-tight tracking-tight text-(--about-heading-color) mb-6">
              Reach People Who Are Actually Interested
            </p>

            {/* Description */}
            <p className="font-albert text-lg leading-relaxed text-(--about-body-text) mb-8">
              Promote events, workshops, performances, meetups, and experiences to audiences based on their interests—not just broad advertising.
               Increase visibility, improve attendance, and manage ticketing in one place. 
            </p>

            {/* CTA */}
            {/*
              next/link, not a button with a router.push: same destination, but
              a link can be opened in a new tab, copied, followed by a crawler,
              announced with somewhere to go, and it survives JS failing to
              load. The onClick did none of that.

              <Link> here rather than the plain <a> used for the venue CTA, and
              the difference is the destination: /for-organizers is a route in
              this app, so the client router is the right thing to hand it to.
              /for-restaurants is a redirect off this origin, which is exactly
              what the client router cannot usefully do.
            */}
            <Button
              asChild
              className="font-albert font-medium text-lg leading-6 text-(--white) bg-brand-900 hover:bg-(--brand-navy)/90 px-8 py-3 rounded-full transition h-auto"
            >
              <Link href="/for-organizers">List Your Event</Link>
            </Button>
          </motion.div>

          {/* Desktop Image (Hidden on mobile, block on lg) */}
          <motion.div
            className="group lg:w-1/2 w-full hidden lg:block"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <div className="relative w-full h-96 lg:h-[34rem] overflow-hidden rounded-3xl shadow-[0_30px_60px_-20px_rgba(12,29,55,0.25)]">
              <Image
                src="/event.webp"
                alt="Event Organizer Illustration"
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
