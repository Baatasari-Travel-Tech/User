# Baatasari — Frontend Product & Component Design Documentation (PCD)

> **Purpose** — A design-oriented snapshot of the **current live frontend** for the UI/UX team.
> It documents the brand foundations, design tokens, typography, the full component
> inventory and every screen, so the team can audit, redesign or extend the product
> without reading the codebase.
>
> **Product:** Baatasari — events, dining & activities discovery and ticketing platform (India).
> **Prepared from:** `Frontend/` (Next.js app) · **Date:** 25 Jun 2026 · **Version:** 0.1.0

---

## 1. Product at a glance

Baatasari is a multi-role events platform. Three distinct audiences share one frontend:

| Role | What they do | Entry area |
|------|--------------|------------|
| **User / Attendee** | Discover events, book tickets, manage orders & history | `/`, `/events`, `/checkout`, `/history` |
| **Event Organizer** | Create & manage events, ticketing, stalls, analytics, payouts | `/organizer/*` |
| **Talent / Performer** | Onboard as a performer, manage profile | `/talent/*` |

A single signed-in account can hold multiple roles and **switch between them** in-session
(see the user menu / role-switcher in the top navigation).

---

## 2. Design & technology stack

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 16** (App Router, React 19) |
| Styling | **Tailwind CSS v4** (CSS-first `@theme`, no JS config) |
| Component base | **shadcn/ui** primitives on **Radix UI / Base UI** |
| Motion | **Framer Motion** + **anime.js** |
| Data viz | **Recharts** (custom-themed) |
| Forms | **react-hook-form** + **zod** validation |
| Carousels | **Embla** |
| Icons | **lucide-react** + **react-icons** |
| Documents | **jsPDF** + **html2canvas** (invoices/tickets), **qrcode** (entry QR) |

**Design-token model:** all colour, radius, typography and feature theming live as CSS
custom properties in [`app/globals.css`](app/globals.css), mapped into Tailwind via
`@theme inline`. This is the single source of truth — **changing a token re-themes the
whole app**.

---

## 3. Brand foundations

### 3.1 Logo & brand assets
Located in [`public/`](public/):

| Asset | Use |
|-------|-----|
| `logo.png` / `FLogo.png` | Primary wordmark / favicon (`/logo.png`) |
| `Signature.png` | Signature mark (invoices/tickets) |
| `qr_logo.png` | Logo embedded in ticket QR codes |
| `hero-bg.png`, `events-hero.png`, `talent-hero.png` (+ `-mobile` variants) | Section hero art, responsive pairs |
| `onboard1–5.png` | Onboarding illustration set |
| `campus.png` | Campus Connect surface |

> **Note for UI/UX:** hero art ships as **separate desktop + mobile raster files**.
> Worth reviewing for an SVG/art-directed `<picture>` approach.

### 3.2 Brand colour palette
Core identity is a **deep navy + warm cream + gold** system (a premium, editorial feel
rather than a generic SaaS blue).

| Token | Value | Role |
|-------|-------|------|
| `--brand-navy` | `#0C1D37` | Primary brand / text / primary buttons |
| `--brand-blue` | `#2B4570` | Secondary brand blue |
| `--brand-deep-blue` | `#122848` | Active states, category chips |
| `--royal-blue` | `#1F4FD8` | Accent / interactive highlight |
| `--background` | `#F5EFE4` | App canvas (warm cream) |
| `--nav` | `#FAF9F6` | Top navigation surface |
| `--gold` | `#C2962E` | Gold accent |
| `--gold-text` | `#8A7136` | Gold text |
| `--gold-soft-bg` / `--gold-bar-bg` | `#F0E8D8` / `#FAF6EC` | Soft gold surfaces & bars |

**Foreground / canvas:** warm cream background (`#F5EFE4`) with navy foreground
(`#0C1D37`) — a deliberately non-white base.

### 3.3 Semantic UI tokens (shadcn convention)
Drive every primitive (Button, Card, Input, Dialog…):

`--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`,
`--input`, `--ring`, plus `*-foreground` pairs and a full **sidebar** token set
(`--sidebar*`). Most are defined in **OKLCH** for perceptual consistency.

> ⚠️ **Dark mode:** semantic tokens exist and `dark:` variants are wired into the
> primitives, **but there is no `.dark` theme block or theme toggle yet.** The app is
> effectively **light-only**. Flag for the redesign if dark mode is in scope.

### 3.4 Chart palette
Five-stop categorical scale for analytics (`--chart-1` … `--chart-5`, OKLCH), plus
`--revenue-color: #2563EB` for revenue series.

### 3.5 Feature-scoped token namespaces
The system goes beyond global tokens — each major surface has its **own** token group so
it can be retheme­d in isolation. Namespaces present:

