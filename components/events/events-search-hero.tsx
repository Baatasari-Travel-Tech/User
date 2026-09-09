"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { animate, stagger } from "animejs";
import Image from "next/image";
import {
  Search,
  Flame,
  Music,
  Ticket,
  MapPin,
  Calendar as CalendarIcon,
  Palette,
  Dumbbell,
  Utensils,
  Briefcase,
  GraduationCap,
  HeartPulse,
  Baby,
  Landmark,
  TreePine,
  ShoppingBag,
  Gamepad2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENT_CATEGORY_NAMES } from "@/lib/event-categories";

const ROTATING_WORDS = ["Mood", "Crew", "Vibe", "Weekend"];

// Pill icons for each category group (events-mobile-view design). Names are
// the EVENT_CATEGORY_NAMES groups, so filtering keeps matching exactly.
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  All: <Flame size={14} />,
  "Entertainment & Social": <Ticket size={14} />,
  "Arts & Creative": <Palette size={14} />,
  "Music & Performance": <Music size={14} />,
  "Sports & Fitness": <Dumbbell size={14} />,
  "Food & Beverage": <Utensils size={14} />,
  "Business & Professional": <Briefcase size={14} />,
  "Education & Learning": <GraduationCap size={14} />,
  "Wellness & Lifestyle": <HeartPulse size={14} />,
  "Family & Kids": <Baby size={14} />,
  "Culture & Heritage": <Landmark size={14} />,
  "Nature & Outdoor": <TreePine size={14} />,
  "Shopping & Lifestyle": <ShoppingBag size={14} />,
  "Gaming & Technology": <Gamepad2 size={14} />,
};

// Full category set under the Discover hero: "All" + every real category group.
// Filtering matches exactly (these ARE the group names eventMatchesCategoryGroup knows).
const CATEGORIES = ["All", ...EVENT_CATEGORY_NAMES].map((name) => ({
  name,
  icon: CATEGORY_ICONS[name] ?? <Ticket size={14} />,
}));

interface EventsSearchHeroProps {
  /** Cities to list under "Where" — derived from real published events by the
   * caller, so the dropdown never offers a city with zero events in it. */
  cities?: string[];
}

