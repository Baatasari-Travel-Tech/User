export type BackendRole = "USER" | "ORGANIZER" | "ADMIN";
export type ActiveRole = "USER" | "ORGANIZER";
export type OnboardingStatus = "PENDING" | "COMPLETED";

// Every successful API response from the Express backend is wrapped in
// `{ success: true, data: T }` (see Backend/src/utils/response.ts).
// Error responses are `{ success: false, code, message, ... }` — typed
// separately as ApiErrorPayload.
export type ApiEnvelope<T> = {
  success: true;
  data: T;
};

export type SafeUser = {
  id: string;
  email: string;
  role: BackendRole;
  onboardingStatus: OnboardingStatus;
  emailVerified: boolean;
  organizerDocumentsSubmitted: boolean;
  organizerApproved: boolean;
  // PENDING | CHANGES_REQUESTED | APPROVED | REJECTED — the richer review
  // state behind the organizerApproved boolean latch above.
  organizerReviewStatus: string;
  organizerReviewNote: string | null;
  organizerReviewReasonCode: string | null;
  organizerReviewAt: string | null;
  totpEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  // Set to an ISO timestamp when the user is soft-deleted. Admin UI uses
  // this to render the row as "deleted" with a Revive action instead of
  // Delete. End-user-facing endpoints filter these out server-side, so
  // SafeUser instances coming from /auth/me will always have null here.
  deletedAt: string | null;
};

export type AuthResponse = ApiEnvelope<{ user: SafeUser }>;

// /auth/login either returns AuthResponse directly, or — when the account
// has 2FA enabled — a challenge the caller must resolve via
// POST /auth/verify-2fa before a session actually starts.
export type LoginChallengeResponse = ApiEnvelope<{ requires2FA: true; pending: string }>;

export type MessageResponse = ApiEnvelope<{ message: string }>;

export type ApiErrorPayload = {
  success?: false;
  code: string;
  message: string;
  errors?: Array<{ field: string; message: string }>;
  retryAfter?: number;
};