`--hero-*` (landing hero) · `--events-*` · `--upcoming-*` · `--talent-*` (very large set:
surfaces, pills, chips, cards, inputs, callouts, footer) · `--artist-*` · `--stall-*` ·
`--movie-card-*` · `--category-*` · `--glass-*` (glassmorphism for filters).

> This is a **strong, mature token architecture.** Any redesign should preserve the
> namespacing model rather than flatten it back to inline colours.

---

## 4. Typography

Five Google fonts are loaded as CSS variables in [`app/layout.tsx`](app/layout.tsx):

| Font | Variable / class | Role |
|------|------------------|------|
| **Bricolage Grotesque** | `--font-bricolage` / `.font-bricolage` | **All `<h1>` headings** (display) |
| **Albert Sans** | `--font-albert` / `.font-albert` | **Body + h2–h6** (default `--font-sans`) |
| **Poppins** | `--font-poppins` / `.font-poppins` | Accent / select surfaces |
| **Inter** | `--font-inter` / `.font-inter` | Utility / UI text |
| **Sora** | `--font-sora` | Loaded, available for headings |

**Hierarchy rule (in `@layer base`):** `h1` → Bricolage; everything else → Albert Sans;
`body` → Albert Sans.

Helper text styles: `.text-section-title`, `.text-stat-label`, `.text-stat-value`
(`3xl/bold`), `.analytics-title` (`xl/bold`, `#284878`).

---

## 5. Layout, spacing & shape

| Token | Value | Notes |
|-------|-------|-------|
| `--radius` | `0.625rem` (10px) | Base radius |
| Radius scale | `sm` −4px → `4xl` +16px | `--radius-sm … --radius-4xl` |
| Page container | `.page-x` | `max-w-1400px`, responsive padding `px-4 → sm:px-6 → lg:px-10`, centred |

- **Scrollbars** are custom-themed thin (6px, translucent slate).
- **Breakpoints** follow Tailwind defaults (`sm`, `md`, `lg`…); components are
  mobile-first with `sm:`/`lg:` step-ups (important — see §10 audience context).

---

## 6. Component library

### 6.1 Primitives — `components/ui/` (22)
shadcn/Radix-based, themed by the semantic tokens:

`accordion` · `alert-dialog` · `avatar` · `badge` · `button` · `calendar` · `card` ·
`carousel` · `chart` · `dialog` · `dropdown-menu` · `input` · `input-group` · `label` ·
`popover` · `progress` · `select` · `table` · `textarea` · `time-picker` · `toast` ·
`inline-spinner`

**Button** — variants: `default · destructive · outline · secondary · ghost · link`;
sizes: `xs · sm · default · lg · icon · icon-xs · icon-sm · icon-lg`. Base radius
`rounded-md`, 3px focus ring.

**Badge** — variants: `default · secondary · destructive · outline · ghost · link`;
pill-shaped (`rounded-full`).

**Custom button utility classes** (in `globals.css`, used app-wide, pill-shaped):
`.btn-primary` (navy, `rounded-full`, `active:scale-95`), `.btn-outline-red`,
`.btn-outline-gray`, `.btn-pill-sm` + `.btn-pill-active/inactive`, `.btn-base-lg`.

> **Two button systems coexist** — the shadcn `<Button>` (`rounded-md`) and the
> `.btn-*` pill utilities (`rounded-full`). **Worth consolidating** in a redesign.

### 6.2 Feature components — `components/` (≈50)
Grouped by domain:

| Group | Folder | Highlights |
|-------|--------|-----------|
| **Shell** | root | `site-shell` (nav + role switcher + footer), `loading-screen` |
| **Auth** | `auth/` | `auth-modal`, `auth-forms`, `protected-route`, modal context |
| **Marketing / About** | `about/` | `hero`, `features`, `marquee`, `cta-band`, `organizer`, `performers`, `restaurant-owner`, `campus-ambassador` |
| **Events (discovery)** | `events/` | `hero`, `events-search-hero`, `event-grid`, `handpicked-card`, `date-reviews-section`, `footer-social-edit` |
| **Organizer** | `event-org/` | `EventForm`, `TicketingForm`, `FinalForm`, `SponsorshipForm`, `CoverImageCropper`, `EventPage`, dashboard `Sidebar` + `DashboardLayout`, `stat-card`, `stats-grid`, `gst-threshold-banner`, `share-event-button` |
| **Organizer · Analytics** | `event-org/analytics/` | `event-overview`, `event-stats`, `revenue-stats`, `views-vs-purchases`, `date-reviews`, `analytics-chart` |
| **Organizer · Stalls** | `event-org/stalls/` | `stall-card`, `stall-details`, `artist-card` |
| **Talent** | `talent/` | `talent_form` |
| **Platform** | `platform/` | `page-shell`, `state-block` (empty/error/loading states) |
| **Common** | `common/` | `location-autocomplete`, `terms-dialog` |

---

## 7. Screen / page inventory (41 routes)

