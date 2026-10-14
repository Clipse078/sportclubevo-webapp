# SCE-ACTIVITY-CREATE-01H — Core Planning Surfaces Adoption

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-ACTIVITY-CREATE-01H` |
| **Programme** | [`SCE-ACTIVITY-CREATE-01`](./SCE-ACTIVITY-CREATE-01.md) |
| **Status** | **IN_PROGRESS** — adoption package (not closed) |
| **Depends on** | **01G CLOSED** — global **`+ Erstellen`**, composers, permissions |
| **Boundary** | **01I** owns Programme & Calendar Engine (Team + Club Liste \| Kalender). **01J** owns Dashboard + Mein Programm. **SCE-TOURNAMENT-PLANNER-01** remains **PLANNED / NOT STARTED**. |

## Objective

One SCE activity language on the **core planning/management surfaces**:

- Wochenplaner / Planning Hub
- Trainings management
- Matchcenter
- Tournamentcenter
- Veranstaltungen (Club Events)

Surfaces **consume** the canonical presentation stack delivered in **01A–01G** — they do not introduce parallel activity models, card families, or create flows.

## Canonical presentation path

```text
domain DTO / management row / weekplanner item
  → resolveSce*Presentation* (adapters under lib/sporting-activity-presentation/canonical/)
  → SceActivityPresentationModel
  → World Activity Card family (HERO | STANDARD | COMPACT | MICRO) or ActivityTypePill at planner MICRO density
  → surface-specific layout chrome (management grid, planner block, board card)
```

Shared modules reused in 01H:

| Layer | Module |
|-------|--------|
| Presentation model | `SceActivityPresentationModel`, domain adapters |
| Cards | `SceTrainingCard`, `SceMatchCard`, `SceTournamentCard`, `SceClubEventCard` |
| Planner type language | `lib/planning-hub/planner-sporting-activity-type-label.ts` |
| Create | `SceActivityCreateMenu` / **`+ Erstellen`** (01G) |
| Context detail | `SceContextTabs` on activity record routes (unchanged) |

## Density rules

| Surface | Density | Notes |
|---------|---------|-------|
| Matchcenter / Tournamentcenter / Veranstaltungen list rows | **COMPACT** card in identity column | Status/context columns remain domain-specific |
| Training series list | **COMPACT** | Already adopted pre-01H |
| Training session list row | **COMPACT** | **01H** — `TrainingSessionManagementRow` |
| Wochenplaner editor identity cards | **COMPACT** / **MICRO** | Match / Training / Tournament identity cards |
| Planning hub grid blocks | **MICRO-equivalent** inline block + **ActivityTypePill** | Not full STANDARD cards — preserves planner usability |
| Legacy Wochenplan board (`WochenplanEventCard`) | Category shell + **ActivityTypePill** | Board drag/drop semantics preserved |

## Surface adoption summary

### Wochenplaner / Planning Hub

| Area | 01H outcome |
|------|-------------|
| Activity blocks | Shared planner type labels via `resolvePlannerSportingActivityTypePresentation`; **ActivityTypePill** + semantic accents |
| Identity cards in editor | **CANONICAL** — `Weekplanner*IdentityCard` → `Sce*Card` |
| Resource / DnD / conflicts | **Unchanged** — planner tool semantics preserved |
| Create | **01G** `SceActivityCreateMenu` on week chrome |

### Trainings management

| Area | 01H outcome |
|------|-------------|
| Series list | **CANONICAL** — `SceTrainingCard` (pre-01H) |
| Session list row component | **01H** — `resolveSceTrainingPresentationFromSessionManagementRow` + `SceTrainingCard` |
| Create | **01G** menu |

### Matchcenter

| Area | 01H outcome |
|------|-------------|
| Spielplanung / Resultate rows | **CANONICAL** — `SceMatchCard` |
| Away authoritative locations | Preserved (e.g. `Sissach - 2` suffix) |
| Residual legacy | `MatchCard.tsx` in **deprecated** `MatchcenterWochenplanBulkPanel` only → **01N** |

### Tournamentcenter

| Area | 01H outcome |
|------|-------------|
| Management rows | **CANONICAL** — `SceTournamentCard` + organiser identity |
| No VS leakage | Tournament ≠ Match fixture grammar |

### Veranstaltungen

| Area | 01H outcome |
|------|-------------|
| List rows | **CANONICAL** — `SceClubEventCard` |
| Audience / recurrence | **Unchanged** — no descendant expansion |
| Legacy `VeranstaltungCard.tsx` | Unused grid module → **01N** removal |

## Remaining legacy (deferred **01N**)

See [`SCE-UI-LEGACY-REGISTER`](../design/SCE-UI-LEGACY-REGISTER.md):

- `MatchCard.tsx` (bulk panel only)
- `VeranstaltungCard.tsx` (zero production imports)
- Full `PlanningHubActivityBlock` → embedded MICRO `Sce*Card` (optional evolution; block layout remains planner-native)
- Dashboard / Mein Programm / Infoboard → **01I–01K**

## Automated validation

- `lib/sce/activity-create/__tests__/sce-activity-create-01h-core-planning-surfaces.test.ts` — cross-surface consistency + guardrails
- Existing suites: Activity Presentation, Context Tabs, 01A–01G, Wochenplaner planning UX, management row tests

## Manual UAT

| Field | Value |
|-------|-------|
| **Owner** | PO |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |

## Roadmap position

| Package | State |
|---------|-------|
| **01G** | **CLOSED** |
| **01H** | **IN_PROGRESS** (this document) |
| **01I** | **NOT STARTED** — Programme Engine |
| **01J** | **NOT STARTED** — Dashboard + Mein Programm |
| **SCE-TOURNAMENT-PLANNER-01** | **PLANNED — NOT STARTED** |
