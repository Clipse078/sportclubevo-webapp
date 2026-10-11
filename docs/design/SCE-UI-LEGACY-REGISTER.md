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
| LEGACY-MATCH-CARD-001 | MATCH-CARD | `MatchCard.tsx` | Matchcenter views | MED | 01D | `ActivityCard/Match` + `MatchClubPair` | Zero imports |
| LEGACY-MATCH-CARD-002 | MATCH-CARD | Inline crest rows in `SpieleManagement*Row.tsx` | Spiele management | MED | 01D | Shared Match STANDARD density | Rows use shared component |
| LEGACY-MATCH-CARD-003 | MATCH-CARD | `InfoboardScreen1.tsx` fallback branch | Kiosk | **HIGH** | 01D+01K | `matchPresentation` required | Loader always sets pair; fallback deleted |
| LEGACY-MATCH-CARD-004 | MATCH-CARD | `InfoboardScreen2.tsx` | Kiosk | **HIGH** | 01D+01K | `MatchClubPair` layout | Same as 003 |
| LEGACY-MATCH-CARD-005 | MATCH-CARD | `WeekplannerMatchIdentityCard.tsx` | Wochenplaner | MED | 01H | 01D planner density | Component wraps canonical |
| LEGACY-ACTIVITY-LOCATION-001 | ACTIVITY | `WochenplanEventCard.tsx` | Wochenplan | MED | 01H | Location density formatter | Uses 01C location API |
| LEGACY-ACTIVITY-TRAIN-001 | ACTIVITY | `TrainingSessionRow.tsx` local meta | Training list | MED | 01E | Training STANDARD card | Row refactored |
| LEGACY-ACTIVITY-TURN-001 | ACTIVITY | `TurniereManagementRow.tsx` partial organiser | Tournament list | MED | 01F | Tournament STANDARD | Organiser always from resolver |
| LEGACY-ACTIVITY-EVENT-001 | ACTIVITY | `VeranstaltungCard.tsx` | Veranstaltungen overview | MED | 01G | Club Event card family | Overview uses 01G |
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
| LEGACY-MATCH-CARD-006 | MATCH-CARD | `TeamUpcomingMatchRow` inline layout | Team cockpit | MED | 01J | 01D COMPACT | Shared component |
| LEGACY-MATCH-CARD-007 | MATCH-CARD | `DashboardTodayEventCards` | Dashboard | MED | 01I | 01D COMPACT | Shared component |
| LEGACY-ACTIVITY-PLAN-001 | ACTIVITY | `PlanningHubActivityBlock` local identity | Planning hub | MED | 01H | 01C presentation embed | Hub uses resolver |
| LEGACY-FORMAT-LOGO-001 | FORMATTER | Inline `<img onError>` outside `ClubCrest` | Various | LOW | 01D | `ClubCrest` | Grep-clean |
| LEGACY-A11Y-TABS-001 | TABS | Missing arrow-key nav on activity tabs | All activity shells | MED | 01M | WAI-ARIA tabs | A11y test pass |

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

1. **LEGACY-MATCH-CARD-003/004** — home/away invariant FAIL on Infoboard fallback.
2. **LEGACY-FORMAT-STATUS-001** — inconsistent cancellation/postponed labelling across modules.
3. **LEGACY-ROUTE-001** — wrong deep link target from notifications if mixed.
4. **LEGACY-TABS-001** — person detail without URL breaks share/back.
5. **LEGACY-MATCH-CARD-002** — drift from ADR-05 if one row edited locally.

---

## Usage

When closing **01N**, every **MUST_MIGRATE** row must be **RESOLVED** (migrated) or **JUSTIFIED** with PO sign-off and ADR update.
