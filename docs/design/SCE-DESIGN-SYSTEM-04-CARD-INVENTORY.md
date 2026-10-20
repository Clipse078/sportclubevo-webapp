# SCE Design System — DS-04 Card Migration Inventory

> **Package:** `SCE-DESIGN-SYSTEM-04` · **Gate:** DS-10 requires no unexplained duplicate card families.

## CARD_MIGRATION_INVENTORY

| CURRENT_COMPONENT | DOMAIN / ROUTES | CLASSIFICATION | CANONICAL_TARGET | DS04_ACTION | FUTURE_PACKAGE | STATUS | NOTES |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `SceMatchCard` | Activity / programme | CANONICAL | `SceActivityPresentationModel` | NONE | — | **CANONICAL** | Home left, away right |
| `SceTrainingCard` | Activity / programme | CANONICAL | Training location hierarchy | NONE | — | **CANONICAL** | Not match semantics |
| `SceTournamentCard` | Activity / programme | CANONICAL | Organiser + Hauptteam | NONE | — | **CANONICAL** | Not match semantics |
| `SceClubEventCard` | Club events | CANONICAL | Club event identity | NONE | — | **CANONICAL** | Distinct family member |
| `SceTournamentFixtureCard` | Tournament planner | DOMAIN_SPECIFIC_CANONICAL | Fixture grid | NONE | — | **JUSTIFIED_EXCEPTION** | Operational grid density |
| `CommunicationHubCapabilityLink` | Communication hub | CANONICAL | Capability navigation | ALIGNED | — | **DS04_DONE** | Visual reference |
| `SceFeatureCard` | Communication settings | CANONICAL | Functional capability panel | ALIGNED | — | **DS04_DONE** | |
| `DashboardKpiCard` | Dashboard | CANONICAL | Summary / metric | ALIGNED | — | **DS04_PARTIAL** | `data-sce-card-family` |
| `SceInformationSurface` | Admin / object panels | CANONICAL | Information panel shell | INTRODUCED | — | **DS04_DONE** | Roles admin adoption |
| `InfoboardCompactMatchIdentity` | Infoboard Screen 2 | CANONICAL | `matchPresentation` | INTRODUCED | — | **DS04_DONE** | Home/away grammar |
| Infoboard Screen 1 match UI fallback | Kiosk Screen 1 | DEPRECATE | `matchPresentation` | REMOVED | — | **DS04_DONE** | P0 closed |
| `MatchCard.tsx` | Legacy matchcenter | DUPLICATE | `SceMatchCard` | WRAPPER | DS-10 | DS10_REMAINING | |
| `VeranstaltungCard.tsx` | Legacy events | DUPLICATE | `SceClubEventCard` | DEFER | DS-10 | DS10_REMAINING | |
| `PlanningHubActivityBlock` | Planning hub | MIGRATE_LATER | `PlanningHubListeSceActivityCard` | DEFER | DS-08 | DS10_REMAINING | Calendar density |
| `WochenplanEventCard` | Wochenplaner | DOMAIN_SPECIFIC_CANONICAL | Weekplanner identity cards | EXCEPTION | DS-10 | **JUSTIFIED_EXCEPTION** | Dense MICRO |
| `WaitingListWorkspace` local `MetricCard` | Registrations | DUPLICATE | `DashboardKpiCard` | DEFER | DS-10 | DS10_REMAINING | |

## Information hierarchy (DS-04)

Layers (not all required on every card):

1. **SEMANTIC / CATEGORY** — activity type pill, module label  
2. **PRIMARY IDENTITY** — title, fixture, object name  
3. **PRIMARY INFORMATION** — core fact the card exists to show  
4. **SECONDARY CONTEXT** — organiser, competition, subtype  
5. **METADATA** — time, location, allocation  
6. **STATUS** — lifecycle / readiness shell (full system → DS-07)  
7. **ACTIONS** — canonical button hierarchy (DS-05/06)

## Representative DS-04 adoptions

| Domain | Change |
| --- | --- |
| Communication | Capability cards tagged; reference preserved |
| Activity / Programme | Activity family unchanged — guardrails reinforced |
| Dashboard | `DashboardKpiCard` summary-metric family marker |
| Admin / Roles | `SceInformationSurface` wrapper |
| Operational | Infoboard + Screen 2 canonical `matchPresentation` |
| Infoboard P0 | Legacy Screen 1 fallback removed; mapper synthesis |

## DS-10 obligation

Every row must reach **CANONICAL**, **DS04_DONE**, or **JUSTIFIED_EXCEPTION** before DS-10 closure. Typed inventory source: `lib/design-system/sce-design-system-04-meta.ts`.
