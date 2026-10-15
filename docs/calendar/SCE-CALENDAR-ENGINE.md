# SCE Calendar Engine (canonical)

**Owner:** SCE Design System / Programme & Calendar (01I)  
**Shell:** `components/ui/calendar/SceCalendarEngine.tsx`  
**Grid primitive:** `components/ui/calendar/MonthActivityGrid.tsx`  
**Item contract:** `lib/calendar/sce-calendar-engine/item-contract.ts`

## Product rule

New month-calendar surfaces **must** consume the canonical SCE Calendar Engine unless an explicit architecture decision documents why they cannot.

There must **not** be parallel calendar shells (separate header/grid/tile languages) for Team Programme, Personal Kalender, or future Club/Person scopes.

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

## Adopted consumers (01I R4)

| Route / surface | Status |
|-----------------|--------|
| Team Programme `?ansicht=kalender` | Adopted |
| `/dashboard/kalender` | Adopted |

## Deferred consumers (audit)

| Surface | Implementation | Follow-up |
|---------|----------------|-----------|
| Matchcenter month calendar | `MonthActivityGrid` matchcenter variant | Align cell variant to programme micro tiles when product approves |
| Planning Hub calendar | Separate liste/calendar | Adapter + engine adoption |
| Dashboard cockpit preview | `PersonalProgrammeMonthCalendar` | Optional alignment to engine shell |