export function EventsSearchHero({ cities = [] }: EventsSearchHeroProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);

  const [wordIndex, setWordIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") ?? "All");
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [when, setWhen] = useState(searchParams.get("when") ?? "anytime");
  const [budget, setBudget] = useState(searchParams.get("budget") ?? "any");
  const [where, setWhere] = useState(searchParams.get("where") ?? "");

  useEffect(() => {
    const id = setInterval(() => {
      setWordIndex((p) => (p + 1) % ROTATING_WORDS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (titleRef.current) {
      animate(titleRef.current.querySelectorAll(".char"), {
        opacity: [0, 1],
        translateY: [40, 0],
        rotateX: [-90, 0],
        delay: stagger(35),
        duration: 900,
        ease: "outExpo",
      });
    }

    if (searchRef.current) {
      animate(searchRef.current, {
        opacity: [0, 1],
        translateY: [30, 0],
        scale: [0.96, 1],
        duration: 1100,
        delay: 600,
        ease: "outExpo",
      });
    }

    if (pillsRef.current) {
      animate(pillsRef.current.querySelectorAll(".pill"), {
        opacity: [0, 1],
        translateY: [16, 0],
        scale: [0.9, 1],
        delay: stagger(60, { start: 1000 }),
        duration: 600,
        ease: "outBack",
      });
    }
  }, []);

  const applyFilters = (
    next?: Partial<{ q: string; category: string; when: string; budget: string; where: string }>,
  ) => {
    const merged = {
      q: next?.q ?? query,
      category: next?.category ?? activeCategory,
      when: next?.when ?? when,
      budget: next?.budget ?? budget,
      where: next?.where ?? where,
    };
    const params = new URLSearchParams();
    if (merged.q.trim()) params.set("q", merged.q.trim());
    if (merged.where.trim()) params.set("where", merged.where.trim());
    if (merged.category && merged.category !== "All") params.set("category", merged.category);
    if (merged.when && merged.when !== "anytime") params.set("when", merged.when);
    if (merged.budget && merged.budget !== "any") params.set("budget", merged.budget);
    const qs = params.toString();
    router.push(qs ? `/events?${qs}` : "/events");
  };

  const handleSearch = () => applyFilters();

  const titleText = "Find your perfect event";

  return (
    <section className="relative isolate flex min-h-[88vh] w-full flex-col justify-center overflow-hidden">
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">

        {/* Background image — desktop/landscape */}
        <Image
          src="/events-hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hidden md:block object-cover object-[center_30%]"
        />

        {/* Background image — mobile/portrait */}
        <Image
          src="/events-hero-mobile.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="md:hidden object-cover object-top"
        />

        {/* Light cream wash — lets the image show through, just blends edges into the page */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/10 to-background/65" />
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-4 pt-24 pb-6 md:px-6 md:pt-32 md:pb-10 lg:px-10">
        {/* Title with anime.js stagger */}
        <h1
          ref={titleRef}
          className="mx-auto -mt-18 max-w-4xl whitespace-nowrap text-center font-bricolage text-[clamp(1.4rem,7vw,4.5rem)] font-bold leading-[1.05] tracking-tight text-(--brand-navy) md:mt-20"
          style={{ perspective: "1000px", textShadow: "0 1px 16px rgba(251,247,240,0.85)" }}
        >
          {titleText.split("").map((c, i) => (
            <span
              key={i}
              className="char inline-block"
              style={{ opacity: 0, whiteSpace: c === " " ? "pre" : undefined }}
            >
              {c}
            </span>
          ))}
        </h1>

        {/* Rotating subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.7, ease: "easeOut" }}
          className="mt-5 text-center font-poppins text-base font-medium text-(--gray-700) md:text-lg"
          style={{ textShadow: "0 1px 12px rgba(251,247,240,0.9)" }}
        >
          Tailored for every{" "}
          <span className="relative inline-block min-w-[5.5rem] text-left align-baseline">
            <AnimatePresence mode="wait">
              <motion.span
                key={ROTATING_WORDS[wordIndex]}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
                className="inline-block bg-linear-to-r from-(--blue-600) to-(--royal-blue) bg-clip-text font-semibold text-transparent"
              >
                {ROTATING_WORDS[wordIndex]}.
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.p>

        {/* Search bar */}
        <div
          ref={searchRef}
          className="mx-auto mt-64 w-full max-w-5xl opacity-0 sm:mt-72 md:mt-24"
        >
          <div className="flex flex-wrap items-stretch gap-2 rounded-3xl border border-(--gray-200) bg-white p-2 shadow-[0_20px_60px_-20px_rgba(12,29,55,0.18)] lg:flex-nowrap lg:gap-0 lg:rounded-full">
            {/* Search input — full width on mobile */}
            <div className="group order-1 flex min-w-0 basis-full items-center gap-2 rounded-2xl border border-(--gray-200) bg-white px-4 py-3 transition-colors hover:bg-(--gray-50) lg:order-none lg:basis-0 lg:flex-1 lg:gap-3 lg:rounded-none lg:rounded-l-full lg:border-0 lg:border-r lg:border-(--gray-100) lg:bg-transparent lg:px-5">
              <Search className="h-5 w-5 shrink-0 text-(--gray-400) transition-colors group-focus-within:text-(--blue-600)" />
              <div className="flex min-w-0 flex-1 flex-col text-left">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-(--gray-400)">
                  Search
                </span>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search events..."
                  className="w-full min-w-0 bg-transparent text-sm font-semibold text-(--gray-800) outline-none placeholder:text-(--gray-400)"
                />
              </div>
            </div>

            {/* Where */}
            <div className="group order-2 flex min-w-0 basis-[calc(50%-0.25rem)] items-center gap-2 rounded-2xl border border-(--gray-200) bg-white px-4 py-3 transition-colors hover:bg-(--gray-50) lg:order-none lg:basis-0 lg:flex-1 lg:gap-3 lg:rounded-none lg:border-0 lg:border-r lg:border-(--gray-100) lg:bg-transparent lg:px-5">
              <MapPin className="h-5 w-5 shrink-0 text-(--gray-400)" />
              <div className="flex min-w-0 flex-1 flex-col text-left">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-(--gray-400)">
                  Where
                </span>
                <Select
                  value={where || "all"}
                  onValueChange={(v) => setWhere(v === "all" ? "" : v)}
                >
                  <SelectTrigger className="h-auto w-full border-0 bg-transparent p-0 text-sm font-semibold text-(--gray-800) shadow-none focus:ring-0">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cities</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* What - mobile category list */}
            <div className="group order-3 flex min-w-0 basis-[calc(50%-0.25rem)] items-center gap-2 rounded-2xl border border-(--gray-200) bg-white px-4 py-3 transition-colors hover:bg-(--gray-50) lg:hidden">
              <Ticket className="h-5 w-5 shrink-0 text-(--gray-400)" />
              <div className="flex min-w-0 flex-1 flex-col text-left">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-(--gray-400)">
                  What
                </span>
                <Select value={activeCategory} onValueChange={setActiveCategory}>
                  <SelectTrigger className="h-auto w-full border-0 bg-transparent p-0 text-sm font-semibold text-(--gray-800) shadow-none focus:ring-0">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="border-(--gray-200) bg-white text-(--gray-800) shadow-xl">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.name} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* When */}
            <div className="group order-4 flex min-w-0 basis-[calc(50%-0.25rem)] items-center gap-2 rounded-2xl border border-(--gray-200) bg-white px-4 py-3 transition-colors hover:bg-(--gray-50) lg:order-none lg:basis-0 lg:flex-1 lg:gap-3 lg:rounded-none lg:border-0 lg:border-r lg:border-(--gray-100) lg:bg-transparent lg:px-5">
              <CalendarIcon className="h-5 w-5 shrink-0 text-(--gray-400)" />
              <div className="flex min-w-0 flex-1 flex-col text-left">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-(--gray-400)">
                  When
                </span>
                <Select value={when} onValueChange={setWhen}>
                  <SelectTrigger className="h-auto w-full border-0 bg-transparent p-0 text-sm font-semibold text-(--gray-800) shadow-none focus:ring-0">
                    <SelectValue placeholder="Anytime" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anytime">Anytime</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="weekend">This weekend</SelectItem>
                    <SelectItem value="month">This month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Budget */}
            <div className="group order-5 flex min-w-0 basis-[calc(50%-0.25rem)] items-center gap-2 rounded-2xl border border-(--gray-200) bg-white px-4 py-3 transition-colors hover:bg-(--gray-50) lg:order-none lg:basis-0 lg:flex-1 lg:gap-3 lg:rounded-none lg:border-0 lg:border-r lg:border-(--gray-100) lg:bg-transparent lg:px-5">
              <span className="text-base font-bold text-(--gray-400)">&#8377;</span>
              <div className="flex min-w-0 flex-1 flex-col text-left">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-(--gray-400)">
                  Budget
                </span>
                <Select value={budget} onValueChange={setBudget}>
                  <SelectTrigger className="h-auto w-full border-0 bg-transparent p-0 text-sm font-semibold text-(--gray-800) shadow-none focus:ring-0">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Price</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pocket">Pocket Friendly</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Button — full width on mobile */}
            <div className="order-6 basis-full lg:order-none lg:w-auto lg:basis-auto lg:shrink-0 lg:p-1">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleSearch}
                className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-(--brand-navy) px-6 font-poppins font-bold text-white shadow-lg shadow-(--brand-navy)/20 transition-all hover:shadow-xl sm:px-8 lg:w-auto lg:rounded-full lg:px-10"
              >
                <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <Search size={18} className="relative shrink-0" />
                <span className="relative">Discover</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Category pills — desktop only; click filters immediately */}
        <div
          ref={pillsRef}
          className="mx-auto mt-8 hidden max-w-6xl flex-wrap justify-center gap-2 lg:flex lg:gap-3"
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.name;
            return (
              <motion.button
                key={cat.name}
                whileHover={{ y: -3, scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setActiveCategory(cat.name);
                  applyFilters({ category: cat.name });
                }}
                className={`pill flex whitespace-nowrap items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "border-(--brand-navy) bg-(--brand-navy) text-white shadow-md"
                    : "border-(--gray-200) bg-white/80 text-(--gray-700) backdrop-blur-sm hover:border-(--blue-200) hover:text-(--brand-blue)"
                }`}
                style={{ opacity: 0 }}
              >
                {cat.icon}
                {cat.name}
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
