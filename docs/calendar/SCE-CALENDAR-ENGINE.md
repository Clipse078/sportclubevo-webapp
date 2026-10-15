# SCE Calendar Engine (canonical)

**Owner:** SCE Design System / Programme & Calendar (01I)  
**Shell:** `components/ui/calendar/SceCalendarEngine.tsx`  
**Grid primitive:** `components/ui/calendar/MonthActivityGrid.tsx`  
**MICRO renderer:** `components/programme/ProgrammeCalendarMicroEntry.tsx`  
**Item contract:** `lib/calendar/sce-calendar-engine/item-contract.ts`

## Product rule

New month-calendar surfaces **must** consume the canonical SCE Calendar Engine unless an explicit architecture decision documents why they cannot.

There must **not** be parallel calendar shells (separate header/grid/tile languages) for Team Programme, Personal Kalender, or future Club/Person scopes.

## CANONICAL SCE CALENDAR SYSTEM (R6.1)

| Layer | Owner |
|-------|--------|
| Calendar shell | `SceCalendarEngine` |
| Month grid | `MonthActivityGrid` (`cellVariant="programme"`) |
| MICRO renderer | `ProgrammeCalendarMicroEntry` (single renderer — no per-domain tile components) |
| Semantic adapters | `resolveProgrammeCalendarMicroSemantics`, `resolvePersonalCalendarMicroSemantics` |
| Day builders | `buildProgrammeCalendarDayPresentation`, `buildPersonalCalendarDayPresentation` |

### MICRO semantic slots

| Slot | Field | Notes |
|------|--------|--------|
| TYPE | `typeLabel` | TRAINING · SPIEL · TURNIER · … |
| TIME | `timeLabel` | Clock icon (decorative when text follows) |
| VISUAL IDENTITY | `visualIdentity` | `ClubCrest` when domain supplies `ClubIdentity` |
| IDENTITY | `identityLabel` | One owner — opponent / team / title |
| LOCATION | `locationLabel` | MapPin icon; **location-only** at MICRO density |
| STATUS | row styling | Cancelled / postponed via chip classes |

### Activity visual rules (MICRO)

| Kind | Identity | Crest |
|------|----------|--------|
| TRAINING | Team name | Tenant / owning club (`SceTrainingPresentationModel.tenantClub`) |
| MATCH (team scope) | Opponent | Opponent `ClubIdentity` |
| TOURNAMENT | Tournament title | Organiser crest — title is not replaced by organiser name |
| CLUB EVENT | Event title | No automatic crest |
| TASK | Task title | No sporting crest; no Clock/MapPin without real time/location |

Location hierarchy for MICRO uses `formatSceActivityLocationHierarchy` with `{ includeHostClub: false }` so host/opponent/organiser are not repeated on the location line when identity/crest already owns them.

## Architecture

```
Scope adapter (ProgrammeItem[], NormalizedCalendarItem[], …)
        ↓
Day builder (group by tenant-local day key, build SceCalendarMicroEntry[])
        ↓
SceCalendarEngine → MonthActivityGrid (cellVariant="programme")
        ↓
ProgrammeCalendarMicroEntry tiles + scope toolbar + scope legend entries
```

- **Presentation only** — no generic activity database tables or cross-domain POST APIs.
- **Filters belong to the consumer** (e.g. Personal `Alle | Termine | Aufgaben` via `toolbar` prop).
- **Legend is scope-aware** — pass `legendEntries`; default sporting legend when omitted.
- **Timezone** — all day keys via tenant `Europe/Zurich` (or tenant config); never implicit browser TZ.

## Calendar consumer matrix (R6.1)

| Surface | Route | Engine | Canonical MICRO | R6.1 status | Follow-up |
|---------|-------|--------|-----------------|-------------|-----------|
| Team Programme | `/dashboard/teams/[teamId]/programm?ansicht=kalender` | `SceCalendarEngine` | `ProgrammeCalendarMicroEntry` | Migrated | — |
| Club Programme | `/dashboard/programm?ansicht=kalender` (club scope) | `SceCalendarEngine` | `ProgrammeCalendarMicroEntry` | Migrated (shared programme path) | — |
| Personal Calendar | `/dashboard/kalender?monat=YYYY-MM` | `SceCalendarEngine` | `ProgrammeCalendarMicroEntry` | Migrated | — |
| Dashboard cockpit preview | Dashboard programme preview | `PersonalProgrammeMonthCalendar` | Legacy compact markers | Audit | Align shell + MICRO when product approves |
| Matchcenter | Match management month grid | `MonthActivityGrid` (`matchcenter` variant) | Dots / non-MICRO cells | Legacy | MICRO adoption TBD |
| Planning Hub | Planning calendar views | Custom cluster blocks | Legacy | Legacy | Adapter + engine adoption |

## Deferred consumers (audit)

| Surface | Implementation | Follow-up |
|---------|----------------|-----------|
| Matchcenter month calendar | `MonthActivityGrid` matchcenter variant | Align cell variant to programme micro tiles when product approves |
| Planning Hub calendar | Separate liste/calendar | Adapter + engine adoption |
| Dashboard cockpit preview | `PersonalProgrammeMonthCalendar` | Optional alignment to engine shell |
