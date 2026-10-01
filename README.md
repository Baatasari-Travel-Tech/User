# Baatasari — User

The ticket-buyer frontend. Public face: **`baatasari.com`**. Repo `User`,
Cloudflare Worker `user`, local path `D:\Baatasari\User`.

> One of three frontends against the shared backend at `api.baatasari.com`
> (`User` / `Organizer` / `Venue`). Architecture + per-surface auth:
> `D:\Baatasari\THREE-FRONTENDS.md`. Organizers now have their own app at
> `organizer.baatasari.com` (`D:\Baatasari\Organizer`); venues at
> `venue.baatasari.com` (`D:\Baatasari\Venue`).

#### **Discover, connect, experience.**
Baatasari is a location-first platform to book events and experiences near
you — launching in Visakhapatnam.

## What this app does

- **Browse events** — `/events` (search + category/when/budget/where filters,
  all events fetched page by page), `/events/[id]` (server-rendered, with
  `schema.org/Event` JSON-LD).
- **Buy tickets** — `/checkout` → payment via **Cashfree** (the only gateway;
  Razorpay was removed 2026-10-01) → `/order-confirmed/[id]` (QR tickets) →
  `/invoice/[id]` (platform-fee GST invoice, print to PDF).
- **Account** — sign-in/up in a modal (`/login`, `/register` are redirect
  shims), Google sign-in (server-side redirect flow — no client ID needed in
  this app), optional TOTP 2FA, password reset, `/onboarding`, `/profile`,
  `/history` + `/history/[id]`, account self-delete.
- **Talent (performers)** — `/talent`, `/talent/onboarding` (₹299 one-time
  listing fee), `/talent/dashboard`.
- **Organizer marketing** — `/for-organizers`; its "Create your first event"
  buttons go to `https://organizer.baatasari.com/register`.
- **System** — `/maintenance` (site-wide switch set from the admin app),
  `/403`, legal/support pages (privacy, terms, refund, contact-us, grievance).

### No organizer screens here

The old in-app organizer console and the USER↔ORGANIZER toggle were removed
2026-10-01. `baatasari.com/organizer/*` redirects to the same page on
organizer.baatasari.com, and every "for organizers" button links there.

## API & auth notes

- Every call goes through `lib/api/client.ts`, which prefixes `/api/v1` and
  sends `credentials: "include"`. Auth is two httpOnly cookies on
  `api.baatasari.com` (`accessToken`, `refreshToken`) — the frontend never sees
  a token. On a 401 it calls `POST /auth/refresh` once and retries; if that
  fails it clears the session (in every open tab) and goes to login.
- This app is the `user` surface. It does **not** send `X-Baatasari-Surface`
  (no header = `user` on the backend, by design).
- `CORS_ORIGIN` on the backend must include `https://baatasari.com`.

## Build & deploy

- Pushing to `main` builds and deploys the `user` Worker automatically
  (`pnpm cf:build`). Full guide: `DEPLOY-CLOUDFLARE.md`.
- **Build** variables (Settings → Build, not runtime): `NEXT_PUBLIC_API_URL`
  (required — the build fails without it), optional
  `NEXT_PUBLIC_AVATAR_BASE_URL` / `NEXT_PUBLIC_EVENT_COVER_BASE_URL`.
- **Secrets** (runtime): `NEXT_INC_CACHE_S3_ACCESS_KEY_ID` /
  `NEXT_INC_CACHE_S3_SECRET_ACCESS_KEY` for the S3-backed ISR cache.
- Local checks: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`.
  `pnpm cf:build` needs Windows Developer Mode.

## Tech stack

Next.js 16 (App Router, React 19), TypeScript, Tailwind CSS v4 + shadcn/ui,
TanStack Query, Zustand, React Hook Form + Zod, Framer Motion. Fonts:
Bricolage Grotesque (display), Albert Sans (UI), Poppins.

## Project layout

```
app/                 routes (see above)
components/          shell, auth modal, events, checkout, profile, talent,
                     ui/ (shadcn primitives)
lib/api/             API client + typed wrappers (uploads, site-config, ...)
lib/auth/            session store, cross-tab channel, navigation helpers
lib/payments/        cashfree.ts (Cashfree checkout SDK loader)
middleware.ts        maintenance gate + X-Robots-Tag (runs on experimental-edge)
```

Older product/design docs in this folder (`PRD.md`, `FRONTEND_DESIGN_DOC.md`,
`Design.md`) are dated snapshots — each has a note at the top saying what has
changed since.
