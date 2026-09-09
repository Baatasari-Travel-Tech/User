export interface Feature {
    title: string;
    description: string;
    image: string;
}

export interface Performer {
    title: string;
    description: string;
    image: string;
}

export const FEATURES_DATA: Feature[] = [
    {
        title: "Personalized Recommendations for Things You'll Actually Enjoy",
        description:
        "Skip generic suggestions and discover experiences tailored to your interests, preferences, and budget. ",
        image: "/p2.webp",
    },
    {
        title: "Plan Your Weekend Without Switching Between Apps ",
        description:
            "Explore local events, food spots, workshops, and activities happening around you with less searching and more doing.",
        image: "/plan.webp",
    },
    {
        title: "Find Things to Do. Meet People. Explore Your City.",
        description:
            "Discover events, communities, restaurants, workshops, and experiences tailored to your interests. ",
        image: "/last.webp",
    },
];

export const PERFORMERS_DATA: Performer[] = [
    {
        title: "Anchors",
        description: "Enchant your audience with your energizing moves",
        image: "/an2.webp",
    },
    {
        title: "singers",
        description: "Captivate the crowd and let your voice be heard.",
        image: "/as.webp",
    },
    {
        title: "Photographers",
        description: "Showcase your creativity and connect with your audience",
        image: "/av.webp",
    },
];