export type UserProfile = {
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  dob: string | null;
  location: string | null;
  locationArea: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationPincode: string | null;
  locationLat: number | null;
  locationLng: number | null;
  gender: string | null;
  profession: string | null;
  organizerDisplayName: string | null;
  organizerDescription: string | null;
  companyName: string | null;
  companyWebsite: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type LegacyProfile = {
  email: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  dob: string | null;
  location: string | null;
  locationArea: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationPincode: string | null;
  locationLat: number | null;
  locationLng: number | null;
  gender: string | null;
  profession: string | null;
  global_onboarding_completed: boolean;
};

export type OrganizerProfile = {
  entityType: "ORGANIZATION" | "INDIVIDUAL";
  orgName: string | null;
  tradeName: string | null;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  landlineNumber: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  panNumber: string | null;
  gstNumber: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankAccountType: string | null;
  bankName: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  primaryContactName: string | null;
  secondaryContactPhone: string | null;
  logoUrl: string | null;
  logoPublicId: string | null;
  kycDocUrl: string | null;
  kycDocPublicId: string | null;
  gstDeclarationMode: "HAS_GSTIN" | "NO_GSTIN" | null;
  gstDetails: Array<{ gstin: string; state: string }>;
  undertakingAccepted: boolean;
  undertakingState: string | null;
  itrFiledLastTwoYears: boolean | null;
  panDocumentKey: string | null;
  agreementDocumentKey: string | null;
  agreementDownloadedAt: string | null;
  documentsSubmittedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SimplePreferences = {
  notifications: boolean;
  language: string;
  travel: string[];
  interests: string[];
  food: string[];
  emotional: string[];
  logistics: string[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type OrganizerEventTicketTier = {
  id?: string;
  name: string;
  description?: string | null;
  quantity: number;
  soldCount?: number;
  price: number;
  perks?: string[];
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
};

// Sub-shapes for the previously-untyped JSON blobs on EventSummary. All leaf
// fields are optional because the API does not enforce presence — the FE
// consumers (lib/event-helpers.ts, components/event-org/manage-events) read
// them defensively via asString/asNumber/asBoolean helpers, which is the
// safety net for any drift from this shape.
export type EventSponsor = {
  name: string;
  website: string;
};

export type EventSponsorGroups = {
  titleSponsors?: EventSponsor[];
  coPartners?: EventSponsor[];
  venuePartners?: EventSponsor[];
  mediaPartners?: EventSponsor[];
};

export type EventRequirements = {
  highlights?: string[];
  personnel?: string;
};

export type EventPostEventFollowUp = {
  thankYouNote?: string;
};

export type EventContactInfo = {
  mobile?: string;
  email?: string;
  website?: string;
  additionalLinks?: string;
};

export type EventAudienceRange = {
  min?: number;
  max?: number;
};

export type EventAddOns = {
  freebies?: boolean;
  giftHampers?: boolean;
  merchandise?: boolean;
  addOther?: boolean;
  giftHampersDescription?: string;
  addOtherDescription?: string;
};

export type EventGuidelines = {
  text?: string;
};

export type EventSummary = {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  location: string | null;
  locationArea: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationPincode: string | null;
  locationLat: number | null;
  locationLng: number | null;
  capacity: number;
  slug: string | null;
  category: string | null;
  tagline: string | null;
  heroImageUrl: string | null;
  heroImagePublicId: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  googleMapsUrl: string | null;
  transportToEvent: string | null;
  entrySide: string | null;
  reEntryAllowed: boolean | null;
  parkingAvailable: boolean | null;
  transportOptions: Record<string, boolean>;
  artists: Array<{ name: string; genre?: string | null }>;
  sponsors: EventSponsorGroups;
  requirements: EventRequirements;
  postEventFollowUp: EventPostEventFollowUp;
  contactInfo: EventContactInfo;
  audienceRange: EventAudienceRange;
  targetAudience: Record<string, boolean>;
  addOns: EventAddOns;
  // No FE consumer reads from `discounts` yet — kept as an open record so the
  // backend can populate it without churning this type when a real consumer
  // arrives.
  discounts: Record<string, unknown>;
  guidelines: EventGuidelines;
  published: boolean;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  startingPrice?: number;
  bookedCount?: number;
  ticketTierCount?: number;
  organizerDisplayName?: string | null;
};

export type EventDetail = EventSummary & {
  ticketTiers: OrganizerEventTicketTier[];
};

export type GstThresholdStatus = {
  turnover: number;
  threshold: number;
  remindThreshold: number;
  hasGstin: boolean;
  salesBlocked: boolean;
  stage: "ok" | "approaching" | "blocked";
};

export type OrganizerAnalytics = {
  totalEvents: number;
  totalCapacity: number;
  nextEventDate: string | null;
  paidOrders: number;
  grossRevenue: number;
  // Optional: present once the backend with the dashboard-insights extension
  // is deployed; the dashboard renders ₹0 until then.
  refundedAmount?: number;
  revenueThisMonth?: number;
  revenueLastMonth?: number;
  gstThreshold?: GstThresholdStatus;
};

export type EventFunnelPoint = {
  date: string;
  views: number;
  purchases: number;
};

// 3-stage funnel (unique people): page views → reached checkout → bought.
export type EventFunnelStages = {
  views: number;
  checkouts: number;
  purchases: number;
};

export type EventFunnel = {
  series: EventFunnelPoint[];
  totalViews: number;
  totalPurchases: number;
  conversionRate: number;
  stages: EventFunnelStages;
  // Tickets bought in the 24h before the event started, vs. 7+ days ahead.
  lastMinuteCount: number;
  earlyBirdCount: number;
};

export type OrderBreakdown = {
  subtotal: number;
  gatewayFee: number;
  platformFee: number;
  totalAmount: number;
  currency: string;
};

// One ticket on an order — multi-tier orders issue one per cart line, each
// with its own code + signed QR.
export type OrderTicket = {
  ticketId: string;
  tierName: string | null;
  quantity: number;
  ticketCode: string;
  qrPayload: string | null;
  ticketStatus: string;
};

export type TicketRecord = {
  ticketId: string;
  orderId: string;
  eventId: string;
  eventTitle: string;
  venue: string;
  eventDate: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string | null;
  // Order-level total quantity; the top-level code/QR are the first ticket's.
  quantity: number;
  ticketCode: string;
  qrPayload: string | null;
  ticketStatus: string;
  // Every ticket on the order (one per tier line), in creation order.
  tickets?: OrderTicket[];
  orderStatus: string;
  totalAmount: number;
  refundedAmount: number;
  currency: string;
  paidAt: string | null;
};

export type TaxInvoice = {
  invoiceNumber: string;
  invoiceDate: string | null;
  orderNumber: string;
  supplier: {
    gstin: string;
    legalName: string;
    tradeName: string;
    address: string;
    stateName: string;
    stateCode: string;
  };
  buyer: { name: string | null; email: string | null; gstin: string | null };
  sac: string;
  placeOfSupplyStateCode: string;
  intraState: boolean;
  eventTitle: string;
  quantity: number;
  // Per-tier cart lines (tier name, qty, unit-price snapshot). Legacy orders
  // yield a single line; unitPrice may be "" for pre-cart orders.
  items?: {
    ticketTierId: string;
    ticketTierName: string;
    quantity: number;
    unitPrice: string;
  }[];
  currency: string;
  ticketSubtotal: string;
  platformFee: {
    ratePct: number;
    inclusive: string;
    taxable: string;
    cgst: string;
    sgst: string;
    igst: string;
    tax: string;
  };
  grandTotal: string;
};

export type TalentProfile = {
  stageName: string | null;
  mainSkill: string | null;
  experienceLevel: string | null;
  yearsOfExperience: string | null;
  bio: string | null;
  preferredSlots: string[];
  availableFor: string[];
  location: string | null;
  expectedPriceBand: string | null;
  portfolioLinks: string[];
  feeAmount: number;
  paymentStatus: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  paidAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SiteConfig = {
  instagram: string;
  linkedin: string;
  twitter: string;
  contactEmail: string;
  maintenanceEnabled: boolean;
  maintenanceMessage: string | null;
  maintenanceFrom: string | null;
  maintenanceTo: string | null;
  // Computed server-side: maintenanceEnabled AND (no schedule set, or now is
  // inside the from/to window). This is the one field that actually decides
  // whether visitors see the maintenance page.
  maintenanceActive: boolean;
};

export type EventReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerName: string;
};

export type EventReviewsResponse = {
  average: number;
  count: number;
  reviews: EventReviewItem[];
};

// One row of GET /organizer/payments — a single event's payout summary.
export type OrganizerPayoutSummary = {
  eventId: string;
  title: string;
  eventDate: string;
  cancelledAt: string | null;
  ordersCount: number;
  ticketRevenue: number;
  /** Refunded to buyers. Not the organizer's to be paid — subtracted before
   *  withholding is computed, so it explains the gap between gross and net. */
  refunds: number;
  /** ticketRevenue − refunds. TDS/TCS are charged on this, not on gross. */
  netRevenue: number;
  tds: number;
  tcs: number;
  netPayable: number;
  paid: number;
  pending: number;
  fullySettled: boolean;
  payoutHold: {
    level: "EVENT" | "ORGANIZER";
    reason: string | null;
    at: string;
  } | null;
};

export type OrganizerPayoutLedgerEntry = {
  id: string;
  amountPaid: number;
  reference: string | null;
  notes: string | null;
  paidAt: string;
};

// Addressee/issuer details for the printable payout statement.
export type OrganizerPayoutParty = {
  name: string | null;
  pan: string | null;
  gstin: string | null;
  address: string | null;
  bankName: string | null;
  bankAccountMasked: string | null;
  bankIfsc: string | null;
};

export type PlatformStatementIssuer = {
  legalName: string;
  tradeName: string;
  gstin: string;
  address: string;
};

export type OrganizerPayoutDetail = {
  summary: OrganizerPayoutSummary | null;
  organizer: OrganizerPayoutParty;
  platform: PlatformStatementIssuer;
  history: OrganizerPayoutLedgerEntry[];
};

export type PanVerifyResult = {
  valid: boolean;
  pan: string;
};

export class ApiError extends Error {
  code: string;
  status: number;
  errors?: Array<{ field: string; message: string }>;
  retryAfter?: number;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code;
    this.errors = payload.errors;
    this.retryAfter = payload.retryAfter;
  }
}
