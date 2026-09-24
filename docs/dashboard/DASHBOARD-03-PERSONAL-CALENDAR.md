# DASHBOARD-03 — Mein Kalender (Personal Programme Month Calendar)

Status: **Implemented** on branch `cursor/dashboard-d-personal-workspace-discovery`.

## Purpose

Compact personal programme navigator answering:

- **On which days is something happening for me?** (activity dots on tenant-local days)
- **What is happening on the selected day?** (selected-day list from the same dataset)

Not a second agenda backend, club calendar, or scheduling product.

## Programme data source (single dataset)

| Layer | Contract |
|-------|----------|
| Loader | `loadPersonalProgramme()` with explicit month-grid `from` / `to` |
| DTO | `PersonalProgrammeItem[]` (same as Mein Programm) |
| Day keys | `personalProgrammeDayKey()` / `groupPersonalProgrammeItemsByDay()` |
| Forbidden | Independent `Event.findMany`, match/meeting services, or team resolvers in UI |

Full-page `/dashboard/kalender` loads programme via `loadPersonalProgramme()` for `termine` / `alle`. Tasks (DASHBOARD-05 boundary) load via `loadTaskDeadlineProjections()` only when `aufgaben` / `alle`.

## Month range

| Utility | Role |
|---------|------|
| `resolvePersonalProgrammeMonthGridRange()` | `lib/calendar/month-grid.ts` |
| Month param | `resolveMatchcenterMonthWindow()` (`lib/matchcenter/month-range.ts`) |
| Visible grid | Mon–Sun weeks covering leading/trailing cells (`buildMonthGridDates`) |
| Programme query | Inclusive UTC window from first/last grid day keys via `getDayWindow()` |

Default 14-day programme range is **not** used for month rendering.

## Shared month grid

| Piece | Status |
|-------|--------|
| `MonthActivityGrid` | **NEW** — `components/ui/calendar/MonthActivityGrid.tsx` |
| `SpieleManagementMonthCalendar` | **REFACTORED** — delegates to `MonthActivityGrid` (matchcenter cell variant) |
| `PersonalKalenderMonthView` | **REFACTORED** — dot calendar + selected day via `PersonalProgrammeMonthCalendar` |
| `PersonalProgrammeMonthCalendar` | **NEW** — reusable dashboard calendar product component |

Matchcenter behavior preserved: link-based month nav, match dots, today pill styling, `data-testid` prefixes on day cells.

## Activity indicators

- 0 items → no dot
- 1 item → single restrained dot
- 2+ items → up to 3 dots (visual cap); **aria-label** includes full count via i18n
- Unauthorized items never enter `items` (zero disclosure at loader)

## Selected day

- Client state: `selectedDayKey` + optional `onSelectedDayChange` for DASHBOARD-06
- List source: grouped programme map (no re-query)
- Sort: `sortPersonalProgrammeItems()`
- Links: canonical `deepLink`
- Empty: `PersonalDashboard.calendar.emptyDay`

## Programme ↔ calendar coordination (DASHBOARD-06)

`PersonalProgrammeMonthCalendar` exposes:

- `selectedDayKey` / `onSelectedDayChange`
- `showSelectedDayPanel` toggle
- Same `PersonalProgrammeItem[]` input as programme column

Parent dashboard may share one server fetch when ranges overlap.

## Tenant timezone

Day identity uses `matchDayKeyInTimezone` / `personalProgrammeDayKey` (Intl en-CA, not `toISOString().slice(0,10)`).

## Accessibility

- Keyboard-focusable month nav and day buttons
- `aria-pressed` on selected day
- Today ring / matchcenter today fill unchanged for Matchcenter
- Activity counts in accessible names

## i18n

Namespace: `PersonalDashboard.calendar` in `messages/{de,en,fr,it}.json`.

## Security

Calendar renders only authorized programme rows returned by `loadPersonalProgramme()`. Dots/counts/list entries cannot appear for filtered-out items.

## Performance

Per month view: one `resolvePersonalContext`, one programme aggregation for bounded grid window, optional task projection query when tasks filter active.

## Mobile / DASHBOARD-06

Component is responsive (touch-friendly cells, stacked selected-day panel). Final dashboard composition and collapsible calendar belong to DASHBOARD-06.

## Matchcenter regression

Shared primitive extraction only; Matchcenter month calendar tests and structural contracts unchanged.
