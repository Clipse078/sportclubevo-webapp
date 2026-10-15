# SCE-ACTIVITY-CREATE-01I — Programme & Calendar Engine (Team + Club + Person foundation)

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-ACTIVITY-CREATE-01I` |
| **Programme** | [`SCE-ACTIVITY-CREATE-01`](./SCE-ACTIVITY-CREATE-01.md) |
| **Status** | **CLOSED / ACCEPTED / MERGED** |
| **Branch** | `cursor/sce-activity-create-01i-programme-calendar-engine` |
| **PR** | **#846** → `STAGE` |
| **Final feature HEAD** | `3edc05e13f97cf0215155bfc78118b7e768778d8` (R6.5 identity/crest closure) |
| **Depends on** | **01H CLOSED** (world-class SCE activity card family + planning surfaces) |
| **PO UAT** | **PASS** — R6.5 + full **01I** (PO-owned; no Cursor manual UAT) |
| **Next** | **Navbar Upgrade** → **01J** Dashboard + Mein Programm |

## Objective

One shared, scope-aware **Programme Engine** powers Team Programme, Club Programme, and Personal Calendar population. Domain models and domain APIs remain authoritative — **no** generic Activity entity, **no** `POST /api/activity`, **no** materialized Programme table, **no** parallel Team/Club/Person programme engines.

## Final architecture

```text
queryProgramme(ProgrammeQueryInput)
  → loadProgrammeSourceItems(scope)
      TRAINING | MATCH | TOURNAMENT | CLUB_EVENT (domain reads)
  → applyProgrammeFilters (club multi-select)
  → sortProgrammeItems
  → ProgrammeItem[]
       ├─ ProgrammeListeView   → ProgrammeSceActivityCard → Sce*Card (list-row)
       └─ ProgrammeCalendarView → SceCalendarEngine → MonthActivityGrid
            └─ ProgrammeCalendarMicroEntry (canonical MICRO semantics)
