export type PreferenceCategory = "travel" | "interests" | "food" | "emotional" | "logistics";

export interface Preferences {
    travel: string[];
    interests: string[];
    food: string[];
    emotional: string[];
    logistics: string[];
}

export interface PreferenceCard {
    title: string;
    image: string;
    category: PreferenceCategory;
}

export const PREFERENCE_CARDS: PreferenceCard[] = [
    { title: "Travel & Local Exploration Style", image: "/onboard1.png", category: "travel" },
    { title: "Interests, Hobbies & Activities", image: "/onboard2.png", category: "interests" },
    { title: "Food & Dining Preferences", image: "/onboard3.png", category: "food" },
    { title: "Emotional Intent & Personality", image: "/onboard4.png", category: "emotional" },
    { title: "Logistics & Discovery Style", image: "/onboard5.png", category: "logistics" },
];

export const PREFERENCE_OPTIONS: Record<PreferenceCategory, string[]> = {
    travel: ["Explorer", "Relaxer", "Spontaneous planner", "Bucket-lister", "City hopper", "Nature seeker", "Weekend cafe finder", "Historical wanderer", "Spiritual tripper", "Group adventure seeker", "Sea food", "Veg"],
    interests: ["Hiking", "Photography", "Museums", "Nightlife", "Street performances", "Flea markets", "Reading", "Cooking", "Thrifting", "Attending concerts", "Wildlife parks", "Yoga or wellness"],
    food: ["Street food", "Fancy dining", "Cafes", "South Indian", "Mediterranean", "Vegan-friendly", "Desserts", "No raw food", "Alcohol-friendly", "Coffee addict", "Tea enthusiast", "Food markets", "Cooking classes"],
    emotional: ["Escape routine", "Recharge solo", "Celebrate love", "Learn something new", "Find hidden gems", "Romantic vibes", "Heal & reflection", "Meet new people", "Surprise me trips", "Go with the flow", "Deep cultural curiosity", "Calm and quiet spaces"],
    logistics: ["Public transport pro", "Walkable places only", "Cab everywhere", "Plan through Instagram", "Love mystery plans", "Tech-savvy", "Needs Wi-Fi", "Avoids rainy days", "Last-minute planner", "Pet-friendly spaces", "Gourmet", "High protein", "Mocktail", "Indian", "Fried", "Desserts", "Budget-focused", "Group tours welcome", "Offline map preferred"],
};

export const TAB_TITLES: Record<PreferenceCategory, string> = {
    travel: "Travel & Local Exploration Style",
    interests: "Interests, Hobbies & Activities",
    food: "Food & Dining Preferences",
    emotional: "Emotional Intent & Personality",
    logistics: "Logistics & Discovery Style",
};

export const CATEGORY_ORDER: PreferenceCategory[] = [
    "travel",
    "interests",
    "food",
    "emotional",
    "logistics",
];

export const MIN_REQUIRED = 5;
