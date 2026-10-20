# SCE UI Legacy & Duplication Register

> **Programme:** SCE-UI-ROLLOUT-01+  
> **Maintained from:** SCE-UI-ROLLOUT-01A  
> **Removal gate:** SCE-UI-ROLLOUT-01N (zero unresolved **MUST-MIGRATE**)

| Field | Value |
|-------|-------|
| **TOTAL entries** | 28 |
| **MUST_MIGRATE** | 22 |
| **CAN_RETAIN** | 6 |
| **HIGH_RISK** | 5 |

---

## Legend

| TYPE | Meaning |
|------|---------|
| TABS | Tab/navigation implementation |
| MATCH-CARD | Match presentation |
| ACTIVITY | Non-match activity presentation |
| FORMATTER | Duplicated formatting logic |
| WORKSPACE | Layout/chrome |
| ROUTE | URL construction |

| RISK | Meaning |
|------|---------|
| HIGH | User-visible semantic bug or auth confusion |
| MED | Visual inconsistency |
| LOW | Code duplication only |

---

## Register

| ID | TYPE | FILE | CONSUMERS | RISK | TARGET PKG | TARGET CANONICAL | REMOVAL CONDITION |
|----|------|------|-----------|------|------------|------------------|-------------------|
| LEGACY-TABS-001 | TABS | `PersonDetailTabs.tsx` | Person detail pages | MED | 01L | Context tabs + URL | All person tabs deep-linkable |
| LEGACY-TABS-002 | TABS | `RegistrationDrawerTabShell.tsx` | Registration drawer | LOW | Backlog | Drawer pattern ADR | Product prioritizes |
| LEGACY-TABS-003 | TABS | Inline section nav in legacy forms | Various admin forms | MED | 01L | Context tabs | Form migrated to workspace |
| LEGACY-MATCH-CARD-001 | MATCH-CARD | `MatchCard.tsx` | Matchcenter views | MED | 01H | **`SceMatchCard`** | Zero imports |
| CANONICAL-MATCH-CARD-001 | MATCH-CARD | `SceMatchCard.tsx` | Activity Detail + preview | — | **01D** | 01C model | Representative integration |
| LEGACY-MATCH-CARD-002 | MATCH-CARD | ~~Inline crest rows in `SpieleManagement*Row.tsx`~~ | Spiele management | MED | **01D R4** | **`SceMatchCard` COMPACT `list-row`** | **Retired** — row uses `resolveSceMatchPresentation` |
| LEGACY-MATCH-CARD-003 | MATCH-CARD | ~~`InfoboardScreen1.tsx` fallback branch~~ | Kiosk | **HIGH** | 01D+01K | **CLOSED DS-04** | Fallback deleted; `matchPresentation` only |
| LEGACY-MATCH-CARD-004 | MATCH-CARD | `InfoboardScreen2.tsx` | Kiosk | **HIGH** | 01D+01K | **CLOSED DS-04** | `InfoboardCompactMatchIdentity` + mapper |
| LEGACY-MATCH-CARD-005 | MATCH-CARD | `WeekplannerMatchIdentityCard.tsx` | Wochenplaner | MED | 01H | 01D planner density | Component wraps canonical |
| LEGACY-ACTIVITY-LOCATION-001 | ACTIVITY | `WochenplanEventCard.tsx` category shell | Wochenplan board | MED | 01H / 01N | **ActivityTypePill** type identity (01H); full card migration optional | Board DnD preserved |
| CANONICAL-TRAINING-CARD-001 | ACTIVITY | `SceTrainingCard.tsx` | Activity Detail, Trainings management identity, Wochenplaner editor | — | **01E** | 01C model | Representative integration |
| LEGACY-ACTIVITY-TRAIN-001 | ACTIVITY | `TrainingSessionManagementRow.tsx` (pre-01H local meta) | Training session list | MED | 01H | **`SceTrainingCard` COMPACT** | **01H adopted** — series list unchanged |
| LEGACY-ACTIVITY-PLAN-002 | ACTIVITY | `PlanningHubActivityBlock` training identity strings | Wochenplaner grid | MED | 01H | **`SceTrainingCard` MICRO** | Block uses resolver + card |
| CANONICAL-TOURNAMENT-CARD-001 | ACTIVITY | `SceTournamentCard.tsx` | Activity Detail, Turniere row, Wochenplaner editor | — | **01F** | 01C model | Representative integration |
| LEGACY-ACTIVITY-TURN-001 | ACTIVITY | `TournamentManagementIdentity.tsx` | Legacy tournament forms / residual | MED | 01H | **`SceTournamentCard`** | Zero imports outside deferred surfaces |
| CANONICAL-CLUB-EVENT-CARD-001 | ACTIVITY | `SceClubEventCard.tsx` | Veranstaltungen management list row identity | — | **01G** | 01C model | Representative integration |
| LEGACY-ACTIVITY-EVENT-001 | ACTIVITY | `VeranstaltungCard.tsx` | Veranstaltungen card grid (residual) | MED | 01H | **`SceClubEventCard`** | Not migrated in 01G |
| LEGACY-ACTIVITY-EVENT-003 | ACTIVITY | `VeranstaltungListRow.tsx` inline title/timing formatters | — | — | **01G** | **`SceClubEventCard` list-row** | Identity column migrated |
| LEGACY-ACTIVITY-EVENT-002 | ACTIVITY | `EventListCard.tsx` | Legacy events module | LOW | Backlog | Veranstaltung or remove hub | Module retired |
| LEGACY-FORMAT-DATE-001 | FORMATTER | Ad-hoc date formatting in admin rows | Multiple | LOW | 01C | `time-range.ts` | Grep-clean |
| LEGACY-FORMAT-STATUS-001 | FORMATTER | Parallel status maps matchcenter/tournaments/training | Lists | MED | 01C | Unified status translation table | All lists on 01C |
| LEGACY-FORMAT-FIXTURE-001 | FORMATTER | `builders.ts` fallback fixture strings | Programme | MED | 01C | Match pair or explicit line builder | Fallback only when data missing |
| LEGACY-ROUTE-001 | ROUTE | Dual match URLs (consume vs manage) | Dashboard, notifications | MED | 01C | Navigation policy doc | Call sites use policy helper |
| LEGACY-ROUTE-002 | ROUTE | `getVeranstaltungHref` vs activity detail | Planning hub | LOW | 01C | Unified builder | Consistent consume/manage |
| LEGACY-WORKSPACE-001 | WORKSPACE | Matchcenter list chrome without full surface stack | Spiele management | MED | 01H | SCE-UI-STANDARD-01 layers | 01H adoption |
| LEGACY-WORKSPACE-002 | WORKSPACE | Dashboard module cards | `/dashboard` | MED | 01I | Activity-aware cockpit | 01I |
| LEGACY-WORKSPACE-003 | WORKSPACE | Mixed admin `AdminSurfaceCard` | Various | LOW | 01M | `SceFeatureCard` where appropriate | Incremental |
| LEGACY-COLOR-001 | FORMATTER | Match green in calendar/programme (historical) | Calendar | MED | COLOR-01 / 01C | `activity-color-tokens` | Token migration |
| LEGACY-TABS-004 | TABS | `RolesAdminTabs.tsx` | Admin roles | LOW | 01L | Context/route tab standard | Optional |
| LEGACY-MATCH-CARD-006 | MATCH-CARD | ~~`TeamUpcomingMatchRow` inline layout~~ | Team cockpit | MED | **01D R4** | **`SceMatchCard` STANDARD** | **Retired** |
| LEGACY-MATCH-CARD-008 | MATCH-CARD | ~~`TeamResultRow` / overview summaries local fixture~~ | Team cockpit | MED | **01D R4** | **`SceMatchCard` COMPACT** | **Retired** (Resultate + Übersicht) |
| LEGACY-MATCH-CARD-007 | MATCH-CARD | `DashboardTodayEventCards` | Dashboard | MED | 01I | 01D COMPACT | Shared component |
| LEGACY-ACTIVITY-PLAN-001 | ACTIVITY | `PlanningHubActivityBlock` local identity | Planning hub | MED | 01H | 01C presentation embed | Hub uses resolver |
| LEGACY-FORMAT-LOGO-001 | FORMATTER | Inline `<img onError>` outside `ClubCrest` | Various | LOW | 01D | `ClubCrest` | Grep-clean |
| LEGACY-A11Y-TABS-001 | TABS | ~~Missing arrow-key nav~~ → `SceContextTabs` | All activity shells | MED | **DS-03** | WAI-ARIA tabs | **Resolved DS-03** (not open for DS-09 migration) |