```

### Scope model

| Scope | Status | Relevance (separate from permission) |
|-------|--------|--------------------------------------|
| **TEAM** | **Implemented** | Canonical team / team-season / activity participation; Club Event audience (exact OrgUnit — **no descendant expansion**) |
| **CLUB** | **Implemented** | Tenant-wide aggregation + URL filters (`teams`, `org`, `typ`, `zeitraum`) |
| **PERSON** | **Foundation implemented (R6.4+)** | Participating team IDs for Match (incl. SFV `Event.teamSeasonId = null`); tournament participation; Club Event audience via pre-resolved memberships; trainings via personal projection gates |

**Relevance vs permission:** Programme loaders apply domain relevance rules first; personal projection gates (`canIncludeEventInPersonalProjection`, `canIncludeTrainingSessionInPersonalProjection`) enforce authorization — queries do not bypass domain authorization.

### ProgrammeItem contract

Each item: activity kind, domain id, `SceActivityPresentationModel`, schedule, team/org context, status, `navigationTarget`, stable `id` (`KIND:domainId`).

### Date range

Default upcoming: tenant-local today → +90 days (`PROGRAMME_DEFAULT_FORWARD_DAYS`). Past: 30 days. Explicit `from`/`to` supported for **01J**.

## Routes & URL contracts (preserved)

| Surface | Route |
|---------|-------|
| Team Programme | `/dashboard/teams/[teamId]/programm` |
| Club Programme | `/dashboard/programm` |
| Personal Calendar | `/dashboard/kalender` (canonical month workspace) |

URL state: `ansicht=liste|kalender`, `zeitraum=kommend|vergangen|bereich`, `teams`, `org`, `typ`, `monat` (calendar). **Not redesigned at closure.**

View switcher: Liste \| Kalender via link-based tablist (`ProgrammeViewSwitcher`).

## One world-class SCE activity card family (Liste)

**Terminology:** ONE WORLD-CLASS SCE ACTIVITY CARD FAMILY — activity-specific information, purpose-built compositions, consistent SCE visual language. **Not** a parallel “Programme card family.”

| Kind | Card | Programme list-row notes |
|------|------|---------------------------|
| **TRAINING** | `SceTrainingCard` | Time, location/resource, dressing room when allocated |
| **MATCH** | `SceMatchCard` | `listRowPresentation="programme-fixture"` — competition + HOME \| VS/result \| AWAY + crests + location |
| **TOURNAMENT** | `SceTournamentCard` | Title, organiser, team context, time/location |
| **CLUB_EVENT** | `SceClubEventCard` | Event identity, time/location/context |

Adapter: `components/programme/ProgrammeSceActivityCard.tsx` — **no** duplicate card implementations.

## Canonical calendar engine & MICRO contract

| Layer | Module |
|-------|--------|
| Engine shell | `SceCalendarEngine` → `MonthActivityGrid` |
| Programme → grid | `buildProgrammeCalendarDayGroups` / `buildProgrammeCalendarMicroEntry` |
| MICRO semantics | `lib/calendar/sce-calendar-engine/calendar-micro-semantics.ts` (+ match identity, visual identity, time label) |
| Cell renderer | `ProgrammeCalendarMicroEntry` |

**MICRO visual order:** TYPE → VISUAL IDENTITY + IDENTITY → TIME → LOCATION

| Kind | Identity contract |
|------|-------------------|
| **TRAINING** | Tenant crest + team identity |
| **MATCH** | Opponent crest + opponent identity (scope-safe resolution) |
| **TOURNAMENT** | Organiser crest + tournament title |
| **CLUB_EVENT** | Tenant crest + event title |
| **TASK** | Task identity — no fake club crest |

**Time (R6.3):** Authoritative start+end → range; start only → start time; all-day → Ganztägig; task deadline → Fällig; **never** fabricate Match end time from operational assumptions.

**Location:** Single owner; no opponent duplication; preserve authoritative provider strings and suffixes (e.g. `- wird vor Ort zugeteilt`).

**Personal population (R6.4):** PERSON scope via `queryProgramme`; personal calendar consumes canonical programme items + MICRO builders (R6.5 opponent/tenant crest fixes accepted by PO).

## Match relevance correction (R1)

Canonical participating team semantics for TEAM and PERSON scopes; SFV matches with null `teamSeasonId` resolved via participating team IDs — covered in `match-team-relevance.ts`, `person-match-relevance.ts`, and automated tests.

## Delivered slices (summary)

| Slice | Outcome |
|-------|---------|
| **01I-1** | Programme Engine + `queryProgramme` |
| **01I-2** | Team Programme Liste \| Kalender |
| **01I-3** | Club Programme Liste \| Kalender + filters |
| **R1** | Match team relevance correction |
| **R2** | Populated calendar + Match MICRO direction |
| **R3** | World-class SCE activity-card/list presentation on Programme Liste |
| **R4–R5** | Calendar consistency + shared engine adoption |
| **R6** | Canonical Match/Tournament MICRO identity |
| **R6.1** | Shared operational MICRO language |
| **R6.2** | Identity-first hierarchy + organiser crest |
| **R6.3** | Authoritative time ranges |
| **R6.4** | PERSON Programme population |
| **R6.5** | Personal Match opponent crest + Club Event tenant crest — **PO UAT PASS** |

## Accessibility & responsive

- Programme view switcher: `role="tablist"` / `role="tab"` / `aria-selected`
- Calendar MICRO: accessible time phrases + match opponent phrasing where distinct from visible identity
- Month grid: shared `MonthActivityGrid` responsive shell (Programme + Personal Kalender)

## Known deferred legacy consumers (document only — not 01I blockers)

| Consumer | Notes |
|----------|-------|
| **Dashboard cockpit preview** | `PersonalProgrammeMonthCalendar` — legacy personal-agenda path; not migrated in 01I |
| **Matchcenter calendar** | `SpieleManagementMonthCalendar` — direct `MonthActivityGrid`, not `SceCalendarEngine` programme pipeline |
| **Planning Hub calendar** | Planner grid blocks — 01H canonical cards; separate calendar UX |
| **Legacy importable personal-agenda adapters** | `lib/personal-agenda/personal-calendar-micro-presentation.ts` and related — coexist for non-programme surfaces |

**Closure blocker:** **NO** — accepted 01I surfaces are canonical.

## Migrations / schema

| Field | Value |
|-------|-------|
| **Closure migration** | **NONE** |
| **SCHEMA_DRIFT** | **NO** |
| **PERSISTENT_TEST_DATA** | **0** |
| **PROD_TOUCHED** | **NO** |

## Automated validation (closure)

| Metric | Value |
|--------|-------|
| **Test files (01I suite)** | **14** |
| **Tests** | **111 passed** |
| **Build** | `npm run build` — **PASS** |
| **Prisma** | `prisma validate` — **PASS**; `migrate status` — up to date |

Key paths:

- `lib/programme-engine/__tests__/sce-activity-create-01i-*.test.*`
- `lib/programme-engine/__tests__/programme-view-contract.test.ts`
- `lib/calendar/sce-calendar-engine/__tests__/sce-activity-create-01i-calendar-micro-*.test.*`
- `components/infoboard/screen1/__tests__/screen1-visual-01i.test.tsx`

## Design system & toggle compliance (closure)

| Check | Result |
|-------|--------|
| **SCE_DESIGN_SYSTEM_COMPLIANCE** | **PASS** |
| **CANONICAL_PROGRAMME_ENGINE** | **PASS** |
| **TEAM / CLUB / PERSON programme scope** | **PASS** |
| **CANONICAL_ACTIVITY_CARD_FAMILY** | **PASS** |
| **WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE** | **PASS** |
| **CANONICAL_CALENDAR_ENGINE / MICRO_RENDERER** | **PASS** |
| **MICRO_VISUAL_ORDER + identity contracts** | **PASS** |
| **TIME_RANGE / LOCATION_SINGLE_OWNERSHIP** | **PASS** |
| **PARALLEL_PROGRAMME / CALENDAR / CARD patterns** | **NO** |
| **BINARY_CONTROL_COMPLIANCE** | **PASS** — **NEW_BINARY_CHECKBOXES = 0**; Team/OrgUnit multi-select via `SceChipMultiSelectorField` (legitimate multi-selection) |

## Definition of done — 01I

- [x] Single `queryProgramme` entry for TEAM, CLUB, PERSON
- [x] Team + Club Programme Liste \| Kalender on canonical cards + calendar engine
- [x] Personal Calendar population foundation (PERSON scope + R6.5 crest semantics)
- [x] Match relevance correction + Club Event exact OrgUnit audience
- [x] No generic Activity entity / materialized Programme table / parallel engines
- [x] PO UAT PASS (R6.5 + 01I)
- [x] Automated suite + build + schema validation PASS
- [x] Merged to **STAGE** via PR **#846**

## Follow-up roadmap

1. **Navbar Upgrade** (next package — do not start in 01I closure)
2. **SCE-ACTIVITY-CREATE-01J** — Dashboard + Mein Programm
3. **SCE-TOURNAMENT-PLANNER-01** / **01K–01N** per [`SCE-UI-ROLLOUT-01`](./SCE-UI-ROLLOUT-01.md) — legacy consumer rollout, communication, a11y hardening, integrity UAT
