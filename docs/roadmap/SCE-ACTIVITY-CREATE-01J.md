# SCE-ACTIVITY-CREATE-01J — Dashboard + Mein Programm (Personal Workspace Adoption)

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-ACTIVITY-CREATE-01J` |
| **Programme** | [`SCE-ACTIVITY-CREATE-01`](./SCE-ACTIVITY-CREATE-01.md) |
| **Depends on** | **01I CLOSED** (Programme Engine + PERSON foundation), **Navbar Upgrade #847 CLOSED** |
| **Status** | **IN PROGRESS — R5.3.1 hierarchical navigation selected state** |
| **Branch** | `cursor/sce-activity-create-01j-dashboard-mein-programm-70bb` |

## Product principle

ONE Programme Engine. ONE world-class SCE activity card family. Multiple scopes: TEAM → CLUB → **PERSON**.

Dashboard = personal home (preview + orientation). Mein Programm = full personal programme workspace. Mein Kalender = month workspace + tasks filter — shares the same PERSON programme source.

## 01J-R1 — Inventory (STAGE baseline)

### Routes

| Surface | Route | Page / shell |
|---------|-------|----------------|
| **Dashboard (home)** | `/dashboard` | `ClubDashboardView` → deferred `ClubDashboardCommandCenterAsync` → `PersonalDashboardWorkspace` |
| **Mein Programm (canonical)** | `/dashboard/mein-programm` | List-first workspace + `ProgrammeViewSwitcher` (Liste \| Kalender) — **R2** |
| **Mein Kalender** | `/dashboard/kalender` | `PersonalKalenderWorkspace` → `PersonalKalenderMonthWorkspace` + `SceCalendarEngine` |
| **Club Programme (not personal)** | `/dashboard/programm` | `queryProgramme` CLUB scope — out of 01J personal boundary |

### Current data flow

```text
                    queryProgramme(scope: PERSON)
                              |
              programmeItemsToPersonalProgrammeItems
                              |
                   PersonalProgrammeItem  ← shared view model (01J-R1)
                    /         |         \
                   /          |          \
loadPersonalProgramme   loadPersonalCalendarMonthBundle   loadPersonalCalendarEntryProjections
        |                        |                              |
 personal-command-center    /dashboard/kalender          loadPersonalAgenda (today/tomorrow)
        |                        |
 PersonalDashboardWorkspace   SceCalendarEngine MICRO
 (Mein Programm preview)       (Mein Kalender)