### 7.1 Public & marketing
| Route | Screen |
|-------|--------|
| `/` | Landing — hero, search, handpicked & upcoming events |
| `/about` | About / value-prop (per-audience sections) |
| `/events` | Event discovery grid + search hero + category filters |
| `/events/[id]` | Event detail — info, ticketing, reviews |
| `/contact-us`, `/grievance` | Support |
| `/privacy-policy`, `/terms&conditions`, `/refund-policy` | Legal |

### 7.2 Auth & account
| Route | Screen |
|-------|--------|
| `/login`, `/register` | Sign in / sign up (also available as modal) |
| `/auth`, `/auth/callback` | OAuth handling |
| `/forgot-password`, `/reset-password`, `/verify-email` | Credential recovery / verification |
| `/onboarding` | First-run onboarding (illustrated, `onboard1–5`) |

### 7.3 User / attendee
| Route | Screen |
|-------|--------|
| `/dashboard` | User home |
| `/profile` (+ `_components/sections`) | Profile, sectioned |
| `/checkout` | Ticket checkout |
| `/order-confirmed/[id]` | Order confirmation |
| `/history`, `/history/[id]` | Past orders / order detail |
| `/invoice/[id]` | Invoice (PDF export) |

### 7.4 Organizer (`/organizer/*`)
| Route | Screen |
|-------|--------|
| `/organizer/dashboard` | Organizer home + stats |
| `/organizer/onboarding`, `/pending`, `/document-upload`, `/email-verification` | Onboarding & KYC flow |
| `/organizer/create-event` | Multi-step event creation (EventForm → Ticketing → Sponsorship → Final) |
| `/organizer/events`, `/organizer/events/[id]` | Event management |
| `/organizer/events/[id]/scan` | **On-site QR ticket scanning** |
| `/organizer/manage-events` | Upcoming + all-events sections |
| `/organizer/analytics` | Revenue, views-vs-purchases, reviews |
| `/organizer/stalls` | Stall & artist management |
| `/organizer/artist-request` | Artist booking requests |
| `/organizer/profile` | Organizer profile |

### 7.5 Talent (`/talent/*`)
| Route | Screen |
|-------|--------|
| `/talent/onboarding` | Performer onboarding |
| `/talent/dashboard` | Performer home |

### 7.6 System / utility
`/403` (forbidden) · `/maintenance` · `/register` · `/verify-email`
Standardised empty/error/loading via `platform/state-block` + `loading-screen`.

---

## 8. Key UX flows

1. **Discover → Book** — Landing/search → `/events` grid (category + glass filters) →
   `/events/[id]` → `/checkout` → `/order-confirmed/[id]` → ticket + QR + `/invoice/[id]`.
2. **Become an Organizer** — role switch → `/organizer/onboarding` → document upload →
   pending/verification → dashboard.
3. **Create an Event** — multi-step wizard: details → ticketing → sponsorship → review →
   publish → manage/analytics.
4. **Event-day** — `/organizer/events/[id]/scan` validates attendee QR codes at the gate.
5. **Role switching** — in-nav switcher routes to the correct dashboard/onboarding per
   role state.

---

## 9. Motion & interaction language

- **Framer Motion** for page/section transitions; **anime.js** for richer sequences.
- Custom keyframe `tooltipFade` (`cubic-bezier(.16,1,.3,1)`) on tooltips & chart tooltips.
- Buttons use `active:scale-95` press feedback and colour/shadow hover transitions.
- Glassmorphism (`--glass-*`) on category filters; soft gold bars for highlights.

---

## 10. Audience & context constraints (important for design decisions)

Baatasari serves **Indian event crowds** — large festival/event spikes and **shared /
congested WiFi**. This shapes UX priorities:

- **Performance-light, mobile-first** screens matter more than heavy desktop richness.
- Responsive hero **mobile asset pairs** exist for exactly this reason — keep payloads small.
- Ticket QR + invoice must render reliably offline-ish / on weak connections.

A linked product surface, **Campus Connect** (`public/campus.png`), is folded into the
platform (campus-oriented tabs/admin) — relevant if the redesign touches campus features.

---

## 11. Notes & opportunities for the UI/UX team

1. **No dark theme** — tokens & `dark:` variants exist but no `.dark` block or toggle. Decide if it's in scope.
2. **Two button systems** (shadcn `rounded-md` vs `.btn-*` `rounded-full` pills) — consolidate.
3. **Raster heroes** — consider art-directed `<picture>`/SVG to cut weight (ties to §10).
4. **Strong token architecture already exists** — extend the namespaced model; don't flatten.
5. **Typography uses 5 font families** — audit whether all are needed (Sora is loaded but lightly used).
6. **Cream-not-white canvas** (`#F5EFE4`) is a deliberate brand signature — preserve it.

---

*Generated from the live `Frontend/` codebase. For component source, see `components/`;
for tokens, see [`app/globals.css`](app/globals.css); for routes, see `app/`.*
