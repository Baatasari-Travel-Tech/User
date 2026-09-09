export const UNLIMITED_TICKET_CAPACITY = 999999

export interface EventFormData {
  eventName: string
  category: string
  tagline: string
  description: string
  personnel: string
  date: string
  time: string
  endDate: string
  endTime: string
  timeSlots: { name: string; startTime: string; endTime: string }[]
  venue: string
  location: string
  locationArea: string
  locationCity: string
  locationState: string
  locationPincode: string
  locationLat: number | null
  locationLng: number | null
  googleMapsUrl: string
  transportToEvent: string
  entrySide: string
  reEntryAllowed: boolean | null
  parkingAvailable: boolean | null
  ticketType: "paid" | "free"
  gatewayBearer: "customer" | "organizer"
  audienceCategory: {
    category: string
    numberOfTickets: string
    isLimited: boolean
    isFree: boolean
    price: string
    description: string
  }[]
  ageGroupPreset?: string
  ticketName: string
  ticketQuantity: string
  ticketPrice?: string
  guidelines: string
  addOns: {
    freebies: boolean
    giftHampers: boolean
    merchandise: boolean
    addOther: boolean
    giftHampersDescription: string
    addOtherDescription?: string
    [key: string]: boolean | string | undefined
  }
  contactInfo: {
    mobile: string
    email: string
    website: string
    additionalLinks: string
  }
  sponsors: {
    titleSponsors: { name: string; website: string }[]
    coPartners: { name: string; website: string }[]
    mediaPartners: { name: string; website: string }[]
    [key: string]: { name: string; website: string }[]
  }
  postEventFollowUp: {
    thankYouNote: string
  }
  artists: { name: string; genre?: string }[]
  audienceRange: { min: number; max: number }
  targetAudience: { [key: string]: boolean }
  eventPhoto: File | null
  hasStoredCover?: boolean
}

export const INITIAL_EVENT_FORM_DATA: EventFormData = {
  eventName: "",
  category: "",
  description: "",
  tagline: "",
  eventPhoto: null,
  personnel: "",
  date: "",
  endDate: "",
  time: "",
  endTime: "",
  timeSlots: [],
  venue: "",
  location: "",
  locationArea: "",
  locationCity: "",
  locationState: "",
  locationPincode: "",
  locationLat: null,
  locationLng: null,
  googleMapsUrl: "",
  transportToEvent: "",
  entrySide: "",
  reEntryAllowed: null,
  parkingAvailable: null,
  guidelines: "",
  ticketName: "",
  ticketPrice: "",
  gatewayBearer: "customer",
  ticketType: "paid",
  ticketQuantity: "",
  audienceCategory: [
    {
      category: "",
      numberOfTickets: "",
      isLimited: true,
      isFree: false,
      price: "",
      description: "",
    },
  ],
  addOns: {
    freebies: false,
    giftHampers: false,
    merchandise: false,
    addOther: false,
    giftHampersDescription: "",
    addOtherDescription: "",
  },
  audienceRange: { min: 18, max: 60 },
  ageGroupPreset: "",
  targetAudience: {},
  sponsors: {
    titleSponsors: [],
    coPartners: [],
    venuePartners: [],
    mediaPartners: [],
  },
  contactInfo: {
    mobile: "",
    email: "",
    website: "",
    additionalLinks: "",
  },
  postEventFollowUp: {
    thankYouNote: "",
  },
  artists: [{ name: "", genre: "" }],
  hasStoredCover: false,
}

export const STEP_FIELDS = [
  [
    "eventPhoto",
    "eventName",
    "category",
    "description",
    "date",
    "time",
    "endTime",
    "venue",
    "googleMapsUrl",
  ],
  ["ticketType", "audienceCategory", "addOns.giftHampersDescription", "addOns.addOtherDescription"],
  ["sponsors"],
  ["contactInfo.mobile", "contactInfo.email", "postEventFollowUp.thankYouNote"],
]

export const PROGRESS_STEPS = [
  { number: "01", label: "Event Information" },
  { number: "02", label: "Ticketing" },
  { number: "03", label: "Sponsorship" },
  { number: "04", label: "Final" },
]

export const EVENT_CATEGORIES = [
  { label: "Music", value: "music" },
  { label: "Art", value: "art" },
  { label: "Tech", value: "tech" },
  { label: "Business", value: "business" },
]

export const TARGET_AUDIENCE_OPTIONS = [
  "Student (School / College)",
  "Job Seeker",
  "Working Professional - IT / Tech",
  "Working Professional - Non-Tech",
  "Entrepreneur / Founder",
  "Freelancer / Creator",
  "Business Owner (SME)",
  "Corporate Executive / Manager",
  "Developer / Engineer",
  "Designer / Creative Professional",
  "Marketing / Sales Professional",
  "Finance / Banking Professional",
  "Healthcare Professional",
  "Educator / Trainer",
  "Government / Public Sector",
  "Homemaker",
  "Retired",
  "Other",
]

export const AGE_GROUP_PRESETS = [
  { label: "Newborns", min: 0, max: 2 },
  { label: "Kids", min: 3, max: 12 },
  { label: "Students", min: 13, max: 22 },
  { label: "Teenagers", min: 13, max: 19 },
  { label: "Adults", min: 20, max: 60 },
  { label: "Elders", min: 60, max: 100 },
  { label: "All Ages", min: 0, max: 100 },
]

export const ADD_ON_OPTIONS = [
  { id: "freebies", label: "Freebies" },
  { id: "giftHampers", label: "Gift Hampers" },
  { id: "merchandise", label: "Merchandise" },
  { id: "addOther", label: "Add Other" },
]
