# DASHBOARD-06 — Personal Command Center (Final Composition)

Status: **Implemented** on branch `cursor/dashboard-d-personal-workspace-discovery`.

## Mission

Compose DASHBOARD-D … DASHBOARD-05 foundations into the final `/dashboard` personal operational home:

**Dashboard = Mein Verein aus meiner Perspektive.**

## Final information architecture

| Order | Section | Component / loader |
|------:|---------|-------------------|
| A | Compact personal welcome | `DashboardCompactWelcome` + context chips |
| B | Schnellzugriff | `PersonalQuickAccess` (DASHBOARD-04) |
| C | Primary workspace | `PersonalDashboardWorkspace` → `PersonalProgrammeFeed` + `PersonalProgrammeMonthCalendar` |
| D | Benötigt meine Aufmerksamkeit | `PersonalAttention` (DASHBOARD-05) |
| E | Meine Aufgaben | `PersonalTasksPreview` (DASHBOARD-05) |
| F | Secondary | `PersonalDashboardSecondary` (collapsible News + activity) |

## Data loading

Entry: `getPersonalCommandCenterData()` in `lib/dashboard/personal-command-center.ts`.

| Surface | Source |
|---------|--------|
| Programme + calendar | Single `loadPersonalProgramme()` with merged range (14-day feed window ∪ visible month grid) |
| Attention + tasks | `loadDashboardPersonalWork()` |
| Quick access | `resolvePersonalQuickAccess()` (unchanged) |
| Secondary news/activity | Lightweight prisma snapshot (max 2 news cards, 4 activity rows) |

**Removed from dashboard runtime:** `getCommandCenterData()` club today pipeline, KPI strip builders, hero image state, `Heute im Verein`, legacy Schnellaktionen, `MeineAgendaWidget` wiring.

`getCommandCenterData()` remains in codebase for potential non-dashboard reuse but is no longer imported by `ClubDashboardView`.

## Programme ↔ calendar coordination

- Shared server fetch: one `PersonalProgrammeItem[]` passed to both columns.
- Calendar: `selectedDayKey` / `onSelectedDayChange` on `PersonalProgrammeMonthCalendar`; embedded with `showSelectedDayPanel={false}` on dashboard.
- Programme: day groups highlight + scroll-into-view when calendar day changes (**no full-list filter** — preserves 14-day scanability).
- Month navigation: `/dashboard?monat=YYYY-MM` (server reload, no second programme loader).

## Removed legacy primary UI

- `DashboardHeroSection` / oversized hero
- `DashboardMetricStrip` / personal KPI strip
- `HeuteImVereinWidget`
- `DashboardOperationalGrid` club/personal split
- `DashboardQuickActionStrip` / Schnellaktionen block
- Primary-position news & activity feeds (demoted to collapsible secondary)

Legacy component files are retained where shared elsewhere; only dashboard composition references were removed.

## Secondary content decision

News and tenant activity remain **authorized, compact, and collapsible** at page bottom (`<details>`). They do not compete with Schnellzugriff, programme, calendar, attention, or tasks.

## Responsive strategy

- **Wide / laptop:** `PersonalDashboardWorkspace` uses `lg:grid-cols-12` with programme `col-span-7` and calendar `col-span-5`.
- **Tablet / narrow:** single column — programme before calendar (DOM order matches reading order).
- Schnellzugriff wraps via existing component styles.

## Accessibility

- Logical heading levels: page `h1` (welcome), section `h2` (programme, calendar, attention, tasks).
- Landmarks: `<header>`, programme `<section aria-labelledby>`, calendar grid aria from `MonthActivityGrid`.
- Calendar selected day: `aria-pressed` (in grid), programme highlight is non-color-only (ring + background).
- Keyboard: quick access, calendar days, programme links, collapsible secondary summary.

## i18n

New keys under `PersonalDashboard.welcome`, `PersonalDashboard.programme`, `PersonalDashboard.secondary` in `de`, `en`, `fr`, `it`.

## Security

No change to DASHBOARD-01…05 boundaries: programme loader authorization, personal attention scope, quick-access permission filtering, zero disclosure preserved.

## Performance notes

Dashboard RSC path avoids ~17-query club `getCommandCenterData` bundle; personal path runs programme + personal work + small secondary snapshot in parallel.

## DASHBOARD-07 handoff

- Engineering closure completed in `docs/dashboard/DASHBOARD-07-ACCEPTANCE-CLOSURE.md` (secondary activity i18n, fail-soft secondary loader, acceptance tests).
- User-led visual polish across viewports remains optional product QA outside automated gates.
- Architecture rebuild should **not** be required: canonical sections and loaders are in place.
- Optional follow-ups: richer relative-time i18n for secondary activity timestamps; tablet calendar accordion if product prefers collapse over stack.
