# Baatasari — Product Requirements Document (PRD)

> **Document type:** Product Requirements Document (functional scope — not a visual/style guide; see `FRONTEND_DESIGN_DOC.md` for design tokens & components).
> **Audience:** UI/UX design team, product & engineering.
> **Source of truth:** `Frontend/` (Next.js app) · **Date:** 4 Jul 2026 · **App version:** 0.1.0

---

## 1. PRODUCT OVERVIEW

### 1.1 One-line description
**Baatasari** is a location-first web platform for discovering and booking events, dining and activities in Indian cities (launching in Visakhapatnam), connecting three audiences — attendees, event organizers, and performers (talent) — in a single product.

### 1.2 Problem it solves
- **For attendees:** there is no single, trustworthy place to find *what's happening near me* (events, food experiences, activities) and book tickets in a few taps — discovery is fragmented across Instagram, WhatsApp groups and posters.
- **For organizers:** small/mid-size event organizers lack an affordable, self-serve tool to publish events, sell tiered tickets, manage stalls/sponsors, validate entry at the gate, and see revenue analytics.
- **For performers:** local artists have no structured way to get discovered and booked by organizers/venues.

### 1.3 Goal / vision
> **"Discover, connect, experience."**

- Become the default discovery + ticketing layer for city experiences in India, starting with Vizag.
- One account, multiple roles — a user can attend events, organize them, and perform at them, switching roles in-session.
- Own the full loop: **discover → book → attend (QR entry) → review → re-engage**, with organizer-side analytics closing the loop.

---

## 2. TARGET USERS

### 2.1 Primary personas

#### P1 — The Explorer (Attendee / "User" role)
- **Who:** 18–35, urban India (Vizag first), mobile-first, often on congested/shared networks at venues.
- **Needs:** find events by mood/category/date, see clear pricing & venue info, pay fast (UPI via Razorpay), get a reliable ticket (QR) that works on a weak connection.
- **Pain points:** fragmented discovery, fake/unclear listings, clunky checkouts, tickets buried in email, no purchase history in one place.

#### P2 — The Event Organizer
- **Who:** independent organizers, college fest teams, venue managers, small agencies.
- **Needs:** publish an event with tiered ticketing in minutes, manage stalls & artist bookings, scan tickets at the gate, track sales/revenue/views, understand GST obligations.
- **Pain points:** expensive/enterprise ticketing tools, manual guest lists, no gate-entry validation, no view of what's selling, compliance uncertainty (GST).

#### P3 — The Talent / Performer
- **Who:** local musicians, dancers, comedians, anchors (initially Vizag-focused).
- **Needs:** a public profile to get discovered, incoming booking requests from organizers, a simple activation/onboarding path.
- **Pain points:** discovery relies entirely on personal networks; no structured request/booking pipeline.

### 2.2 Secondary users & stakeholders
- **Platform Admin** (separate Admin app — out of scope here): approves organizers, toggles maintenance mode, moderates content.
- **Stall vendors / artists at events:** represented inside the organizer's stall & artist-request management surfaces.
- **Restaurant / café partners:** landing page section exists but is **"Coming Soon"** — future stakeholder.
- **Payment provider (Razorpay)** and campus communities (Campus Connect surface) as ecosystem stakeholders.

---

## 3. CORE FEATURES

### 3.1 Must-have (MVP — as built in `Frontend/`)

**Discovery & booking (Attendee)**
1. Public event discovery: browse/search events by title, venue, category, tagline; category filters; handpicked & upcoming sections on landing.
2. Event detail page: schedule, venue (Google Maps link), ticket tiers & pricing, guidelines, reviews.
3. Auth: email+password sign-up/sign-in, Google Sign-In, forgot/reset password, email verification. Available as pages **and** as an in-context modal.
4. User onboarding (name, phone, DOB, location, optional avatar) — gates protected areas.
5. Checkout with **Razorpay**; backend-verified payment before ticket issuance; guest can start checkout and authenticate mid-flow.
6. Order confirmation with **QR-coded ticket** + downloadable **PDF invoice**.
7. Purchase history (list + order detail) and profile management (identity, security, preferences, help).
8. "Got an Event Idea?" suggestion capture on landing.

