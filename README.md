# Padelebi 🎾

A padel court booking marketplace for Georgia — like padel.ru / Easy Padel.
Players discover clubs and book courts in real time; club admins manage courts,
schedules and bookings; a platform admin oversees the whole marketplace.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **React 19**
- **Prisma** ORM — SQLite for local dev, Postgres for production
- **Auth.js (NextAuth v5)** — email/password with role-based access
- **Tailwind CSS v4** + custom UI primitives

## Roles

| Role | Can |
|------|-----|
| `PLAYER` | Browse clubs, book/cancel courts, manage profile |
| `CLUB_ADMIN` | Create clubs, manage courts/schedules/blackouts, view bookings |
| `PLATFORM_ADMIN` | Approve/suspend clubs, manage users & roles, platform stats |

## Getting started

```bash
npm install
npm run db:migrate     # create the SQLite schema
npm run db:seed        # sample clubs, courts and demo users
npm run dev            # http://localhost:3000
```

### Demo logins (password: `password123`)

- Player: `player@padelebi.ge`
- Club admin: `club@padelebi.ge`
- Platform admin: `admin@padelebi.ge`

## Key directories

```
prisma/schema.prisma        Data model (User, Club, Court, CourtSchedule, Booking, Blackout, Review)
prisma/seed.ts              Sample data
src/lib/availability.ts     Slot generation from court schedules
src/lib/booking.ts          Conflict-safe booking + cancellation (transactional)
src/lib/auth.ts             Auth.js credentials config
src/lib/session.ts          requireUser / requireRole helpers
src/proxy.ts                Edge route guards by role
src/app/                    Landing, club discovery, club detail + booking
src/app/account/            Player bookings & profile
src/app/club/               Club admin dashboard
src/app/admin/              Platform admin dashboard
src/app/actions/            Server actions (auth, booking, club, admin, profile)
```

## Useful scripts

```bash
npm run db:seed              # reseed
npm run db:reset             # drop + remigrate + seed
npm run db:studio            # Prisma Studio
npx tsx scripts/verify-booking.ts   # booking-engine smoke test
```

## Deploying to production (Postgres on Render)

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
2. Create a Postgres migration and commit it.
3. Push — `render.yaml` provisions a Postgres DB, injects `DATABASE_URL`,
   generates `AUTH_SECRET`, runs `prisma migrate deploy`, and builds the Docker image.

## Roadmap (later phases)

- **Payments** — TBC / Bank of Georgia e-commerce checkout in GEL
- **Matchmaking** — open matches, join by skill level
- **Tournaments & leagues** — registration, brackets, standings
- **Engagement** — notifications, reviews, Georgian localization, map search
