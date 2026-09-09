# Baatasari (Frontend)

#### **Discover, connect, experience.**
Baatasari is a location-first platform to book the best events and experiences near you - built for explorers, organizers, and performers.

## What Baatasari does

- **Discover** what’s happening in your city: browse public events and explore what fits your mood.
- **Connect** the right people:
  - **Users** find and book events.
  - **Event organizers** publish events and manage listings.
  - **Performers (Talent)** create a profile to get discovered by venues/organizers (initially focused on Vizag).
- **Experience** a smoother booking flow with profile onboarding and Razorpay checkout.

## How it works (website flow)

### 1) Explore events (guest or logged-in)

- Visit `/events` to browse public event listings.
- Search by title, venue, category, or tagline.
- Open an event detail page to see schedule, venue, ticket tiers, and pricing.

### Bonus: Suggest new experiences

- The landing page includes a “Got an Event Idea?” section where users can share what they want to see in the city.
- The current UI redirects into onboarding so ideas can be tied to a user profile.

### 2) Sign in / sign up

- Email + password auth.
- Google Sign-In (requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID`).
- Some flows (like checkout) can start as a guest and continue into authentication when required.

### 3) Onboarding unlocks the platform

- Users complete onboarding at `/onboarding` (name, phone, DOB, location, optional avatar).
- Backend onboarding status controls access to protected routes like dashboard, history, and profile.

### 4) Checkout & payments

- Ticket checkout happens on the event detail page and uses **Razorpay**.
- Payment confirmation is validated by the backend before tickets are issued.

### 5) Post-purchase

- Users can access dashboards and history (tickets/purchases), plus manage their profile and preferences.

## Role-based experiences

### User (Explorer)

- Browse events, view details, purchase tickets, and manage profile/preferences.

### Event Organizer

Organizer access requires:

- Registering as an organizer
- Completing organizer onboarding (`/organizer/onboarding`)
- Verifying email (`/organizer/email-verification`)
- Admin approval (organizers may see `/organizer/pending` until approved)

Once approved, organizers can:

- Use `/organizer/dashboard` for analytics and quick actions
- Create events from `/organizer/create-event`
- Manage/edit events via `/organizer/manage-events`

### Talent (Performers)

- Talent onboarding lives at `/talent/onboarding` and includes a one-time activation payment flow.
- Once activated, talent can access `/talent/dashboard`.

## Tech stack

- **Next.js (App Router)** + **React**
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **TanStack React Query** (data fetching/cache)
- **Zustand** (auth/session store)
- **React Hook Form** + **Zod** (forms + validation)
- **Razorpay** (payments)
- **Framer Motion** (landing animations)


## API & auth notes

- Requests are made through `Frontend/lib/api/client.ts` and automatically prefix paths with `/api/v1`.
- Authenticated requests send:
  - `Authorization: Bearer <accessToken>`
  - `x-active-role: <role>` (role-aware routing/behavior)
- Session refresh uses `POST /api/v1/auth/refresh` with `credentials: "include"`:
  - The backend must allow cookies + credentials and include your frontend origin in CORS.

## Project structure
📦Frontend
 ┣ 📂app
 ┃ ┣ 📂403
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂about
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂auth
 ┃ ┃ ┗ 📂callback
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂dashboard
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂events
 ┃ ┃ ┣ 📂[id]
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂forgot-password
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂history
 ┃ ┃ ┣ 📂[id]
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂login
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂logout
 ┃ ┣ 📂onboarding
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂organizer
 ┃ ┃ ┣ 📂analytics
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┣ 📂artist-request
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┣ 📂create-event
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┣ 📂dashboard
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┣ 📂email-verification
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┣ 📂manage-events
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┣ 📂onboarding
 ┃ ┃ ┃ ┣ 📜layout.tsx
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┣ 📂pending
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┣ 📂profile
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┣ 📂stalls
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┣ 📜layout.tsx
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂preferences
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂privacy-policy
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂profile
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂register
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂reset-password
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂talent
 ┃ ┃ ┣ 📂dashboard
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┣ 📂onboarding
 ┃ ┃ ┃ ┗ 📜page.tsx
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂terms&conditions
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📂verify-email
 ┃ ┃ ┗ 📜page.tsx
 ┃ ┣ 📜globals.css
 ┃ ┣ 📜layout.tsx
 ┃ ┣ 📜loading.tsx
 ┃ ┣ 📜page.tsx
 ┃ ┗ 📜providers.tsx
 ┣ 📂components
 ┃ ┣ 📂about
 ┃ ┃ ┣ 📜features.tsx
 ┃ ┃ ┣ 📜hero.tsx
 ┃ ┃ ┣ 📜organizer.tsx
 ┃ ┃ ┣ 📜performers.tsx
 ┃ ┃ ┗ 📜restaurant-owner.tsx
 ┃ ┣ 📂auth
 ┃ ┃ ┣ 📜auth-forms.tsx
 ┃ ┃ ┣ 📜auth-modal-context.tsx
 ┃ ┃ ┣ 📜auth-modal.tsx
 ┃ ┃ ┗ 📜protected-route.tsx
 ┃ ┣ 📂event-org
 ┃ ┃ ┣ 📂analytics
 ┃ ┃ ┃ ┣ 📜approved-stalls.tsx
 ┃ ┃ ┃ ┣ 📜date-reviews.tsx
 ┃ ┃ ┃ ┣ 📜event-details-description.tsx
 ┃ ┃ ┃ ┣ 📜event-overview.tsx
 ┃ ┃ ┃ ┣ 📜event-stats.tsx
 ┃ ┃ ┃ ┗ 📜revenue-stats.tsx
 ┃ ┃ ┣ 📂dashboard
 ┃ ┃ ┃ ┗ 📜Sidebar.tsx
 ┃ ┃ ┣ 📂data
 ┃ ┃ ┃ ┣ 📜analytics-data.ts
 ┃ ┃ ┃ ┣ 📜create-event-data.ts
 ┃ ┃ ┃ ┣ 📜dashboard-data.ts
 ┃ ┃ ┃ ┗ 📜stalls-data.ts
 ┃ ┃ ┣ 📂layout
 ┃ ┃ ┃ ┗ 📜DashboardLayout.tsx
 ┃ ┃ ┣ 📂manage-events
 ┃ ┃ ┃ ┣ 📜all-events-section.tsx
 ┃ ┃ ┃ ┣ 📜manage-events.ts
 ┃ ┃ ┃ ┗ 📜upcoming-events-section.tsx
 ┃ ┃ ┣ 📂stalls
 ┃ ┃ ┃ ┣ 📜artist-card.tsx
 ┃ ┃ ┃ ┣ 📜artist-details-modal.tsx
 ┃ ┃ ┃ ┣ 📜stall-card.tsx
 ┃ ┃ ┃ ┣ 📜stall-details.tsx
 ┃ ┃ ┃ ┗ 📜StallsGrid.tsx
 ┃ ┃ ┣ 📜analytics-chart.tsx
 ┃ ┃ ┣ 📜artist-requests-carousel.tsx
 ┃ ┃ ┣ 📜EventForm.tsx
 ┃ ┃ ┣ 📜EventPage.tsx
 ┃ ┃ ┣ 📜FinalForm.tsx
 ┃ ┃ ┣ 📜navigation.ts
 ┃ ┃ ┣ 📜SponsorshipForm.tsx
 ┃ ┃ ┣ 📜stat-card.tsx
 ┃ ┃ ┣ 📜stats-grid.tsx
 ┃ ┃ ┣ 📜TicketingForm.tsx
 ┃ ┃ ┣ 📜upcoming-event-highlights.tsx
 ┃ ┃ ┗ 📜validateEventform.ts
 ┃ ┣ 📂events
 ┃ ┃ ┣ 📜date-reviews-section.tsx
 ┃ ┃ ┣ 📜event-list.tsx
 ┃ ┃ ┣ 📜handpicked-card.tsx
 ┃ ┃ ┗ 📜hero.tsx
 ┃ ┣ 📂landing
 ┃ ┃ ┣ 📜artist-section.tsx
 ┃ ┃ ┣ 📜category-filter.tsx
 ┃ ┃ ┣ 📜event-card.tsx
 ┃ ┃ ┣ 📜event-section.tsx
 ┃ ┃ ┣ 📜hero-section.tsx
 ┃ ┃ ┣ 📜movie-card.tsx
 ┃ ┃ ┗ 📜movie-section.tsx
 ┃ ┣ 📂platform
 ┃ ┃ ┣ 📜organizer-event-form.tsx
 ┃ ┃ ┣ 📜organizer-shell.tsx
 ┃ ┃ ┣ 📜page-shell.tsx
 ┃ ┃ ┗ 📜state-block.tsx
 ┃ ┣ 📂talent
 ┃ ┃ ┣ 📜talent-application.tsx
 ┃ ┃ ┗ 📜talent_form.tsx
 ┃ ┣ 📂ui
 ┃ ┃ ┣ 📜accordion.tsx
 ┃ ┃ ┣ 📜alert-dialog.tsx
 ┃ ┃ ┣ 📜avatar.tsx
 ┃ ┃ ┣ 📜badge.tsx
 ┃ ┃ ┣ 📜button.tsx
 ┃ ┃ ┣ 📜calendar.tsx
 ┃ ┃ ┣ 📜card.tsx
 ┃ ┃ ┣ 📜carousel.tsx
 ┃ ┃ ┣ 📜chart.tsx
 ┃ ┃ ┣ 📜combobox.tsx
 ┃ ┃ ┣ 📜dialog.tsx
 ┃ ┃ ┣ 📜dropdown-menu.tsx
 ┃ ┃ ┣ 📜inline-spinner.tsx
 ┃ ┃ ┣ 📜input-group.tsx
 ┃ ┃ ┣ 📜input.tsx
 ┃ ┃ ┣ 📜label.tsx
 ┃ ┃ ┣ 📜popover.tsx
 ┃ ┃ ┣ 📜progress.tsx
 ┃ ┃ ┣ 📜select.tsx
 ┃ ┃ ┣ 📜table.tsx
 ┃ ┃ ┣ 📜textarea.tsx
 ┃ ┃ ┣ 📜time-picker.tsx
 ┃ ┃ ┗ 📜toast.tsx
 ┃ ┣ 📜loading-screen.tsx
 ┃ ┣ 📜site-shell.tsx
 ┃ ┣ 📜suggestions-form.tsx
 ┃ ┗ 📜use-toast.ts
 ┣ 📂hooks
 ┃ ┗ 📜use-local-storage.ts
 ┣ 📂lib
 ┃ ┣ 📂api
 ┃ ┃ ┣ 📜client.ts
 ┃ ┃ ┗ 📜uploads.ts
 ┃ ┣ 📂auth
 ┃ ┃ ┣ 📜navigation.ts
 ┃ ┃ ┗ 📜store.ts
 ┃ ┣ 📂payments
 ┃ ┃ ┗ 📜razorpay.ts
 ┃ ┣ 📜about-data.ts
 ┃ ┣ 📜artist-request-data.ts
 ┃ ┣ 📜auth-log.ts
 ┃ ┣ 📜events-data.ts
 ┃ ┣ 📜events-hero-data.ts
 ┃ ┣ 📜format.ts
 ┃ ┣ 📜landing-data.ts
 ┃ ┣ 📜manage-events.ts
 ┃ ┣ 📜preferences-data.ts
 ┃ ┣ 📜roles.ts
 ┃ ┣ 📜suggestions-data.ts
 ┃ ┣ 📜talent-data.ts
 ┃ ┗ 📜utils.ts
 ┣ 📂public
 ┃ ┣ 📜a1.png
 ┃ ┣ 📜a2.png
 ┃ ┣ 📜a3.png
 ┃ ┣ 📜a4.png
 ┃ ┣ 📜avatar.webp
 ┃ ┣ 📜bro.png
 ┃ ┣ 📜e1.png
 ┃ ┣ 📜e2.png
 ┃ ┣ 📜e3.png
 ┃ ┣ 📜event-org.png
 ┃ ┣ 📜FLogo.png
 ┃ ┣ 📜logo.png
 ┃ ┗ 📜logonew.png
 ┣ 📂types
 ┃ ┗ 📜api.ts
 ┣ 📜.env.local
 ┣ 📜.gitignore
 ┣ 📜components.json
 ┣ 📜eslint.config.mjs
 ┣ 📜next-env.d.ts
 ┣ 📜next.config.ts
 ┣ 📜pnpm-lock.yaml
 ┣ 📜package.json
 ┣ 📜postcss.config.mjs
 ┗ 📜tsconfig.json

## Notes / current scope

- Public event discovery is available to guests; checkout and dashboards require authentication.
- Restaurant/Cafe partner section is present on the landing page but marked **Coming Soon** in the UI.
