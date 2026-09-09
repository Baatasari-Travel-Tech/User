// Platform event taxonomy: each top-level category has sub-categories.
// Events store the chosen sub-category in `category`; the group is derived for
// search/filtering via the helpers below.

export type EventCategoryGroup = {
  category: string
  subcategories: string[]
}

export const EVENT_CATEGORY_GROUPS: EventCategoryGroup[] = [
  {
    category: "Entertainment & Social",
    subcategories: [
      "Meetups",
      "Social Gatherings",
      "Networking Events",
      "Community Events",
      "Open Mic Nights",
      "Game Nights",
      "Speed Dating",
      "Singles Events",
      "Cultural Evenings",
    ],
  },
  {
    category: "Arts & Creative",
    subcategories: [
      "Painting Workshops",
      "Pottery & Clay Art",
      "Sketching & Drawing",
      "Photography Walks",
      "Craft Workshops",
      "DIY Workshops",
      "Calligraphy",
      "Creative Writing",
      "Storytelling Sessions",
      "Theatre & Drama",
    ],
  },
  {
    category: "Music & Performance",
    subcategories: [
      "Live Music",
      "Concerts",
      "DJ Nights",
      "Karaoke",
      "Dance Performances",
      "Music Workshops",
      "Instrument Learning Sessions",
      "Stand-up Comedy",
      "Spoken Word Poetry",
    ],
  },
  {
    category: "Sports & Fitness",
    subcategories: [
      "Running Events",
      "Cycling Events",
      "Trekking",
      "Hiking",
      "Yoga Sessions",
      "Fitness Workshops",
      "Sports Tournaments",
      "Adventure Activities",
      "Marathon Events",
    ],
  },
  {
    category: "Food & Beverage",
    subcategories: [
      "Food Festivals",
      "Café Events",
      "Cooking Workshops",
      "Baking Workshops",
      "Tasting Sessions",
      "Wine & Beverage Events",
      "Brunch Meetups",
      "Dining Experiences",
    ],
  },
  {
    category: "Business & Professional",
    subcategories: [
      "Networking Events",
      "Startup Meetups",
      "Business Workshops",
      "Industry Conferences",
      "Career Guidance Sessions",
      "Entrepreneurship Events",
      "Leadership Workshops",
      "Panel Discussions",
    ],
  },
  {
    category: "Education & Learning",
    subcategories: [
      "Skill Development Workshops",
      "Coding Workshops",
      "Language Learning",
      "Design Workshops",
      "Academic Seminars",
      "Certification Programs",
      "Guest Lectures",
      "Study Groups",
    ],
  },
  {
    category: "Wellness & Lifestyle",
    subcategories: [
      "Meditation Sessions",
      "Wellness Retreats",
      "Mental Health Workshops",
      "Self-Development Sessions",
      "Lifestyle Workshops",
      "Journaling Workshops",
      "Mindfulness Activities",
    ],
  },
  {
    category: "Family & Kids",
    subcategories: [
      "Kids Workshops",
      "Parenting Sessions",
      "Family Activities",
      "Storytelling for Kids",
      "Summer Camps",
      "Educational Activities",
      "Mother & Baby Events",
    ],
  },
  {
    category: "Culture & Heritage",
    subcategories: [
      "Heritage Walks",
      "Museum Tours",
      "Cultural Festivals",
      "Traditional Arts Workshops",
      "Local History Experiences",
      "Folk Performances",
    ],
  },
  {
    category: "Nature & Outdoor",
    subcategories: [
      "Nature Walks",
      "Bird Watching",
      "Camping",
      "Beach Activities",
      "Eco Workshops",
      "Plantation Drives",
      "Outdoor Experiences",
    ],
  },
  {
    category: "Shopping & Lifestyle",
    subcategories: [
      "Flea Markets",
      "Pop-up Markets",
      "Fashion Events",
      "Lifestyle Exhibitions",
      "Brand Launches",
      "Product Experience Events",
    ],
  },
  {
    category: "Gaming & Technology",
    subcategories: [
      "Gaming Tournaments",
      "Board Game Events",
      "Esports Competitions",
      "Hackathons",
      "Tech Meetups",
      "AI & Technology Workshops",
    ],
  },
]

export const EVENT_CATEGORY_NAMES = EVENT_CATEGORY_GROUPS.map((group) => group.category)

// True when an event's stored category (a sub-category) belongs to the group.
export function eventMatchesCategoryGroup(eventCategory: string | null | undefined, group: string): boolean {
  if (!eventCategory) return false
  const target = EVENT_CATEGORY_GROUPS.find((g) => g.category === group)
  if (!target) {
    // Not a known group name → treat as a free label (e.g. the events-hero
    // chips: "Music", "Comedy", "Workshops"…). Substring match so "Music"
    // catches "Live Music"/"Music & Performance", "Workshops" catches any
    // "* Workshops", etc.
    return eventCategory.toLowerCase().includes(group.toLowerCase())
  }
  const value = eventCategory.toLowerCase()
  return target.subcategories.some((sub) => sub.toLowerCase() === value)
}
