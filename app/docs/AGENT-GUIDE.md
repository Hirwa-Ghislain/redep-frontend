# REDEP App — Portal Implementation Guide

You are implementing pages inside an existing, fully-scaffolded React app. The foundation
(design system, data layer, routing, auth) is DONE and must not be modified. Your job is to
replace placeholder pages in your assigned `src/features/<portal>/` directory with complete,
production-quality implementations.

## Ground rules

1. **Only create/modify files inside your assigned feature directory.** Everything else
   (components, services, config, router, types, mocks) is shared and already wired.
2. Every page **default-exports** a component (the router lazy-imports it by file path).
3. No new npm dependencies. No editing `router.tsx`, `nav.ts`, services, or UI kit.
4. TypeScript strict — verify with:
   `npx tsc --noEmit -p tsconfig.app.json --incremental false`
   (run from `app/`; do NOT run `npm run build` or `npm run dev` — other work is concurrent).
5. **No color gradients anywhere.** Flat color, borders, and the dot motif are the brand.
6. All user-visible money is RWF via `formatRWF` — never raw numbers. Numbers in tables/stats
   get the `tnum` class. Dates via `formatDate`/`formatDateTime`/`timeAgo`.

## Read these files before writing any code

- `src/features/parent/ParentDashboard.tsx` — dashboard pattern (stats, queries, cards)
- `src/features/parent/PaymentsPage.tsx` — mutation + modal + invalidation pattern
- `src/features/parent/ApplicationsPage.tsx` — list + detail Drawer + Timeline pattern
- `src/lib/status.ts` — status→Badge maps (ALWAYS use these; never restyle a status)
- The service file(s) for your domain in `src/services/` — they define every data operation
  and are the ONLY way to touch data.

## Page anatomy (every page)

```tsx
import { PageHeader } from "@/components/layout/PageHeader";
import { PageTransition } from "@/components/motion";

export default function XyzPage() {
  return (
    <PageTransition>
      <PageHeader title="…" description="…" actions={…} />
      {/* content */}
    </PageTransition>
  );
}
```

**Portal home pages only**: replace PageHeader with `HeroBanner`
(`@/components/layout/HeroBanner` — props: eyebrow, title, subtitle, stats[≤3], actions).
One per portal; every other page keeps PageHeader.

**Density rules** (the current design language — keep to it):
- KPI rows: `grid grid-cols-2 lg:grid-cols-4 gap-3` of compact StatCards; content grids `gap-4`,
  usually a 2:1 `lg:grid-cols-3 items-start` split with a right rail.
- Lists inside cards: `divide-y divide-line` rows at py-2.5–3, 13px medium primary text,
  12px muted secondary — never stacked bordered mini-boxes.
- Filter rows: one horizontal line — SearchInput (w-60/72) + compact Selects (w-36/44),
  primary action `ml-auto`.
- Drawer/detail sections: 11px bold uppercase tracking-wide `text-faint` labels,
  `grid-cols-2 gap-y-2.5` fact grids.
- Note: `cn()` is a plain join (no tailwind-merge) — to shrink Card padding pass
  `padded={false}` and set your own `p-4`, don't fight the default class.

- Loading → `Skeleton`/`CardSkeleton` (or `loading` prop on DataTable).
- No data → `EmptyState` with an icon + one-line guidance (+ CTA when sensible).
- Entrance animation for card grids → `Stagger`/`StaggerItem`. Individual blocks → `FadeIn`.

## Data patterns

```tsx
const { user } = useAuth();          // user!.schoolId for school-scoped portals
const { data = [], isLoading } = useQuery({
  queryKey: ["domain", user?.schoolId, filterA],
  queryFn: () => domainService.list(user!.schoolId!, { filterA }),
  enabled: Boolean(user),
});

const act = useMutation({
  mutationFn: () => domainService.doThing(input),
  onSuccess: () => {
    void qc.invalidateQueries({ queryKey: ["domain"] });
    toast({ title: "Done", variant: "success" });   // from "@/stores/uiStore"
  },
  onError: (e) => toast({ title: "Failed", description: (e as unknown as ApiError).message, variant: "error" }),
});
```

