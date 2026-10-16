# SCE-ACTIVITY-CREATE-01J — Dashboard + Mein Programm (Personal Workspace Adoption)

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-ACTIVITY-CREATE-01J` |
| **Programme** | [`SCE-ACTIVITY-CREATE-01`](./SCE-ACTIVITY-CREATE-01.md) |
| **Depends on** | **01I CLOSED** (Programme Engine + PERSON foundation), **Navbar Upgrade #847 CLOSED** |
| **Status** | **IN PROGRESS — R2 Mein Programm workspace** |
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
| Today widgets | `DashboardTodayEventCards`, `MeineAgendaWidget` | Separate compact formatters — **R3/R5** align or narrow scope |

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
| **R5** | Contextual Erstellen + quick-action cleanup |
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