---

## CAN_RETAIN (explicitly not MUST-MIGRATE)

| ID | Reason |
|----|--------|
| NAV-WS-001 | Workspace `?hub=` is a view switcher, not context tabs |
| NAV-WS-002 | Lifecycle `?view=` — same |
| NAV-FILTER-MC-001 | Matchcenter filter rail — filters, not tabs |
| `SceSegmentedControl` in Club Directory | Filter primitive |
| `TeamCockpitNav` | Route-tab entity pattern — align visually, keep URL model until 01L |
| Infoboard kiosk CSS modules | Display channel — adopt presentation model but not full workspace chrome |

---

## HIGH_RISK summary

1. ~~**LEGACY-MATCH-CARD-003/004**~~ — **CLOSED DS-04** (canonical `matchPresentation`).
2. **LEGACY-FORMAT-STATUS-001** — inconsistent cancellation/postponed labelling across modules.
3. **LEGACY-ROUTE-001** — wrong deep link target from notifications if mixed.
4. **LEGACY-TABS-001** — person detail without URL breaks share/back.
5. **LEGACY-MATCH-CARD-002** — drift from ADR-05 if one row edited locally.

---

## Control-level legacy backlog (not in register totals)

Separate from the **28** inventory rows above. Tracks **binary-setting checkboxes** that should migrate to `SwitchToggle` per [`SCE-DESIGN-SYSTEM.md`](./SCE-DESIGN-SYSTEM.md) (**Toggle First**).