- Query keys start with the domain noun. Invalidate broadly (`["domain"]`) after mutations.
- `usePermission().has(P.X)` + `<Can permission={P.X}>` gate action buttons (school portal
  especially — staff accounts hold subsets of `src/config/permissions.ts`).

## UI kit (all in `@/components/ui/*`, layout in `@/components/layout/*`)

| Component | Key props |
|---|---|
| `Button` | `variant` primary/secondary/ghost/danger/gold · `size` sm/md/lg · `loading` · `icon`/`iconRight` |
| `Input` `Textarea` `Select` `Checkbox` `Switch` | `label` `hint` `error`; Select takes `<option>` children; Switch is controlled `{checked,onChange}` |
| `Badge` | `variant` success/warning/danger/info/neutral/gold/ink · `dot` |
| `Card` / `CardHeader` | Card: `padded` (default true), `hover`; CardHeader: `title` `description` `action` |
| `StatCard` | `label` `value` `icon` (Lucide) `delta {value,positive,label}` `tone` default/primary/gold/sky/clay |
| `DataTable<T>` | `columns [{key,header,render,align,className}]` `rows` `keyField` `onRowClick` `loading` `empty` `pageSize` |
| `Tabs` | `items [{value,label,count,icon}]` `value` `onChange` |
| `Modal` | `open` `onClose` `title` `description` `footer` `size` sm/md/lg/xl |
| `Drawer` | like Modal, slides from right; `wide` for 2xl width |
| `Dropdown` | `trigger` node + `items [{label,icon,onSelect,danger}]` and `"divider"` |
| `SearchInput` | debounced `{value,onChange,placeholder}` |
| `ProgressBar` | `value` 0..1, `capacity` flips green→gold→red as it fills |
| `Stepper` `Timeline` `FileDrop` `Avatar` `EmptyState` `Skeleton`/`CardSkeleton` | see source |

## Charts (`@/components/charts/*`) — dataviz rules are non-negotiable

- Use ONLY `TrendChart`, `BarsChart`, `DonutChart`. Colors are assigned automatically from a
  validated palette **by series index — never pass custom colors, never reorder**.
- ≤ 4 series per chart; fold the tail into “Other” for donuts (≤ 4 slices).
- Pass `formatter={formatRWF}` (or `formatCompact`) so tooltips read correctly.
- Never place two y-scales on one chart. Two measures → two charts.
- A chart title/CardHeader must state what it shows.

## Design language recap

- Page bg is `paper`; content sits in white `Card`s with `border-line`.
- Ink (`bg-ink`) blocks are for hero/identity bands only (see SchoolProfilePage hero).
- Type: headings get `font-display`; body defaults are already set.
- Accents: green = primary actions/success, gold = highlights/waitlist-tier, sky = info,
  clay = destructive/overdue. Soft variants (`bg-primary-soft` etc.) for chips/tints.
- Spacing rhythm: grids `gap-4`, section headers `mt-8 mb-3`, KPI rows
  `grid grid-cols-2 xl:grid-cols-4 gap-4`.
- Radius via tokens: `rounded-(--radius-card)` (16) and `rounded-(--radius-ctl)` (10).

## Domain cheat-sheet

- Demo school: `user.schoolId` = `sch_umurav` (umurav Academy) for school/teacher portals.
- Current term: `academicService.currentTerm()` → `term_2026_2` ("2026 · Term 2").
- Seeded volume: ~290 students, ~130 payments, 15 admission applications, 10 teachers,
  3 staff + 3 custom roles, 7 vacancies (vac_1 has an 8-candidate pipeline), 12 district stats.
- IDs and helpers: `src/mocks/db.ts` exports `DEMO` constants if you need a stable reference.
- Label maps: `LEVEL_LABEL`, `FEE_CATEGORY_LABEL`, `CHANNEL_LABEL`, `SCHOOL_TYPE_LABEL`
  (in `@/lib/status`) — never hand-write these strings.

## Definition of done (per page)

- Real data via services; interactive actions actually mutate and refresh via invalidation.
- Loading, empty, and error states handled.
- Keyboard/AT basics: labels on inputs, `aria-label` on icon-only buttons.
- Typecheck passes with the command above.
