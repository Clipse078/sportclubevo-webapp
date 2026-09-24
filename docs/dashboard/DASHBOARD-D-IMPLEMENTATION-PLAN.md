# DASHBOARD-D — Implementation Plan (DASHBOARD-01 … 07)

Recommended sequence validated by discovery. Adjust only if DASHBOARD-01 proves blockers.

## Integration status (2026-09-24)

| Target | Dashboard programme (D … 07R1E) | Notes |
|--------|----------------------------------|--------|
| `origin/STAGE` | **Not integrated** | Personal dashboard never merged to STAGE |
| PR **#706** | **Integrated** (branch tip includes 07R1E + later planning commits) | Canonical engineering source |
| PR **#707** (post P0 fix) | **Integrated** via cherry-pick `8f592373^..73d66e52` on top of `cf4fc108` | PLANNING-UX-05R2 + personal dashboard; see `docs/dashboard/DASHBOARD-P0-REGRESSION-2026-09-24.md` |

Until #706 or #707 merges to STAGE, previews branched from STAGE alone will show the **legacy** club dashboard.

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

**Schema:** No migration (deferred sources unchanged).

**Acceptance:**

- [x] No tenant-wide registration/news counts without personal scope  
- [x] Attention items match actionable definition

**Doc:** `DASHBOARD-05-PERSONAL-ATTENTION-TASKS.md`

---

## DASHBOARD-06 — World-class UI composition

**Mission:** Implement UX blueprint — compact header, grid, responsive, empty states, i18n, demote secondary.

**Status:** Implemented — see `docs/dashboard/DASHBOARD-06-PERSONAL-COMMAND-CENTER.md`.

**Dependencies:** DASHBOARD-02…05.

**Files:** `ClubDashboardView.tsx`, `getPersonalCommandCenterData`, `PersonalDashboardWorkspace`, remove KPI strip + demote hero.

**Acceptance:**

- [x] Visual hierarchy matches blueprint  
- [x] lg/xl breakpoints verified (structural grid tests)  
- [x] a11y audit on calendar + shortcuts (composition landmarks/labels)

---

## DASHBOARD-07 — Final acceptance

**Mission:** Security matrix, product completeness, mobile handoff notes.

**Status:** Implemented — see `docs/dashboard/DASHBOARD-07-ACCEPTANCE-CLOSURE.md`.

**Dependencies:** All prior.

**Deliverables:** Security checklist, zero-disclosure tests, documentation update.

**Acceptance:**

- [x] Cross-tenant tests  
- [x] Child/guardian participation-only exposure documented (see DASHBOARD-07 closure doc + personal-actions suites)  
- [x] MOBILE-D handoff doc (privacy alignment, no scope creep)

**Automated acceptance:** PASS at `f2431d236f9f250678cd6cee36c789fb7d2a0c8c`.

**Human visual acceptance:** REOPENED — **DASHBOARD-07R1** (see `docs/dashboard/DASHBOARD-07R1-VISUAL-ACCEPTANCE-REMEDIATION.md`).

**Roadmap:** DASHBOARD-07 → 07R1 → 07R1A → 07R1B → 07R1C → 07R1D → **07R1E** → 07R2 human acceptance → merge → **MOBILE-D**.

**Next:** DASHBOARD-07R2 final closure → **MOBILE-D**.

---

## DASHBOARD-07R1 — Visual acceptance remediation

**Mission:** Restore personal identity imagery, rebalance premium composition/density, fix Sep 27 calendar indicator defect, upgrade programme timeline + operational calendar markers.

**Status:** In progress on PR #706 (draft during remediation).

**Dependencies:** DASHBOARD-07 automated acceptance (historical PASS preserved).

---

## DASHBOARD-07R1A — Semantic calendar activity presentation

**Mission:** Canonical source-type color coding for personal calendar cells and programme timeline markers (presentation-only); bounded multi-event markers; today/selected independence; matchcenter grid regression safety.

**Status:** In progress on PR #706.

**Dependencies:** DASHBOARD-07R1 calendar activity visibility fix.

---

## DASHBOARD-07R1B — Personal calendar relevance

**Mission:** Restore personal calendar/programme parity — Mein Kalender projects only authorized personal `PersonalProgrammeItem[]` rows (no club-wide leak via admin/view permissions); teamSeason-aligned sporting scope at the programme adapter boundary.

**Status:** Automated PASS / **human FAIL** on STAGE (Sep 2026 calendar). Superseded by DASHBOARD-07R1C.

**Dependencies:** DASHBOARD-07R1A presentation contract.

**Doc:** `docs/dashboard/DASHBOARD-07R1B-PERSONAL-CALENDAR-RELEVANCE.md`

---

## DASHBOARD-07R1C — STAGE data forensics + personal calendar fix

**Mission:** Read-only STAGE forensics for September calendar markers; prove root cause (PersonAssignment + null SFV `teamSeasonId` + empty personal season scope); fix at PersonalContext season resolution and relevance boundary.

**Status:** Implemented on PR #706 — pending DASHBOARD-07R2 human visual acceptance (note: F2 tournaments on 06 / 12 Sep remain personal under team/season scope).

**Dependencies:** DASHBOARD-07R1B.

**Doc:** `docs/dashboard/DASHBOARD-07R1C-STAGE-PERSONAL-CALENDAR-FORENSICS.md`

---

## DASHBOARD-07R1D — Personal trainings (canonical TrainingSession)

**Mission:** Include personally relevant team trainings in the single `loadPersonalProgramme()` universe (Mein Programm + Mein Kalender); batched `listTrainingSessions` by personal `teamSeasonIds`; preserve R1C Event relevance; training-blue presentation.

**Status:** Implemented on PR #706 — pending DASHBOARD-07R2 human visual acceptance.

**Dependencies:** DASHBOARD-07R1C.

**Doc:** `docs/dashboard/DASHBOARD-07R1D-PERSONAL-TRAININGS.md`

---

## DASHBOARD-07R1E — Programme preview + day agenda

**Mission:** Cap Mein Programm dashboard preview to next 3 upcoming personal items; remove redundant relationship context from row presentation; add Alle anzeigen → full Kalender; enable selected-day agenda below calendar from the same programme universe (no second query).

**Status:** Implemented on PR #706 — pending DASHBOARD-07R2 human visual acceptance.

**Dependencies:** DASHBOARD-07R1D.

**Doc:** `docs/dashboard/DASHBOARD-07R1E-PROGRAMME-PREVIEW-DAY-AGENDA.md`

---

## DASHBOARD-07R2 — Final closure

**Mission:** Authenticated human visual sign-off; programme closure; MOBILE-D handoff.

**Status:** Pending DASHBOARD-07R1E engineering PASS + human visual acceptance.

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