| Policy | Detail |
|--------|--------|
| **Scope** | Legacy **settings** checkboxes only — not table row selection, bulk pickers, or third-party primitives |
| **When to migrate** | During the owning SCE-UI-ROLLOUT adoption package or **01N** cleanup |
| **01B closure** | Rule documented + compliance gate; **no** product-wide checkbox replacement in 01B |
| **Counting** | Do **not** add these rows to **TOTAL 28 / MUST_MIGRATE 22** unless a future inventory pass explicitly rebaselines the register |

Known examples (non-exhaustive; expand during domain adoptions):

- Communication composer “review before send” confirmation checkbox (semantic: confirm action — evaluate radio/confirm pattern vs toggle during Comm UX hardening)
- Legacy admin permission read-only switches displayed as non-canonical controls (see People & Access docs)

---

## 01C reconciliation note (2026-10-11)

**SCE-UI-ROLLOUT-01C** introduced `SceActivityPresentationModel` and resolvers only. Visual consumers (Matchcenter rows, Infoboard fallback, Wochenplan local formatters, etc.) are **not** marked migrated in this pass.

| Register totals | Unchanged |
|-----------------|-----------|
| TOTAL | 28 |
| MUST_MIGRATE | 22 |
| CAN_RETAIN | 6 |
| HIGH_RISK | 5 |

Formatter/route legacy rows remain **MUST_MIGRATE** until **01D–01L** adoption and **01N** cleanup.

---

## Usage

When closing **01N**, every **MUST_MIGRATE** row must be **RESOLVED** (migrated) or **JUSTIFIED** with PO sign-off and ADR update.
