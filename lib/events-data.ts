export type EventStatus = "live" | "upcoming" | "past";

export interface EventData {
    title: string;
    price: string;
    category: string;
    image: string;
    id: string;
    numericPrice: number;
    date: string;
    location: string;
    bookedCount?: number;
    tag?: string;
    chiefGuest?: string;
    sponsors?: string;
    eventTime?: string;
    highlights?: string[];
    status?: EventStatus;
    cancelled?: boolean;
    time?: string;
    day?: string;
    ageRange?: string;
}
