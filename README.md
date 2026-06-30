# 🏠 RentWise

A multi-role rental-management platform for **landlords** and **tenants** — list properties, apply for rentals, sign tenants, file maintenance tickets, chat in real time, and pay rent online.

### ▶️ Live demo: **https://rentwise-client.vercel.app**

> First load may take ~40s — the API runs on a free Render instance that sleeps when idle.
> Sign up as a **Landlord** (list properties, review applications) and as a **Tenant** (browse, apply, pay rent) to see both sides.
> Stripe is in **test mode** — pay rent with card `4242 4242 4242 4242`, any future expiry, any CVC.

---

## ✨ Features

**Auth & roles**
- Email/password auth via Firebase; server-side token verification
- Two roles — Landlord and Tenant — with role-guarded routes and APIs

**Listings & applications**
- Landlords: full property CRUD with image uploads
- Tenants: browse available rentals and **apply**
- Landlords approve an application → tenancy is created, the unit flips to *Rented*, other applicants are auto-declined

**Tenancies & rent**
- Landlords assign/end tenancies; tenants get a "Your home" view
- **Stripe Checkout** rent payments with a payment history (test mode)

**Real-time (Socket.io)**
- **Maintenance tickets** — tenants file issues, landlords update status; both sides update live
- **Chat** — 1:1 landlord ↔ tenant messaging
- Toast notifications on new tickets, applications, and messages

**Dashboards**
- Landlord: property/occupancy/ticket stats, applications, messages
- Tenant: current home, open tickets, applications, rent

---

## 🛠 Tech stack

| Layer | Tech |
|------|------|
| Frontend | React + Vite, TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query |
| Backend | Node.js, Express, TypeScript, Socket.io |
| Database | PostgreSQL (Neon) + Prisma ORM |
| Auth | Firebase Authentication (+ firebase-admin) |
| Payments | Stripe (Checkout, test mode) |
| Image uploads | Cloudinary |
| Tooling | npm workspaces (monorepo), Vitest, Testing Library, supertest |
| Hosting | Vercel (client) · Render (API) · Neon (DB) |

**161 tests** (server + client) and live end-to-end verification across every phase.

---

## 🏗 Architecture

```
rentwise/                 npm-workspaces monorepo
├── client/               React + Vite SPA
│   └── src/
│       ├── pages/        Login, Signup, dashboards, payment success
│       ├── components/   PropertyCard, forms, ChatThread, layout/Header, ui/ (shadcn)
│       ├── hooks/        realtime event hooks (tickets, applications, chat)
│       └── lib/          api client, firebase, socket, per-resource API modules
└── server/               Express API
    ├── prisma/           schema + migrations
    └── src/
        ├── routes/       auth, properties, tenancies, applications, tickets, chat, payments, uploads, stats
        ├── services/     business logic (ownership checks, Stripe, Cloudinary, realtime emits)
        ├── middleware/    requireAuth, requireRole, central error handler
        ├── socket/        Firebase-authed Socket.io (per-user rooms)
        └── lib/          prisma, firebase-admin, stripe, cloudinary, typed errors
```

The client talks to the API over REST (TanStack Query + axios) and to Socket.io for live updates. The server verifies Firebase ID tokens, enforces roles and resource ownership, and emits realtime events to the relevant users.

---

## 🚀 Getting started (local)

**Prerequisites:** Node 20+, a Neon (or any Postgres) database, a Firebase project (Email/Password enabled), and Stripe + Cloudinary accounts (test/free).

```bash
git clone https://github.com/SwaibaSohail/rentwise.git
cd rentwise
npm install
```

Create the env files from the examples and fill in your own keys:

```bash
cp server/.env.example server/.env     # DATABASE_URL, FIREBASE_*, STRIPE_SECRET_KEY, CLOUDINARY_*, CLIENT_URL
cp client/.env.example client/.env     # VITE_API_URL, VITE_FIREBASE_*
```

Apply the database schema, then run both apps:

```bash
npm run build --workspace server       # prisma generate
npx prisma migrate deploy --schema server/prisma/schema.prisma
npm run dev                            # client on :5173, API on :4000 (concurrently)
```

Open http://localhost:5173.

### Tests

```bash
npm test                 # server + client
npm test --workspace server
npm test --workspace client
```

---

## ☁️ Deployment

- **Client → Vercel** — root `client/`, framework Vite; env `VITE_API_URL` (the API URL) + `VITE_FIREBASE_*`.
- **API → Render** — build `npm install && npm run build --workspace server`, start `npm start --workspace server`; set all `server/.env` vars, with `CLIENT_URL` = the deployed client origin.
- **DB → Neon** — managed Postgres; run `prisma migrate deploy`.

Add the deployed client domain to **Firebase → Authentication → Authorized domains** so login works in production.

---

## 📄 License

MIT — built as a portfolio project.
