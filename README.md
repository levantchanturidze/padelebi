# Playtora

A multi-sport venue booking marketplace — discover and book padel courts,
tennis courts, football pitches, gyms and more in real time. Venue managers
get a SaaS dashboard for facilities, schedules, bookings and revenue.

Launched in Georgia, designed for global (EU/US) scale.

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript** + **React 19**
- **Prisma** ORM — Postgres in production (Neon on Vercel), SQLite for local dev
- **Auth.js (NextAuth v5)** — email/password + role-based access
- **Tailwind CSS v4** + custom UI primitives
- **next-intl** — `ka` (default) / `en`, Russian planned

## Roles

| Role | Can |
|------|-----|
| `PLAYER` | Browse venues, book/cancel/reschedule, favorite venues, manage profile |
| `CLUB_ADMIN` | Manage venues, facilities, schedules, blackouts, view bookings |
| `PLATFORM_ADMIN` | Approve/suspend venues, manage users & roles, platform analytics |

> Role identifiers are kept legacy-named in the DB; the public copy uses
> "venue manager" / "platform admin".

## Domain model

```
Sport     — catalog of supported sports (padel, tennis, football, gym, …)
Venue     — a physical location (was: Club)
Facility  — a bookable resource at a venue: court, pitch, lane, studio (was: Court)
Booking   — a confirmed reservation against a Facility for a time range
Favorite  — per-user venue bookmark
Review    — per-user venue review
```

Sport-specific metadata (surfaces, pitch sizes, gym equipment, etc.) lives in
`Facility.attributes` (JSON) and is rendered/validated by per-sport adapters in
`src/lib/sports/`.

## Getting started

```bash
npm install
npm run db:push        # sync local SQLite schema (uses .env DATABASE_URL)
npm run db:seed        # sample sports + venues + facilities + demo users
npm run dev            # http://localhost:3000
```

### Demo logins (password: `password123`)

- Player: `player@playtora.app`
- Venue manager: `club@playtora.app`
- Platform admin: `admin@playtora.app`

## Key directories

```
prisma/schema.prisma         Data model (Sport, User, Venue, Facility, …)
prisma/migrations/           Postgres migrations (applied by `prisma migrate deploy`)
prisma/seed.ts               Sample sports, venues, facilities, bookings

src/lib/sports/              Per-sport adapter pattern (types, registry, padel, tennis, football, gym, default)
src/lib/availability.ts      Slot generation from facility schedules
src/lib/booking.ts           Conflict-safe booking + cancellation (transactional)
src/lib/venue-access.ts      Owner / admin authorization for venues
src/lib/auth.ts              Auth.js credentials config
src/proxy.ts                 Edge route guards by role

src/app/                     Landing
src/app/venues/              Discovery + venue detail
src/app/sports/              Sport catalog + per-sport listings
src/app/account/             Player bookings, favorites, profile
src/app/manager/             Venue manager dashboard
src/app/admin/               Platform admin dashboard
src/app/actions/             Server actions (auth, booking, venue, favorite, admin, profile)
```

## Useful scripts

```bash
npm run db:seed                       # reseed
npm run db:reset                      # drop + remigrate + seed
npm run db:studio                     # Prisma Studio
npx tsx scripts/verify-booking.ts     # booking-engine smoke test
```

## Deploying

Vercel auto-deploys `main`. The build script runs
`prisma generate && prisma migrate deploy && next build`, so pending Postgres
migrations are applied to the live DB before the new code starts serving.

## Roadmap

- **Phase 3** — extra booking models (CLASS, DROP_IN, MEMBERSHIP), drop legacy
  `Facility.surface` column, reviews UI, payments (Stripe + Georgian PSP)
- **Phase 4** — Playtora rebrand (Obsidian + Volt design tokens, custom
  typography, copy refresh)
- **Phase 5** — `playtora.app` global launch + `playtora.ge` localized face,
  Russian locale, hreflang
- **Future** — memberships, tournaments, dynamic pricing, mobile apps
