# E-SHURI — Rwanda Education Digital Ecosystem Platform

**Frontend Master Plan & Architecture** — v1.0 (2026-07)

E-SHURI is a centralized multi-school platform connecting Schools, Parents, Teachers, Job
Applicants, and Education Authorities. This repo contains two frontend projects:

| Directory  | What it is                                                                | Stack |
| ---------- | ------------------------------------------------------------------------- | ----- |
| `app/`     | The platform itself — one system, six role-based portals behind one auth | React 19 + TS + Vite + Tailwind v4 + React Router 7 + TanStack Query + Zustand + Framer Motion + Recharts |
| `website/` | Public marketing website with branded "assembling logo" splash preloader  | React 19 + TS + Vite + Tailwind v4 + GSAP |

---

## 1. Design language

One brand across both projects. **No gradients** — flat, confident color, editorial layout,
strong typography, dot-grid motif (the logo is Rwanda's map assembled from dots — "every
school on the map").

### Tokens

App tokens (v2 — cool canvas + pine identity):

| Token          | Value     | Use |
| -------------- | --------- | --- |
| `ink`          | `#10201A` | Primary text |
| `pine`         | `#0A3D2C` | Brand panels — sidebar, dashboard banners, auth aside |
| `paper`        | `#F4F7F5` | App background (cool near-white) |
| `surface`      | `#FFFFFF` | Cards, topbar |
| `primary`      | `#0B8457` | Vivid emerald — actions, active states |
| `primary-deep` | `#076245` | Hover / links |
| `gold`         | `#E7A917` | Accent — highlights, banner actions, splash under-sheet |
| `sky`          | `#1F9BD6` | Informational accent |
| `clay`         | `#D14E28` | Destructive / alerts |
| `line`         | `#E3E9E5` | Borders, dividers |
| `muted`        | `#55655D` | Secondary text |

The website keeps its warm editorial variant of the same family (ink `#101915`, paper
`#F7F5F0`); chart colors are a separately validated set (see `app/src/components/charts/theme.ts`).

- **Type**: Space Grotesk (display/headings/numbers) + Inter (body/UI). Self-hosted via
  `@fontsource-variable` — no runtime font CDN.
- **Radii**: 10px controls, 16px cards, 999 pills. **Shadows**: rare, soft, one level.
- **Motion**: 150–250ms micro-interactions, 300–450ms page/section transitions,
  `ease: [0.22, 1, 0.36, 1]`. Everything respects `prefers-reduced-motion`.

## 2. Roles & portals

One login → role decides the portal. A user can hold multiple roles (e.g. a Teacher who is
also a Parent) and switch via the portal switcher in the topbar.

| Role              | Portal route | Who |
| ----------------- | ------------ | --- |
| `SYSTEM_ADMIN`    | `/admin`     | Platform owner. Full access: schools onboarding, users, global roles/permissions, audit, settings. |
| `MINISTRY_ADMIN`  | `/ministry`  | Education authority. National/district oversight, statistics, reports. Read-heavy. |
| `SCHOOL_ADMIN`    | `/school`    | School owner account. Everything school-scoped + creates **custom staff roles** with permission sets. |
| School staff      | `/school`    | Dynamic roles (Registrar, Accountant, Communications, HR…) — same portal, permission-filtered nav & actions. |
| `TEACHER`         | `/teacher`   | School-linked teacher: classes, attendance, assessments, parent messaging. |
| `APPLICANT`       | `/applicant` | Job seeker (incl. teachers looking for jobs): job board, CV profile, applications. |
| `PARENT`          | `/parent`    | Guardian: multi-school children, discovery, applications, fees, receipts, messages, academics. |

### Permission model (integration-ready)

- Permissions are strings: `domain.action` (e.g. `students.view`, `fees.configure`,
  `recruitment.manage`). Defined once in `config/permissions.ts`.
- Roles map to permission sets. School admins compose **custom roles** from the school-scoped
  permission catalog (Staff & Roles page). System admin composes global roles.
- Backend contract: JWT login returns `{ user, roles[], permissions[], accessToken, refreshToken }`.
  Frontend gates with `<Can permission="…">`, `usePermission()`, route guards, and nav filtering —
  UI gating only; the backend re-enforces.

## 3. App architecture

```
app/src/
  styles/            global.css — Tailwind v4 @theme tokens, base styles
  config/            permissions.ts, roles.ts, nav.ts (per-portal nav w/ permission tags)
  types/             domain models (School, Student, Application, Payment, …)
  lib/               api/client.ts (fetch wrapper + JWT interceptor + refresh stub),
                     queryClient, utils, formatters (RWF currency, dates)
  mocks/             seeded in-memory DB + latency-simulating adapters (swap w/ VITE_USE_MOCKS)
  services/          domain services — one module per domain, mock/http switched
  stores/            authStore (Zustand, persisted), uiStore (toasts, sidebar)
  hooks/             useAuth, usePermission, useQuery wrappers per domain
  components/
    ui/              Button, Input, Select, Badge, Card, StatCard, DataTable, Tabs, Modal,
                     Drawer, Toast, Tooltip, Avatar, EmptyState, Skeleton, Stepper, Timeline,
                     Pagination, SearchInput, FileDrop, ProgressRing …
    charts/          Recharts wrappers styled to token palette (Area, Bar, Donut, Spark)
    layout/          PortalShell (sidebar+topbar), PageHeader, AuthLayout
    auth/            ProtectedRoute, Can, RoleRedirect, PortalSwitcher
  features/
    auth/            Login, Register (parent/applicant), ForgotPassword, SchoolOnboarding request
    parent/ school/ teacher/ applicant/ ministry/ admin/   (pages per portal)
  router.tsx         lazy portal route modules
```

- **Data layer**: TanStack Query everywhere; services return typed promises. Mocks are a
  faithful simulation (latency, pagination, mutations persist in-memory) so swapping in the
  Spring Boot API is changing `services/*` HTTP calls only.
- **Auth flow**: login → store tokens → `RoleRedirect` sends user to their portal home;
  visiting `/` routes by role; guards redirect unauthorized roles; 401 → refresh → logout.

## 4. Portal feature map

**Parent `/parent`** — Dashboard (children overview, dues, notices) · School discovery
(search/filter/compare, live seats) · School profile & apply (stepper w/ documents) · My
applications · Children (per-child: academics, attendance, teachers, fees) · Payments & fees
(balances, pay via MoMo/bank – mocked) · Receipts (search/download) · Messages (threads w/
teachers/school) · Announcements · Transfers (request + history) · Settings.

**School `/school`** — Dashboard (enrollment, seats, revenue, admissions funnel) ·
Admissions (queue, review w/ docs, approve/reject/request-info, waitlist) · Students
(directory, profile, status/former) · Classes & capacity (seats per class) · Fees setup
(categories, amounts, payment channels) · Payments (ledger, reconcile, record offline
payment) · Receipts & accounting (export) · Announcements (compose, target audiences) ·
Messages · Teachers (roster, subjects, class assignment) · Staff & roles (invite staff,
**custom role builder** w/ permission matrix) · Recruitment (vacancies CRUD, applicant
pipeline: applied→shortlist→interview→offer) · Transfers (incoming/outgoing) · School profile
editor (public listing) · Settings.

**Teacher `/teacher`** — Dashboard (today's classes, pending grading, unread messages) · My
classes (roster) · Attendance (per class-date marking) · Assessments & grades (gradebook,
comments) · Messages (parents) · Announcements · Profile.

**Applicant `/applicant`** — Dashboard · Job board (filter by district/type/subject) ·
Vacancy detail & apply · My applications (status timeline) · Profile & CV builder (documents).

**Ministry `/ministry`** — National dashboard (KPIs: schools, enrollment, capacity
utilization, teacher gaps) · Schools registry (verify/inspect) · Enrollment analytics ·
Capacity monitor (district heat list) · Staffing & recruitment trends · Transfer trends ·
Reports (generate/export district & national) · Announcements (national circulars).

**System Admin `/admin`** — Platform dashboard (growth, activity, health) · Schools
(onboarding requests → verify → activate; suspend) · Users (all, impersonation-safe actions)
· Roles & permissions (global catalog editor) · Ministry accounts · Audit log · Platform
settings (payment channels, districts, academic years) · Notifications broadcast.

## 5. Cross-cutting flows (incl. gaps filled beyond the source doc)

1. **School onboarding**: school requests account (public form) → system admin verifies docs
   → activates → school admin invited → profile setup wizard → listed in discovery.
2. **Admission**: parent applies (child info + documents) → school reviews → approve (seat
   auto-reserved, seat counter decrements) / reject / request info → parent notified → on
   approval, child linked to parent account and enrolled.
3. **Payment**: school configures fee structures per class/term → parent sees balance →
   initiates MoMo/bank payment (mock) → receipt generated (ref, QR-style code) → ledgers on
   both sides update → accounting export reflects it.
4. **Transfer/exit**: parent requests → school confirms → student moved to Former Students →
   parent retains read-only history; seat released; ministry trend data updates.
5. **Recruitment**: school posts vacancy → applicants apply → pipeline stages → status
   notifications → hire closes vacancy.
6. **Communication**: school announcements (targeted: all, class, parents-of-class) +
   threaded direct messages (parent⇄teacher, parent⇄school office) + notification center
   (bell) unified across portals.
7. **Academic year/terms** (added): platform-level academic calendar; grades/fees scoped to
   term — required for coherent reporting.
8. **Notification center** (added): every portal has bell + inbox; email/SMS marked as
   channel preferences (SMS = phase 2, disabled toggle w/ note).
9. **Audit log** (added): system-admin visibility of sensitive actions — needed for a
   national platform's accountability.
10. **Receipt verification** (added): public receipt lookup by reference code (anti-fraud).
11. **Waitlist** (added): when seats are full, applications can join a waitlist; school can
    promote when a seat frees.
12. **Parent satisfaction surveys** (from doc §14): ministry-visible aggregate scores;
    parent-side quick survey card.

## 6. Website (`website/`)

Single-page marketing site: splash preloader → hero → "one platform, six portals" → module
tour (discovery, admissions, payments, communication, academics, recruitment, oversight) →
how it works (parent / school / government journeys) → Rwanda-specific (MoMo, SMS, seat
reservation) → phased roadmap → trust/ethics (data protection) → CTA + footer.

**Splash** ("assembling logo"): full-screen overlay, plays once per load. Rwanda map mark
filled with a centroid-sorted dot grid; dots bloom outward, outline self-draws, color wash,
wordmark slides in, heartbeat pulse, two-tone curtain lift (ink panel then gold under-sheet).
Hard-capped at ~6.5s, GSAP-failure fallback, reduced-motion static frame, scroll locked while
visible, dispatches `app:splash-done` for downstream scroll animations. Dot geometry is
generated offline by `scripts/generate-mark.mjs` and committed as data.

## 7. Integration notes (for the Spring Boot backend)

- All server interaction lives in `services/`; every function documents its intended
  endpoint (`// POST /api/v1/auth/login`). Set `VITE_USE_MOCKS=false` + `VITE_API_URL` to go live.
- Pagination contract: `{ items, page, pageSize, total }`. Errors: `{ code, message, fieldErrors? }`.
- Files upload via `multipart/form-data` (FileDrop component emits `File[]`).
- i18n-ready: user-facing strings kept in component scope for now; structure allows a later
  extraction pass (EN/RW/FR planned).

## 8. Ethics & quality bar

- Role gating everywhere; no cross-tenant data in mocks' service layer (school-scoped queries).
- Accessible: semantic landmarks, focus states, keyboard-operable menus/modals/tables,
  WCAG-checked contrast on all token pairs, reduced-motion respected.
- Honest UI: mocked integrations (MoMo, SMS) are labeled as simulated in dev; no dark patterns.
- No PII in seed data beyond invented sample names; documents are placeholders.