**Organizer**
9. Organizer onboarding & KYC: register → onboarding form → document upload → email verification → admin-approval "pending" state.
10. Multi-step event creation wizard: Event details → Ticketing (tiers, free/paid, limited quantity) → Sponsorship → Review/Final → publish.
11. Event management: upcoming/all events, edit, per-event page, share-event link.
12. **On-site QR ticket scanning** (`/organizer/events/[id]/scan`) for gate entry validation.
13. Analytics dashboard: revenue stats, views-vs-purchases, event stats, date-wise reviews, approved stalls.
14. Stall & artist management: stall cards/details, artist booking requests (approve/review flow), GST threshold banner.
15. Organizer profile.

**Talent**
16. Talent onboarding incl. **one-time activation payment**; talent dashboard after activation.

**Platform**
17. Multi-role accounts with in-nav **role switcher** (User / Event Organizer / Talent) routing to each role's dashboard or onboarding as appropriate.
18. System states: 403 (forbidden), maintenance mode (admin-toggled, site-wide rewrite), standardized loading/empty/error blocks.
19. Legal & support pages: privacy policy, terms & conditions, refund policy, contact us, grievance redressal.

### 3.2 Nice-to-have (future scope)
- **Restaurant/café partner** vertical (landing section already present, marked Coming Soon).
- **Movies** vertical (movie card/section components exist on landing; not a booking flow yet).
- **Campus Connect** deep integration (campus-oriented surface exists as a linked product).
- Dark mode (design tokens are wired; no theme toggle yet).
- Native mobile apps (current product is responsive web).
- Talent public discovery/search by organizers (currently request-driven).
- Saved events / wishlists, notifications, refunds self-service.