```

**Meetings:** `loadMeetingProgrammeItems` merged in `loadPersonalProgramme` and `calendar-entries` (not in Programme Engine sporting kinds).

**Tasks / participation deadlines:** `loadPersonalCalendarMonthBundle` / `loadPersonalAgenda` — separate projections, not Programme Engine.

### Target data flow (01J closure)

Same as above, with Mein Programm workspace consuming `PersonalProgrammeViewModel` + canonical `ProgrammeListeView` / list grouping (Heute / Morgen / …) and optional calendar toggle — **no second engine**.

### Canonical vs legacy

| Area | Canonical | Legacy / duplicate |
|------|-----------|-------------------|
| PERSON sporting data | `loadPersonScopeSportingProgrammeItems` → `queryProgramme` PERSON | `training-programme-adapter`, `team-event-programme-adapter` (**LEGACY_RETAINED** — tests/diagnostics only) |
| View model | `PersonalProgrammeItem` / `PersonalProgrammeViewModel` | Pseudo-items built only in legacy adapters |
| Dashboard programme rows | `PersonalProgrammeCanonicalAgendaRow` → Sce* COMPACT | `PersonalProgrammeAgendaRow` legacy path when `canonicalPresentation` missing |
| Dashboard calendar (cockpit) | `PersonalProgrammeMonthCalendar` on same programme items | — |
| Full personal calendar | `loadPersonalCalendarMonthBundle` → `SceCalendarEngine` | — |
| Club/team programme | `ProgrammeSceActivityCard` | N/A for 01J |
| Today widgets | Not wired on `/dashboard` (R3) | `DashboardTodayEventCards`, `MeineAgendaWidget` remain exported — **R5** cleanup if unused |

### Duplicate programme queries (R1 resolution)

Before R1, `loadPersonalProgramme` and `loadPersonalCalendarEntryProjections` each inlined identical `queryProgramme` PERSON calls. **R1** extracts `loadPersonScopeSportingProgrammeItems` as the single sporting-programme boundary.

### Activity cards

| Consumer | Cards |
|----------|--------|
| Dashboard programme preview | `SceTrainingCard`, `SceMatchCard`, `SceTournamentCard`, `SceClubEventCard` via `PersonalProgrammeCanonicalAgendaRow` |
| Personal calendar MICRO | `buildPersonalCalendarDayPresentation` / `ProgrammeCalendarMicroEntry` semantics |
| Mein Kalender mobile day | Normalized calendar items → presentation pipeline |

No `SceDashboard*` card family.

### PERSON scope regression checklist (preserve 01I R6.4/R6.5)

Trainings, matches (incl. SFV null `teamSeasonId`), tournaments, club events (exact OrgUnit), multi-team relevance, match crest grammar, club-event tenant crest, location/time MICRO — **do not regress** during 01J UI work.

### Internal iterations

| Iteration | Scope |
|-----------|--------|
| **R1** | Inventory, shared PERSON loader, docs, regression tests |
| **R2** | Mein Programm canonical PERSON workspace (list-first + view modes) |
| **R3** | Dashboard Mein Programm preview polish |
| **R4** | Dashboard Mein Kalender adoption |
| **R5** | Contextual Erstellen + quick-action cleanup (**complete**) |
| **R6** | Responsive / a11y / empty / loading / error |
| **R7** | Legacy audit + closure |

### Navbar

01J **consumes** accepted #847 navigation — no shell redesign unless proven integration defect.

## 01J-R2 — Mein Programm canonical PERSON workspace

| Decision | Value |
|----------|--------|
| **CANONICAL_MEIN_PROGRAMM_ROUTE** | `/dashboard/mein-programm` |
| **DEFAULT_VIEW** | `liste` (`ansicht` omitted) |
| **CALENDAR_VIEW** | `?ansicht=kalender` (+ optional `monat`, `quelle`) |
| **VIEW_STATE** | Reuses `parseProgrammeUrlState` / `buildProgrammeHref` (`ansicht`, `monat`, `teams`, `typ`) |
| **FILTER_STATE** | Activity type (`typ`) + team (`teams`) in URL; multi-select via `aria-pressed` controls (not toggles) |
| **DATA_RANGE** | List: tenant-local today → +90 days (`resolveMeinProgrammListeRange`). Calendar: month grid via `loadPersonalCalendarMonthBundle` |
| **LEGACY_CALENDAR_ROUTE** | `/dashboard/kalender?quelle=termine` |
| **LEGACY_COMPATIBILITY** | Server redirect → `/dashboard/mein-programm?ansicht=kalender&monat=…` (Mein Kalender `alle` / `aufgaben` unchanged) |
| **TASK_LAYER_DECISION** | Liste = Programme Engine sporting items (+ meetings via `loadPersonalProgramme`). Kalender reuses personal month bundle: tasks remain a separate calendar layer (`quelle=aufgaben` / `alle`), not ProgrammeItems |
| **CANONICAL_CARD_USAGE** | `PersonalProgrammeCanonicalAgendaRow` → `SceTrainingCard` / `SceMatchCard` / `SceTournamentCard` / `SceClubEventCard` (`STANDARD` list density) |
| **PERSON_SOURCE** | `loadPersonalProgramme` → `loadPersonScopeSportingProgrammeItems` (R1 boundary) |
| **LEGACY_RETAINED** | `training-programme-adapter.ts`, `team-event-programme-adapter.ts` unchanged |
| **DASHBOARD_FULL_PROGRAMME_LINK** | Dashboard preview “Alle anzeigen” → `/dashboard/mein-programm` |

## 01J-R3 — Dashboard Mein Programm world-class preview

| Decision | Value |
|----------|--------|
| **DASHBOARD_PROGRAMME_ROLE** | Orientation + near-term personal programme preview (not full workspace) |
| **PROGRAMME_SOURCE** | `getPersonalCommandCenterData` → `loadPersonalProgramme` → `loadPersonScopeSportingProgrammeItems` (PERSON) |
| **PERSON_SCOPE** | Shared R1 boundary — no duplicate `queryProgramme` in dashboard loaders |
| **VIEW_MODEL** | `PersonalProgrammeItem` / feed groups from `buildProgrammeFeedGroups` |
| **PREVIEW_LIMIT** | `DASHBOARD_COCKPIT_PROGRAMME_PREVIEW_ITEM_LIMIT = 5` (presentation-only cap in `PersonalDashboardWorkspace`) |
| **DATE_GROUPING** | Canonical Heute / Morgen / locale date headings via `ProgrammeFeedGroup.labelKind` |
| **CARD_DENSITY** | `COMPACT` via `PersonalProgrammePreviewRow` → `PersonalProgrammeCanonicalAgendaRow` → Sce* list-row |
| **FULL_PROGRAMME_ROUTE** | Cockpit header CTA → `/dashboard/mein-programm` (`MEIN_PROGRAMM_BASE_PATH`, “Alle anzeigen”) |
| **NEXT_ACTIVITY_EMPHASIS** | First preview row receives modest `highlighted` styling; no separate hero card family |
| **DUPLICATE_WIDGETS_REMOVED** | Cockpit calendar `showSelectedDayPanel={false}` — day sporting rows only in Mein Programm preview (avoids triple representation with feed + selected-day panel) |
| **DISTINCT_WIDGETS_RETAINED** | `PersonalProgrammeMonthCalendar` grid + markers; `PersonalAttention`; `PersonalTasksPreview`; `PersonalQuickAccess`; `PersonalDashboardSecondary` (non-programme club signals) |
| **MEETING_HANDLING** | `loadMeetingProgrammeItems` merged in `loadPersonalProgramme`; preview uses legacy compact `PersonalProgrammeAgendaRow` (not Sce* sporting cards) |
| **TASK_HANDLING** | Tasks remain separate cockpit card / calendar layer — not ProgrammeItems |
| **LEGACY_FALLBACK_STATUS** | Sporting PERSON rows always carry `canonicalPresentation`; dashboard preview uses Sce* path. Legacy `PersonalProgrammeAgendaRow` fallback retained for **meetings** and **degraded/missing presentation** (Kalender mobile day, tests) |
| **MEIN_PROGRAMM_RANGE_REVIEW_REQUIRED** | **NO** (list remains tenant-local today → +90 days; out of R3 scope) |

### R3 activity presentation (unchanged semantics)

| Kind | Dashboard preview |
|------|-------------------|
| **TRAINING** | SceTrainingCard COMPACT — club/host · venue · resource hierarchy |
| **MATCH** | SceMatchCard — home left / away right, crests when resolvable |
| **TOURNAMENT** | SceTournamentCard — tournament identity (not match layout) |
| **CLUB EVENT** | SceClubEventCard — VERANSTALTUNG + tenant/club identity |
| **MULTI_TEAM** | Programme Engine dedupe; team/context on cards where needed |

### R3 duplication audit

| Tag | Component | Reason |
|-----|-----------|--------|
| **REMOVED_DUPLICATE** | Selected-day agenda under cockpit calendar | Same PERSON items already in Mein Programm preview feed |
| **RETAINED_DISTINCT_WIDGET** | Calendar month grid | Date orientation + day selection sync to feed scroll |
| **RETAINED_DISTINCT_WIDGET** | Tasks / Attention | Personal action layers, not programme sporting cards |
| **RETAINED_DISTINCT_WIDGET** | Secondary news/activity | Tenant operational signals, not personal programme |

## 01J-R4 — Canonical three-row programme cards + Dashboard Mein Kalender

| Decision | Value |
|----------|--------|
| **MEIN_PROGRAMM_CARD_INFORMATION_CONTRACT** | TYPE label (not counted) + **ROW 1** activity identity + club crest(s) · **ROW 2** team(s)/OrgUnit(s) · **ROW 3** time → location |
| **MATCH_ROW_1** | HOME club + crest \| VS \| away crest + club (home always left) |
| **MATCH_ROW_2** | `teamContext.name` (own SCE team) |
| **MATCH_ROW_3** | Kickoff only when end is not authoritative — no fabricated match end |
| **MICRO_CONTRACT** | Unchanged — calendar cells keep TYPE → identity → time → location (not three-row programme cards) |
| **CANONICAL_COMPONENT_LAYER** | `SceTrainingCard` / `SceMatchCard` / `SceTournamentCard` / `SceClubEventCard` `listRowPresentation="operational"` (match: `programme-fixture`) |
| **DASHBOARD_ONLY_IMPLEMENTATION** | **NO** — Dashboard preview + `/dashboard/mein-programm` Liste share the same Sce* list-row contract |
| **DASHBOARD_CALENDAR_ROLE** | Compact month orientation (where in month, which days have activities, day selection) — not a second programme feed |
| **CANONICAL_CALENDAR_PIPELINE** | `loadPersonalProgramme` → `PersonalProgrammeMonthCalendar` / `loadPersonalCalendarMonthBundle` → `SceCalendarEngine` MICRO |
| **DASHBOARD_CALENDAR_SOURCE_MODE** | Programme sporting items from PERSON scope; tasks remain separate calendar layer on full Kalender (`quelle`) |
| **TASK_LAYER_VISIBLE** | Dashboard cockpit: tasks card; full calendar: `quelle=alle` / `aufgaben` unchanged |
| **MEETING_BEHAVIOR** | Meetings stay legacy compact rows — not forced into Sce* sporting cards |
| **SELECTED_DAY_BEHAVIOR** | Calendar-native selection styling; **no** selected-day sporting agenda under cockpit calendar (`showSelectedDayPanel={false}` frozen) |
| **PROGRAMME_SYNC_BEHAVIOR** | Calendar day selection highlights feed group + scrolls preview **only when** that day appears in the 5-item preview cap |
| **FULL_CALENDAR_ROUTE** | Dashboard “Kalender öffnen” → `/dashboard/mein-programm?ansicht=kalender&monat=…` (`buildMeinProgrammKalenderOpenHref`) |
| **LEGACY_CALENDAR_DEPENDENCIES** | `/dashboard/kalender?quelle=termine` redirect retained; cockpit no longer links there for “open calendar” |
| **LEGACY_REMOVAL_TARGET** | R5+ — unused today widgets; optional retirement of `dashboard-opponent` / `dashboard-agenda` list-row aliases |
| **RESPONSIVE_BEHAVIOR** | Same three-row semantics desktop/tablet/mobile with wrapping; cockpit calendar uses `density="cockpit"` |

### R4 calendar inventory

| Class | Component / module |
|-------|-------------------|
| **CANONICAL** | `PersonalProgrammeMonthCalendar`, `MonthActivityGrid`, `loadPersonalCalendarMonthBundle`, `SceCalendarEngine`, `buildPersonalCalendarDayPresentation` |
| **DASHBOARD-SPECIFIC** | `PersonalDashboardWorkspace` composition + preview scroll guard (`previewDayKeys`) |
| **REUSABLE** | Month navigation hrefs from personal command center; same `PersonalProgrammeItem[]` as programme preview |
| **LEGACY** | `/dashboard/kalender` workspace for tasks-heavy flows — redirect compatibility only for `quelle=termine` |
| **DUPLICATED** | **None** — no `DashboardCalendarEngine` / duplicate PERSON resolver |

## 01J-R5.1 — Programme card visual family + canonical match fixture (inside crests)

| Decision | Value |
|----------|--------|
| **PROGRAMME_CARD_VISUAL_FAMILY** | Programme list rows use `SceProgrammeActivityCardShell` — same elevated match-card surface tokens as Team → Resultate (`SCE_MATCH_CARD_SHELL_CLASS` / `--sce-match-card-surface`) |
| **RESULTATE_VISUAL_REFERENCE** | Team → Resultate `SceMatchCard` COMPACT standalone cards — geometry, pitch-opaque surface, subtle border, radius, hover/focus |
| **PURPOSE_BUILT_COMPOSITION_RULE** | **Same SCE card family ≠ same internal layout** — Resultate stays score-centric; Programme keeps operational three-row compositions |
| **PROGRAMME_THREE_ROW_CONTRACT** | TYPE label + Row1 identity/crest(s) + Row2 team/org/context + Row3 time + location (unchanged from R4) |
| **MATCH_INSIDE_CREST_RULE** | Programme Match Row1: **HOME NAME → HOME CREST → VS → AWAY CREST → AWAY NAME** (crests inside, adjacent to VS; compact centred fixture band) |
| **MATCH_HOME_AWAY_RULE** | HOME left, AWAY right — sporting semantics authoritative (never reorder for tenant display) |
| **PROGRAMME_SURFACE_ADOPTION** | `/dashboard`, `/dashboard/mein-programm`, `/dashboard/programm`, `/dashboard/teams/[teamId]/programm` — canonical `Sce*` list-row + shared programme shell (no page-specific card forks) |
| **DENSITY_RULE** | Dashboard preview **COMPACT** shell padding; full programme lists **STANDARD** — Resultate grid density unchanged |
| **CALENDAR_MICRO_EXCLUSION** | Calendar MICRO cells frozen — no programme card shell on calendar tiles |

Shared modules: `activity-card-programme-shell.ts`, `SceProgrammeActivityCardShell.tsx`, `ProgrammeSceActivityCard`, `PersonalProgrammeCanonicalAgendaRow`.

## 01J-R5.3 — Club Event tenant identity + Navbar corrections

| Decision | Value |
|----------|--------|
| **CLUB_EVENT_TENANT_IDENTITY** | Tenant-owned Club Events use **tenant club crest** wherever SCE renders visual Club Event identity (`attachSceClubEventTenantClubIdentity` + `resolveSceClubEventPrimaryVisualIdentity` on `SceClubEventCard`) |
| **TENANT_IDENTITY_VS_AUDIENCE** | Crest = **which club owns the event**; audience = **who it is relevant to** — independent |
| **PROGRAMME_SURFACES** | `/dashboard`, `/dashboard/mein-programm`, `/dashboard/programm`, `/dashboard/teams/[teamId]/programm` — canonical programme adapter + card only |
| **ACTIVE_L1_DOMAIN** | Selected desktop L1: **icon + label** → `--sce-primary`; inactive remain neutral; one strong active domain max |
| **NAVBAR_CONTENT** | Identity · L1 navigation · global utilities · season (Row 2) — **not** contextual workflow CTAs |
| **NAVBAR_QUICK_ACTIONS** | Removed/blocked — `SceGlobalUtilities` no longer mounts `AdminPageActions`; legacy component returns null |

## 01J-R5.3.1 — Canonical navigation selected state (L1 + L2 + L3)

| Decision | Value |
|----------|--------|
| **CANONICAL_NAV_SELECTED_STATE** | Route-selected navigation item at **L1, L2, and L3**: icon (when present) + label → **`var(--sce-primary)`** — same token as R5.3 L1; restrained selected background/border may remain |
| **HIERARCHICAL_ACTIVE_PATH** | L1 + L2 + L3 may all show selected semantics together (e.g. Club → Organisation → Teams on `/dashboard/teams`) |
| **ONE_L1_MAX** | Unchanged — at most one L1 domain strongly active; hierarchical path does not suppress L2/L3 selected state |
| **OPEN_VS_SELECTED** | Panel-open / L2 column browse (`--selected`) ≠ route selected (`--active`); hover and focus ≠ selected |
| **IMPLEMENTATION** | `global-app-navigation.css` + `SceDomainNavigationPanel` / `SceNavigationItem` — no Organisation-specific or route-specific hacks |

## 01J-R5.2 — Canonical desktop L1 order (order-only)

| Decision | Value |
|----------|--------|
| **CANONICAL_DESKTOP_L1_ORDER** | Club · Planung · Publizieren · Kommunikation · Admin |
| **CANONICAL_SOURCE** | `NAVIGATION_DOMAIN_DEFINITIONS` `sortOrder` in `lib/nav/app-navigation-domains.ts` (+ `CLUB_L1_DOMAIN_ORDER` for club workspace taxonomy) |
| **SCOPE** | Presentation order only — no domain ownership, route, permission, or domain-panel architecture changes |
| **TENANT_IDENTITY** | FC Allschwil crest + name remain separate from L1 domains (not an L1 tab) |
| **DASHBOARD_L1** | **NONE** on desktop Row 1 (home via tenant + platform identity links) |

## 01J-R5 — Contextual Erstellen + Dashboard Schnellzugriff cleanup

| Decision | Value |
|----------|--------|
| **DASHBOARD_QUICK_ACCESS_ROLE** | Fast navigation to frequent **workspace** destinations — not a second creation toolbar |
| **RETAINED_NAVIGATION_SHORTCUTS** | Wochenplaner (`/dashboard/planner/week`), Trainings, Spiele, Vereinsprogramm, Turniere (+ other authorized nav leaves from `buildQuickAccessCatalog`) |
| **REMOVED_DUPLICATE_SHORTCUTS** | Parent **Planung** nav row (same landing as Wochenplaner); all `action.create-*` Schnellzugriff pins |
| **PLANNING_SHORTCUT_DECISION** | **Remove Planung parent** — catalog registers **children only** when a nav item has children; Wochenplaner remains the concrete planning workspace entry |
| **DASHBOARD_CREATE_ENTRY** | Canonical `SceActivityCreateMenu` in `PersonalQuickAccess` via `createMenu` slot (`presentation="dashboard-strip"`) |
| **CANONICAL_COMPOSER_USED** | **YES** — overlay composers from `buildSceActivityCreateMenuProps`; `/new` fallbacks unchanged |
| **DASHBOARD_CREATION_ORIGIN** | `hostOriginContext={{ kind: "DASHBOARD", pathname: "/dashboard" }}` — no fabricated team/activity context |
| **PERMISSION_BEHAVIOR** | `resolveSceActivityCreatePermissionsFromFlags` — menu hidden when no permitted activity types |
| **SUCCESS_REFRESH_BEHAVIOR** | Composer `successBehavior="stay"` + `router.refresh()` in create forms; no manual programme row injection |
| **CUSTOMIZATION_BEHAVIOR** | `QuickAccessCustomizer` / preference API unchanged — catalog and pins are **navigation-only**; stale create keys stripped on read |
| **LEGACY_CREATE_LINKS_REMOVED** | Schnellzugriff links to `/dashboard/events/*/new` and legacy quick-action create pills |
| **RESPONSIVE_BEHAVIOR** | `flex-wrap` nav strip + compact create pill; no horizontal page scroll dependency |
| **NEW_CREATE_SYSTEM_INTRODUCED** | **NO** — no `DashboardActivityCreateMenu` / parallel modals |
