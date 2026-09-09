"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURES_DATA } from "@/lib/about-data";
import Image from "next/image";

export default function Features() {
  const reduce = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [paused, setPaused] = useState(false);
  // Tighter spread on mobile; side cards are hidden there (see card style) so
  // the active card stands alone instead of crowding under the neighbours.
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

  const totalCards = FEATURES_DATA.length;

  // Autoplay — advances every 4s, pauses on hover/focus and for reduced motion.
  useEffect(() => {
    if (reduce || paused) return;
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalCards);
    }, 4000);
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
    <section id="features" className="pt-10 pb-16 md:pt-16 md:pb-24 bg-background overflow-hidden relative">
      <div className="page-x-wide relative">
        {/* Section Heading */}
        <h2 className="font-bricolage font-bold text-3xl sm:text-4xl md:text-[54px] leading-tight md:leading-16 tracking-[0] text-(--brand-blue) mb-8 md:mb-16">
          What makes us stand apart?
        </h2>

        {/* 3D Carousel Container */}
        <div
          className="relative h-[440px] sm:h-[500px] md:h-135 flex items-center justify-center"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {FEATURES_DATA.map((item, index) => {
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
                    ?
                    "border-(--brand-blue) shadow-2xl"
                    : "border-(--gray-200) shadow-xl"
                  }
                  `}
              >
                {/* Image — framed with a border inset from the card edge.

                    Deliberately NOT `priority`. It used to be
                    `priority={isActive}`, and Next turns that into a real
                    <link rel="preload"> in the document head. This carousel
                    sits below a hero of min-h-[calc(100dvh-72px)] — a full
                    viewport — so the card is never in the initial view, and on
                    a throttled connection its preload was competing with the
                    hero's for the same pipe. The hero is the LCP element, and
                    LCP was the only metric still losing real points.

                    Lazy is right for something a full viewport down: it still
                    loads long before a scrolling visitor arrives. */}
                <div className="relative mx-4 mt-4 flex-1 overflow-hidden rounded-2xl border border-(--gray-200) bg-(--gray-100)">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="360px"
                    loading="lazy"
                    className={`object-cover transition-transform duration-1000 ease-out ${isActive ? "scale-105" : "scale-100"}`}
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iMC4zNWVtIiBmaWxsPSIjOUI5QkE0IiBmb250LXNpemU9IjE0Ij5Ccm9rZW48L3RleHQ+Cjwvc3ZnPg==';
                    }}
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="font-albert font-bold text-[24px] leading-8 tracking-[0] text-(--text-subtle) mb-3">
                    {item.title}
                  </h3>
                  
                  <p className="font-albert font-medium text-[16px] leading-6 tracking-[0.005em] text-(--text-muted-custom)">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Arrows — centered below on mobile, floating bottom-right on desktop */}
        <div className="mt-6 flex justify-center gap-3 md:absolute md:right-4 md:-bottom-8 md:mt-0">
          {/* The only child is an icon, so without an explicit name a screen
              reader announces "button" and nothing else — and an AI agent has
              no idea what it does either. Lighthouse flagged all four of these
              across this file and performers.tsx. */}
          <Button
            variant="outline"
            aria-label="Previous feature"
            onClick={() => navigate("left")}
            className="w-12 h-12 rounded-full flex items-center justify-center transition border p-0 bg-(--white) text-(--gray-600) border-(--gray-300) hover:bg-(--gray-100)"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            aria-label="Next feature"
            onClick={() => navigate("right")}
            className="w-12 h-12 rounded-full flex items-center justify-center transition border p-0 bg-(--white) text-(--gray-600) border-(--gray-300) hover:bg-(--gray-100)"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </section>
  );
}