### 3.3 Explicitly OUT of scope
- **Admin panel** — lives in a separate app (`Admin-Backend` / admin routes are excluded from this frontend's middleware).
- **Backend services / APIs** — this PRD covers the user-facing product behavior; API design is documented elsewhere.
- Restaurant booking, movie ticketing, food delivery — surfaces exist as teasers only.
- Multi-city rollout mechanics, marketing site/SEO strategy, CRM/email campaign tooling.
- Offline-first native ticket wallet (only lightweight QR/invoice reliability is in scope).

---

## 4. USER FLOWS

### 4.1 Discover → Book a ticket (core attendee flow)
1. Land on `/` (or `/events`) → browse hero, categories, handpicked/upcoming events.
2. Search or filter → open `/events/[id]`.
3. Review schedule, venue, tiers → select ticket tier(s) → **Checkout**.
4. If not signed in → auth modal (login/register/Google) → if not onboarded → `/onboarding`.
5. `/checkout` → Razorpay payment sheet → backend verifies payment.
6. `/order-confirmed/[id]` → ticket with QR code → optional `/invoice/[id]` PDF download.
7. Later: `/history` → `/history/[id]` for the order.

**Edge cases**
- **Payment fails / dismissed:** stay on checkout with retry; no ticket issued until backend confirms.
- **Payment success but verification pending:** show processing state on confirmation; never render QR before verification.
- **Sold-out tier (limited tickets):** tier disabled with "sold out" state; quantity revalidated at checkout.
- **Guest deep-links to `/checkout`:** prompted to authenticate; cart/context preserved through auth.
- **No internet / venue congestion:** ticket QR + invoice must render from already-loaded data; show cached ticket where possible; clear retry states elsewhere.
- **Event removed/unpublished:** event detail shows not-available state, back to discovery.
- **Empty search/filter result:** empty-state block with clear-filters action.

### 4.2 Sign up → Onboarding
1. `/register` (or modal) → email+password or Google → `/verify-email` (email verification).
2. `/onboarding`: name, phone, DOB, location, optional avatar → submit.
3. Redirect to intended destination (dashboard/checkout) — onboarding status from backend gates protected routes.

**Edge cases:** unverified email blocks protected access with re-send option · Google OAuth callback failure → `/auth/callback` error state → back to login · abandoned onboarding → user is re-routed to `/onboarding` on next protected-route visit · invalid phone/DOB → inline field errors.

### 4.3 Forgot password
`/login` → "Forgot password" → `/forgot-password` (email) → email link → `/reset-password` (new password) → login.
**Edge cases:** expired/invalid token → error with re-request option; unknown email → generic success message (no account enumeration).

### 4.4 Become an Organizer
1. Role switcher → Organizer → `/organizer/onboarding` (business details).
2. `/organizer/document-upload` (KYC docs) → `/organizer/email-verification`.
3. `/organizer/pending` until admin approves → then `/organizer/dashboard`.

**Edge cases:** rejected/incomplete KYC → pending screen communicates status & re-upload path · attempting organizer routes before approval → redirected to pending · attempting without role → `/403`.

### 4.5 Create & publish an event (organizer)
1. `/organizer/create-event` — **Step 1 Event details:** cover image (crop tool), name, category, description, tagline, date, start/end time, venue, Google Maps URL, transport & entry-side notes, guidelines, add-ons, contact info, post-event thank-you note.
2. **Step 2 Ticketing:** one or more tiers — name, description, free or price (₹10 minimum), unlimited or limited quantity.
3. **Step 3 Sponsorship** (optional sponsors).
4. **Step 4 Final review** → publish.
5. Manage via `/organizer/manage-events` and `/organizer/events/[id]`; monitor `/organizer/analytics`.

**Edge cases:** per-step inline validation blocks progression (see §6.3) · image upload failure → retry, previously stored cover accepted · draft/partial state on navigation away · GST threshold banner appears when revenue thresholds approach.

### 4.6 Event day — gate scanning (organizer)
1. `/organizer/events/[id]/scan` → camera opens → scan attendee QR.
2. Valid ticket → success state (attendee/tier info); mark as used.
3. Already-used / invalid / wrong-event QR → distinct error states.

**Edge cases:** camera permission denied → manual code entry fallback guidance · weak connectivity → fast, minimal round-trip per scan, clear pending/retry state · duplicate scan attempts flagged loudly.

### 4.7 Talent onboarding
Role switcher → Talent → `/talent/onboarding` (profile form) → **one-time activation payment** (Razorpay) → `/talent/dashboard`.
**Edge cases:** payment failure → retry without losing form data · unactivated talent hitting dashboard → back to onboarding.

### 4.8 Role switching
Nav user menu → pick role → routed to that role's dashboard if onboarded/approved, else its onboarding/pending screen. Active role travels with every API call (`x-active-role`).

### 4.9 System-level flows
- **Maintenance mode ON (admin):** all public routes rewrite to `/maintenance` (admin routes excluded); auto-recovers when off (flag re-checked ~15s).
- **Session expiry:** silent token refresh; on failure → logged out to login with return path.
- **Forbidden access:** `/403` with route back to a safe home.

---

## 5. SCREENS / PAGES LIST

> Navigation shell: persistent top nav (logo, Events, About, auth/user menu with **role switcher**) + footer on public pages (`site-shell`). Organizer area uses a **sidebar dashboard layout** (`DashboardLayout` + `Sidebar`). Standardized loading/empty/error via `state-block` and full-page `loading-screen`.

### 5.1 Public & marketing

| Screen | Route | Purpose | Key elements | User actions |
|---|---|---|---|---|
| Landing | `/` | First-touch discovery | Hero + search, category filter chips, event cards (handpicked/upcoming), artist section, movie section (teaser), "Got an Event Idea?" suggestion form, restaurant-partner teaser (Coming Soon), footer | Search, filter, open event, submit idea, sign in/up |
| About | `/about` | Value prop per audience | Hero, features, organizer/performer/restaurant/campus-ambassador sections, CTA band | Navigate to sign-up/onboarding per audience |
| Events discovery | `/events` | Main browse surface | Search hero, glass category filters, event grid, date/reviews section | Search, filter by category, open event detail |
| Event detail | `/events/[id]` | Decide & start booking | Cover, schedule, venue + Maps link, ticket tiers & prices, guidelines, reviews | Select tier, proceed to checkout, share |
| Contact us | `/contact-us` | Support intake | Contact form/details | Submit query |
| Grievance | `/grievance` | Formal complaints | Grievance form/policy | Submit grievance |
| Privacy / Terms / Refund | `/privacy-policy`, `/terms&conditions`, `/refund-policy` | Legal | Static content | Read |

### 5.2 Auth & account

| Screen | Route | Purpose | Key elements | User actions |
|---|---|---|---|---|
| Login | `/login` (+ modal) | Sign in | Email/password form, Google button, forgot-password link | Sign in, switch to register |
| Register | `/register` (+ modal) | Sign up | Registration form, Google button, terms dialog | Create account |
| OAuth callback | `/auth/callback` | Complete Google flow | Progress/error state | (automatic) |
| Verify email | `/verify-email` | Confirm address | Status + resend | Resend, continue |
| Forgot password | `/forgot-password` | Request reset | Email form | Submit |
| Reset password | `/reset-password` | Set new password | Password form | Submit |
| User onboarding | `/onboarding` | Unlock platform | Illustrated multi-field form: name, phone, DOB, location, avatar (crop dialog) | Complete profile |

### 5.3 Attendee

| Screen | Route | Purpose | Key elements | User actions |
|---|---|---|---|---|
| User dashboard | `/dashboard` | Signed-in home | Upcoming tickets, shortcuts | Open history/profile/events |
| Profile | `/profile` | Manage account | Sidebar sections: identity, security, preferences, help; avatar crop | Edit fields, change password, set preferences |
| Preferences | `/preferences` | Interests/settings | Preference options | Save |
| Checkout | `/checkout` | Pay for tickets | Order summary, tier/qty, Razorpay trigger | Pay, apply auth mid-flow |
| Order confirmed | `/order-confirmed/[id]` | Ticket delivery | Success state, **QR ticket**, order summary, invoice link | View/save QR, download invoice |
| History | `/history` | Past orders | Order list | Open order |
| Order detail | `/history/[id]` | Single order | Tickets, QR, amounts | Re-view QR, open invoice |
| Invoice | `/invoice/[id]` | Tax document | PDF-exportable invoice (jsPDF) | Download PDF |

### 5.4 Organizer (sidebar layout)

| Screen | Route | Purpose | Key elements | User actions |
|---|---|---|---|---|
| Organizer home | `/organizer` → `/organizer/dashboard` | Overview | Stats grid, upcoming-event highlights, artist-requests carousel, quick actions | Jump to create/manage/analytics |
| Onboarding | `/organizer/onboarding` | Business profile | Multi-field org form | Submit |
| Document upload | `/organizer/document-upload` | KYC | Doc upload slots | Upload files |
| Email verification | `/organizer/email-verification` | Verify org email | Status + resend | Verify |
| Pending approval | `/organizer/pending` | Await admin | Status explanation | Wait / re-check |
| Create event | `/organizer/create-event` | 4-step wizard | EventForm → TicketingForm → SponsorshipForm → FinalForm; cover cropper; step progress | Fill, validate, publish |
| Manage events | `/organizer/manage-events` | Portfolio | Upcoming + all-events sections | Edit, open, share |
| Event page | `/organizer/events/[id]` | Single event mgmt | Event overview, details | Edit, open scanner/analytics |
| **QR scan** | `/organizer/events/[id]/scan` | Gate entry | Camera viewport, result states (valid/used/invalid) | Scan tickets |
| Analytics | `/organizer/analytics` | Performance | Revenue stats, views-vs-purchases chart, event stats, date reviews, approved stalls, GST banner | Inspect, filter by event |
| Stalls | `/organizer/stalls` | Vendor mgmt | Stalls grid, stall details, artist cards/details modal | Review/approve stalls & artists |
| Artist requests | `/organizer/artist-request` | Talent booking | Request list/carousel | Approve/decline |
| Organizer profile | `/organizer/profile` | Org account | Profile fields | Edit |

### 5.5 Talent

| Screen | Route | Purpose | Key elements | User actions |
|---|---|---|---|---|
| Talent landing | `/talent` | Entry point | Talent hero/CTA | Start onboarding |
| Talent onboarding | `/talent/onboarding` | Performer profile + activation | Talent form, activation payment | Submit, pay |
| Talent dashboard | `/talent/dashboard` | Performer home | Profile status, requests | Manage profile |

### 5.6 System

| Screen | Route | Purpose |
|---|---|---|
| Forbidden | `/403` | Role/permission denial, safe exit |
| Maintenance | `/maintenance` | Site-wide downtime notice (middleware rewrite) |
| Global loading | `loading.tsx` / `loading-screen` | Route-transition state |

### 5.7 Navigation map (how screens connect)

```
                    ┌────────────── site-shell top nav ──────────────┐
Landing (/) ── search/filter ──> /events ──> /events/[id] ──> /checkout ──> /order-confirmed/[id] ──> /invoice/[id]
   │                                                    ▲            └──────────────> /history ──> /history/[id]
   ├─> /about ─ per-audience CTAs                       │ (auth modal + /onboarding gate)
   ├─> auth modal ⇄ /login ⇄ /register ─> /verify-email ┘
   └─> role switcher ─┬─ USER ──────────> /dashboard · /profile · /preferences
                      ├─ EVENT_ORGANIZER ─> /organizer/onboarding → document-upload → email-verification → pending → dashboard
                      │                        └─ (approved) → create-event · manage-events → events/[id] → scan · analytics · stalls · artist-request · profile
                      └─ TALENT ──────────> /talent/onboarding (activation pay) → /talent/dashboard
Any route ── maintenance flag ON ──> /maintenance        Insufficient role ──> /403
```

---

## 6. FUNCTIONAL REQUIREMENTS

### 6.1 Authentication & session
- FR-1: Support email+password and Google OAuth sign-in; both from dedicated pages and an in-context modal (checkout must not lose state through auth).
- FR-2: Email verification required; resend supported. Password reset via emailed token.
- FR-3: Session = short-lived access token (sent as `Authorization: Bearer`) + cookie-based refresh (`POST /api/v1/auth/refresh`, `credentials: include`); silent refresh on expiry; hard logout on refresh failure.
- FR-4: All API calls go through a single client (`lib/api/client.ts`) prefixing `/api/v1` and attaching `x-active-role`.

### 6.2 Roles, permissions & gating
- FR-5: Roles = `USER`, `EVENT_ORGANIZER`, `TALENT`; one account may hold several; exactly one **active** role at a time, switchable in-nav.
- FR-6: Route protection by role + onboarding status: unonboarded users → their role's onboarding; unauthorized role access → `/403`.
- FR-7: Organizer access additionally requires: onboarding complete → documents uploaded → email verified → **admin approval** (else `/organizer/pending`).
- FR-8: Talent access requires onboarding + successful one-time activation payment.
- FR-9: Public (guest) access: landing, about, events list/detail, legal, contact. Checkout/dashboards/history/profile require auth + onboarding.

### 6.3 Event creation — validation & business rules (as implemented)
- FR-10 Required: cover image, event name, category, description, start date, start & end time, venue, valid Google Maps URL, contact mobile, contact email, post-event thank-you note.
- FR-11 Limits: tagline ≤ 240 chars; transport & entry-side notes ≤ 1000 chars each; guidelines ≤ 4000 chars.
- FR-12 Ticket tiers: ≥ 1 tier required; each tier needs name + description; **paid tiers ≥ ₹10** (else must be marked Free); tiers marked "limited" require a positive ticket quantity.
- FR-13 Contact: mobile must normalize to a valid **10-digit Indian number** (accepts `+91`/`91` prefix); email must be well-formed; website (optional) must be a valid URL.
- FR-14 Add-ons: enabling gift hampers or "other" add-ons requires a description.
- FR-15 Validation runs per wizard step; users cannot advance past a step with errors; errors shown inline per field.

### 6.4 Checkout, ticketing & payments
- FR-16: Payments via **Razorpay** (INR). Order created server-side; ticket issued **only after backend verifies** the payment signature — never on client success alone.
- FR-17: Limited-quantity tiers must enforce availability at purchase time (prevent oversell).
- FR-18: Each successful order produces: unique ticket(s) with **QR code** (brand-logo-embedded) + a **PDF invoice**; both retrievable later from history.
- FR-19: A QR ticket is single-use: gate scan marks it consumed; re-scan yields "already used".
- FR-20: Refund policy surfaced; refund execution is out of scope for MVP (manual/policy-driven).

### 6.5 Organizer operations
- FR-21: Analytics must show per-event and aggregate: revenue, views vs purchases, ticket sales, date-wise reviews, approved stalls.
- FR-22: **GST threshold banner** appears when organizer revenue nears/passes the GST registration threshold.
- FR-23: Stall management: view/approve stalls and artists; artist booking requests can be reviewed and actioned.
- FR-24: Share-event generates a public shareable link to `/events/[id]`.

### 6.6 Platform behavior
- FR-25: **Maintenance mode**: middleware checks a backend `site-config` flag (cached ≤ 15 s per edge instance); when ON, all non-admin routes rewrite to `/maintenance`; the check **fails open** (site stays up if the flag fetch fails).
- FR-26: Every data surface has explicit loading, empty, and error states (standardized `state-block`).
- FR-27: Suggestions ("Got an Event Idea?") are captured and tied to a user profile (redirects into onboarding when anonymous).

---

## 7. NON-FUNCTIONAL REQUIREMENTS

### 7.1 Platform
- **Responsive web app** (Next.js App Router, React 19) — one codebase for mobile & desktop browsers. No native iOS/Android apps in scope (mobile apps exist as a separate `mobile/` effort — not covered here).
- **Mobile-first is mandatory**, not aspirational: primary audience uses phones at crowded venues.

### 7.2 Performance & resilience (critical — Indian venue context)
- Fast first load on mid-range Android over congested/shared Wi-Fi or 4G; keep payloads light (responsive image pairs already exist for heroes — preserve this discipline).
- **Ticket QR and invoice must render reliably on weak/no connectivity** once loaded; scanning flow must need minimal per-scan round-trips.
- Graceful degradation everywhere: retries, cached last-known state, explicit offline/error blocks — never a blank screen.
- Handle event-spike traffic (festival on-sale moments) without checkout failures.

### 7.3 Security
- Token-based auth with silent refresh; refresh cookie requires correct CORS (credentials + allowed origin).
- Role checked server-side on every request (`x-active-role` is a hint, not an authority).
- Payment integrity: server-side Razorpay signature verification; no client-trusted ticket issuance.
- KYC documents uploaded over authenticated channels; PII (phone, DOB, location) handled per privacy policy.
- No account enumeration in auth flows; standard protections (rate limiting, input validation) expected from backend.

### 7.4 Compliance & locale
- INR pricing, ₹ formatting, Indian mobile-number validation, GST awareness for organizers.
- Legal pages (privacy, terms, refund, grievance) linked from footer — grievance redressal is an Indian-market expectation.

### 7.5 Accessibility & UX quality
- Radix/shadcn primitives keep keyboard & screen-reader behavior — preserve this in any redesign.
- Touch-target sizing and contrast on the cream (`#F5EFE4`) canvas must meet WCAG AA.
- Currently **light-theme only** (dark tokens exist, unwired) — dark mode is a design decision to make, not a bug.

---

## 8. SUCCESS METRICS

### 8.1 North star
- **Tickets booked per month** (paid + free) in launch city.

### 8.2 Attendee funnel KPIs
- Visitor → event-detail view rate; event-detail → checkout start; **checkout → payment success ≥ 85%** (payment failures tracked separately from abandonments).
- Sign-up → onboarding completion ≥ 80%.
- Repeat booking rate (2nd order within 60 days).
- Search/filter zero-result rate (proxy for supply gaps).

### 8.3 Organizer KPIs
- Organizer sign-up → approved (KYC funnel) conversion & time-to-approval.
- Events published per organizer per month; % events using ≥ 2 ticket tiers.
- **Gate scan success rate** (valid scans / attempts) and average scan time on event day.
- Organizer 90-day retention (publishes another event).

### 8.4 Talent KPIs
- Talent onboarding → activation-payment conversion.
- Artist requests sent by organizers; request → booking rate.

### 8.5 Platform health
- Core Web Vitals on mobile (LCP < 2.5 s on mid-range Android / 4G).
- Checkout error rate; payment-verification latency.
- Uptime during event on-sales; maintenance-mode incidents.
- NPS / review ratings collected via date-reviews.

---

## Appendix A — Feature ↔ screen traceability (quick reference)

| Feature | Screens |
|---|---|
| Discovery | `/`, `/events`, `/events/[id]` |
| Auth & onboarding | `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/onboarding` |
| Booking | `/events/[id]`, `/checkout`, `/order-confirmed/[id]`, `/invoice/[id]`, `/history`, `/history/[id]` |
| Organizer lifecycle | `/organizer/onboarding` → `document-upload` → `email-verification` → `pending` → `dashboard` |
| Event lifecycle | `create-event` → `manage-events` → `events/[id]` → `scan` → `analytics` |
| Stalls & talent booking | `/organizer/stalls`, `/organizer/artist-request` |
| Talent | `/talent`, `/talent/onboarding`, `/talent/dashboard` |
| System | `/403`, `/maintenance`, legal & support pages |

*Prepared from the live `Frontend/` codebase. Companion document for visual/design specifics: `FRONTEND_DESIGN_DOC.md`.*
