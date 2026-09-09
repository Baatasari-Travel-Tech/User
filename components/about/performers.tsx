"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PERFORMERS_DATA } from "@/lib/about-data";
import Image from "next/image";

export default function Performers() {
  const reduce = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [paused, setPaused] = useState(false);
  // Carousel spread — wider on mobile; side cards are hidden there (see card
  // style) so the active card stands alone instead of crowding its neighbours.
  const [offset, setOffset] = useState(420);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < 640;
      setOffset(mobile ? 280 : 420);
      setIsMobile(mobile);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const totalCards = PERFORMERS_DATA.length;

  // Autoplay — offset phase from the Features carousel so they don't tick in
  // lockstep. Pauses on hover and for reduced motion.
  useEffect(() => {
    if (reduce || paused) return;
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalCards);
    }, 4600);
    return () => clearInterval(id);
  }, [reduce, paused, totalCards]);

  const getPosition = (index: number) => {
    let diff = index - activeIndex;
    if (diff > totalCards / 2) diff -= totalCards;
    if (diff < -totalCards / 2) diff += totalCards;
    return diff;
  };

  const navigate = (direction: "left" | "right") => {
    if (isAnimating) return;
    setIsAnimating(true);

    if (direction === "right") {
      setActiveIndex((prev) => (prev + 1) % totalCards);
    } else {
      setActiveIndex((prev) => (prev - 1 + totalCards) % totalCards);
    }

    setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  };

  const handleCardClick = (index: number) => {
    if (isAnimating) return;
    const position = getPosition(index);
    if (position === 0) return;

    if (position > 0) {
      navigate("right");
    } else {
      navigate("left");
    }
  };

  return (
    <section id="performers" className="py-12 md:py-24 bg-background overflow-hidden relative">
      <div className="page-x-wide relative">
        {/* Heading */}
        <h2 className="font-bricolage font-bold text-3xl sm:text-4xl md:text-[54px] leading-tight md:leading-18 tracking-[0] text-(--brand-blue) mb-8 md:mb-16">
          Calling All Performers!
        </h2>

        {/* 3D Carousel Container */}
        <div
          className="relative h-[440px] sm:h-[500px] md:h-[540px] flex items-center justify-center"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {PERFORMERS_DATA.map((item, index) => {
            const position = getPosition(index);
            const isActive = position === 0;

            return (
              <div
                key={index}
                onClick={() => handleCardClick(index)}
                style={{
                  transform: `translateX(${position * offset}px) scale(${isActive ? 1 : 0.85})`,
                  zIndex: isActive ? 30 : 20,
                  opacity: isActive ? 1 : isMobile ? 0 : 0.6,
                  pointerEvents: !isActive && isMobile ? "none" : "auto",
                }}
                className={`
                    absolute
                    w-[78vw] max-w-[300px] sm:w-[360px] sm:max-w-none h-[400px] sm:h-[470px] md:h-[504px]
                    rounded-[32px] bg-(--background) shadow-xl
                    cursor-pointer
                    transition-all duration-700 ease-out
                    border
                    flex flex-col overflow-hidden
                    ${isActive
                    ? "border-(--brand-blue) shadow-xl"
                    : "border-(--gray-200) shadow-xl"
                  }
                  `}
              >
                {/* Image — fills all space above the text */}
                <div className="relative w-full flex-1 overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="360px"
                    className={`object-cover transition-transform duration-1000 ease-out ${isActive ? "scale-105" : "scale-100"}`}
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIiBmaWxsPSIjOUI5QkE0IiBmb250LXNpemU9IjE0Ij5Ccm9rZW48L3RleHQ+Cjwvc3ZnPg==';
                    }}
                  />
                </div>

                {/* Content — pinned to the bottom */}
                <div className="px-6 py-5">
                  {/* Card Title */}
                  <h3 className="font-albert font-medium text-[22px] leading-7 tracking-[0.0015em] text-(--about-card-text) mb-1">
                    {item.title}
                  </h3>

                  {/* Card Description */}
                  <p className="font-albert font-normal text-[15px] leading-6 tracking-[0.005em] text-(--about-card-text)">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>


        {/* Navigation Arrows — centered below on mobile, floating bottom-right on desktop */}
        <div className="mt-6 flex justify-center gap-4 md:absolute md:right-6 md:bottom-24 md:mt-0">
          <Button
            variant="outline"
            aria-label="Previous performer"
            onClick={() => navigate("left")}
            className="w-12 h-12 rounded-full flex items-center justify-center transition border p-0 bg-(--white) text-(--gray-600) border-(--gray-300) hover:bg-(--gray-100)"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Button
            variant="outline"
            aria-label="Next performer"
            onClick={() => navigate("right")}
            className="w-12 h-12 rounded-full flex items-center justify-center transition border p-0 bg-(--white) text-(--gray-600) border-(--gray-300) hover:bg-(--gray-100)"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* CTA */}
        <div className="flex justify-center mt-8 md:mt-16">
          <Link href="/talent">
            <Button className="font-albert font-medium text-base sm:text-[18px] leading-6 tracking-[0] text-(--white) px-8 sm:px-10 py-4 rounded-full bg-brand-900 hover:bg-(--brand-navy)/90 transition h-auto">
              Showcase your Talent
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
