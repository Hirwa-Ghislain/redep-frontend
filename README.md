# REDEP — Rwanda Education Digital Ecosystem Platform

A centralized multi-school platform connecting **Schools, Parents, Teachers, Job Applicants
and Education Authorities** — school discovery with live seats, digital admissions, fee
payments with verifiable receipts, academic monitoring, recruitment, and national oversight.

This repository contains the complete frontend, in two projects:

| Directory  | What                                                        | Dev port |
| ---------- | ----------------------------------------------------------- | -------- |
| `app/`     | The platform — one system, six role-based portals           | 5173     |
| `website/` | Marketing site with the "assembling logo" splash preloader  | 5174     |

Read **[PLAN.md](./PLAN.md)** for the full architecture, role/permission model, portal maps
and cross-cutting flows. `app/docs/AGENT-GUIDE.md` documents the internal component and
data-layer conventions.

## Quick start

```bash
# The platform
cd app
npm install
npm run dev          # http://localhost:5173

# The website (separate terminal)
cd website
npm install
npm run dev          # http://localhost:5174
```

## Demo accounts (any password of 6+ characters, e.g. `demo123!`)

| Email               | Portal |
| ------------------- | ------ |
| `parent@demo.rw`     | Parent — 3 children across 2 schools, balances, receipts, messages |
| `school@demo.rw`     | School Administrator — umurav Academy (full access) |
| `accountant@demo.rw` | School Staff — custom **Accountant** role (finance-only permissions) |
| `teacher@demo.rw`    | Teacher — classes, attendance, gradebook, parent messages |
| `applicant@demo.rw`  | Job Applicant — CV profile, job board, application pipeline |
| `ministry@demo.rw`   | Education Authority — national statistics & reports |
| `admin@demo.rw`      | System Administrator — onboarding, users, roles, audit |

The login page has one-click buttons for each of these.

## How it's built

- **Stack**: React 19, TypeScript (strict), Vite, Tailwind CSS v4 (token-driven design
  system), React Router 7, TanStack Query, Zustand, Framer Motion, Recharts. Website adds GSAP
  for the splash.
- **Role-based portals**: one login; the user's role decides the portal (`/parent`, `/school`,
  `/teacher`, `/applicant`, `/ministry`, `/admin`). School staff use **custom roles** composed
  by their school admin from a permission catalog; nav items and actions are permission-gated.
- **Integration-ready**: all data flows through `app/src/services/*`, currently backed by a
  deterministic in-memory mock DB (`app/src/mocks/db.ts`) that simulates latency and persists
  mutations for the session. Every service function documents its intended Spring Boot
  endpoint. Flip `VITE_USE_MOCKS=false` + set `VITE_API_URL` when the backend lands
  (see `app/.env.example`); the JWT client with refresh hook lives in `app/src/lib/api/client.ts`.
- **Charts** use a colorblind-validated palette (checked with a ΔE/contrast validator) in a
  fixed series order.
- **Splash** (`website/src/splash/`): Rwanda's map assembled from a centroid-sorted dot grid —
  dots bloom outward, the border self-draws, lettering slides in, heartbeat, two-tone curtain
  exit. Geometry is generated offline by `website/scripts/generate-mark.mjs` (committed data).
  Hard-capped, reduced-motion-aware, GSAP-failure-safe; dispatches `app:splash-done`.

## Commands

Both projects: `npm run dev`, `npm run build` (typecheck + bundle), `npm run preview`.
App also has `npm run typecheck`. Website: `npm run generate:mark` regenerates the splash
geometry from `scripts/rwanda.geo.json`.

> Demo notice: payments (MoMo/bank) and SMS are simulated; all people in the seed data are fictional.
