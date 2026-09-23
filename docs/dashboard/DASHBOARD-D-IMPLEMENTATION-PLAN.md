# DASHBOARD-D — Implementation Plan (DASHBOARD-01 … 07)

Recommended sequence validated by discovery. Adjust only if DASHBOARD-01 proves blockers.

---

## DASHBOARD-01 — Personal context + relevance resolver

**Mission:** Single server-side `resolvePersonalDashboardContext()` producing relationships, context labels, and auth-ready scopes.

**Status:** Implemented — see `docs/dashboard/DASHBOARD-01-PERSONAL-CONTEXT-RELEVANCE.md`.

**Dependencies:** None (discovery complete).

**Domains / files:**

- `lib/dashboard/personal-context/` (resolver, labels, relevance, programme adapter contract)  
- `lib/personal-agenda/team-scope.ts`, `calendar-entries.ts`, `event-projection-access.ts`  
- Use: `lib/people/functions.ts`, effective permissions, existing tenant/person models

**Data model impact:** None.

**API impact:** Internal only; optional `GET /api/dashboard/context` later.

**Authorization:** Reuse existing; no dashboard permissions. Event personal projections gated before DTO mapping.

**Tests:** `lib/dashboard/personal-context/__tests__`, `lib/personal-agenda/__tests__/event-*`

**Acceptance gates:**

- [x] Context labels match matrix for trainer, player, org function  
- [x] Multi-team user receives union without duplicate team rows  
- [x] Zero disclosure for unauthorized / non-relevant events

---

## DASHBOARD-02 — Mein Programm aggregation

**Mission:** Extend personal programme loader for 14-day window; add event visibility filtering; unify with dashboard DTO.

**Status:** Implemented — see `docs/dashboard/DASHBOARD-02-PERSONAL-PROGRAMME.md`.

**Dependencies:** DASHBOARD-01.

**Files:** `lib/personal-agenda/*`, new dashboard loader wrapping agenda (replace club `todayItems` for personal view).

**Data model:** None.

**API:** RSC data function `getPersonalDashboardProgramme()`.

**Authorization:** Per-event visibility integration (critical).

**Tests:** Aggregation, dedupe, cancelled events, timezone boundaries.

**Acceptance:**

- [x] No unauthorized event titles in programme  
- [x] Training/match/tournament/event/meeting sources appear per matrix (tasks/participation remain DASHBOARD-05)

---

## DASHBOARD-03 — Mein Kalender

**Mission:** Extract shared month calendar primitive; embed in dashboard; share dataset with programme.

**Status:** Implemented — see `docs/dashboard/DASHBOARD-03-PERSONAL-CALENDAR.md`.

**Dependencies:** DASHBOARD-02.

**Files:** `components/ui/calendar/MonthActivityGrid.tsx`, `PersonalProgrammeMonthCalendar.tsx`, `lib/calendar/month-grid.ts`; refactored Matchcenter + Personal Kalender views.

**Data model:** None.

**Tests:** Dot rendering, selected day filter, a11y, timezone grid range, Matchcenter structural regression.

**Acceptance:**

- [x] Single programme dataset feeds calendar dots + selected day (tasks optional on full Kalender page)  
- [x] Reusable calendar component ready for DASHBOARD-06 composition (mobile collapse deferred to DASHBOARD-06)

---

## DASHBOARD-04 — Schnellzugriff personalization

**Mission:** Unified catalog from nav + create actions; pin/reorder; persistence.

**Status:** Implemented — see `docs/dashboard/DASHBOARD-04-QUICK-ACCESS.md`.

**Dependencies:** DASHBOARD-01 (for default scoring).

**Schema:** `UserDashboardQuickAccessPreference` (per user per tenant).

**Files:** `lib/dashboard/quick-access/`, migration, `PersonalQuickAccess` / `QuickAccessCustomizer`, `/api/dashboard/quick-access`.

**Tests:** Permission change removes pin; tenant switch loads correct prefs.

**Acceptance:**

- [x] 8 pin max; cross-device persistence  
- [x] No permission escalation via pins

---

## DASHBOARD-05 — Personal attention + task integration

**Mission:** Replace `buildAttentionItems` with personal attention aggregator; wire tasks/participation/requirements.

**Dependencies:** DASHBOARD-01, personal-actions stable.

**Files:** `lib/dashboard/personal-attention/`, update `ClubDashboardView` data loading.

**Schema:** Possibly registration assignee index if missing.

**Acceptance:**

- [ ] No tenant-wide registration/news counts without personal scope  
- [ ] Attention items match actionable definition

---

## DASHBOARD-06 — World-class UI composition

**Mission:** Implement UX blueprint — compact header, grid, responsive, empty states, i18n, demote secondary.

**Dependencies:** DASHBOARD-02…05.

**Files:** `ClubDashboardView.tsx`, dashboard UI components, remove KPI strip + demote hero.

**Acceptance:**

- [ ] Visual hierarchy matches blueprint  
- [ ] lg/xl breakpoints verified  
- [ ] a11y audit on calendar + shortcuts

---

## DASHBOARD-07 — Final acceptance

**Mission:** Security matrix, product completeness, mobile handoff notes.

**Dependencies:** All prior.

**Deliverables:** Security checklist, zero-disclosure tests, documentation update.

**Acceptance:**

- [ ] Cross-tenant tests  
- [ ] Child/guardian participation-only exposure documented  
- [ ] MOBILE-D handoff doc (privacy alignment, no scope creep)

---

## Query / performance architecture (dashboard-specific)

### Current (`getCommandCenterData`)

- One large `Promise.all` (~17 prisma calls) + sequential enrichment (policies, logos, allocations).  
- Then sequential: personal agenda, personal tasks, hero state.  
- **Risk:** Duplicate event queries (club today + personal team events).  
- **N+1:** Mostly batched; tournament participants batched by event ids.

### Target personal dashboard loader

| Rule | Detail |
|------|--------|
| Parallel domain fetch | Programme projections + attention adapters in `Promise.all` |
| Bounded windows | 14d programme, 30d calendar month, 5 task preview, 10 attention |
| No full-table scans | Always `take` + indexed filters |
| Cache | Optional short TTL per user+tenant at RSC layer only if existing pattern; no global PERFORMANCE programme |
| Client waterfalls | Single server component fetch; calendar filter client-only |

---

## KPI strip recommendation

| KPI | Recommendation |
|-----|----------------|
| Meine Aufgaben count | **REMOVE** strip — show in Meine Aufgaben section |
| Meine Termine count | **REMOVE** — programme shows next items |
| Benötigt Aufmerksamkeit | **CONTEXTUALIZE** inside attention section only |
| Offene Anmeldungen | **REMOVE** global — personal attention when assigned |

---

## Components deletable after replacement

- Prime usage of `DashboardMetricStrip` on club dashboard  
- `HeuteImVereinWidget` in primary grid (file may remain for admin optional view)  
- `DashboardHeroSection` large hero default  
- Hardcoded `COCKPIT_QUICK_ACTION_KEYS` filter  
- Legacy unused exports if grep confirms no imports (`DashboardSmartNudges`, old KPI grids)

Keep and reuse: `DashboardSection`, `DashboardEmptyState`, `MeineAufgabenWidget`, `DashboardAttentionList` (with new data), `DashboardOperationalGrid` (restructured).
