# SCE-DS2-DATE-01 — Application-wide date tile audit matrix

Canonical component: `components/design-system/date/SceDateTile.tsx`  
Formatter: `lib/design-system/sce-date-tile.ts` (`formatSceDateTileParts`)

Visual contract: uppercase weekday · numeric day · uppercase month (`DI / 17 / NOV`), DS2 bordered surface tile, date-only in tile (time in context).

| Route / feature | Component | File | Prior format | Semantics | Date prominent? | Decision | Strategy | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard Mein Programm | `PersonalProgrammeCanonicalAgendaRow` | `components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow.tsx` | `SceProgrammeActivityDateTile` | Timestamp (`startsAt`) | Yes | **Migrated** | `SceProgrammeActivityDateTile` → `SceDateTile` | External tile + programme-personal card omits inline date column |
| Dashboard legacy programme | `PersonalProgrammeAgendaRow` | `components/ui/dashboard/PersonalProgrammeAgendaRow.tsx` | Meta rail type+time | Timestamp | Partial | **Exception** | Canonical path only | Non-canonical rows keep compact meta rail until presentation model backfill |
| Mein Programm workspace | Same as dashboard canonical | `app/(admin)/…/mein-programm` | Same | Timestamp | Yes | **Migrated** | Shared row component | |
| Personal Kalender month | Calendar day cells | `components/ui/calendar/*` | Day grid | Date-only | N/A | **Exception** | — | Calendar cells excluded per DS2 |
| Dashboard Heute im Verein | `DashboardCompactScheduleList` | `components/ui/dashboard/DashboardCompactScheduleList.tsx` | Time column only | Timestamp | No | **Exception** | — | Time-led compact strip, not date-led tile |
| Training management list | `TrainingSessionManagementRow` | `components/admin/training/TrainingSessionManagementRow.tsx` | `DD.MM` text | Date-only `row.date` | Yes | **Migrated** | `SceDateTile` `dateOnly` | Mobile duplicate uses inline summary (dense) |
| Training Woche/day rows | `TrainingSessionRow` | `components/admin/training/TrainingSessionRow.tsx` | Short text | Date-only | Secondary | **Exception** | — | Time-primary planner row; optional date label |
| Training series management | `TrainingSeriesManagementRow` | `components/admin/training/TrainingSeriesManagementRow.tsx` | Rhythm text | Recurrence | No | **Exception** | — | Not date-led |
| Matchcenter Spielplanung | `SpieleManagementMatchRow` | `components/admin/matchcenter/SpieleManagementMatchRow.tsx` | `SceMatchCard` list-row | Timestamp | Partial | **Deferred** | Fixture grid | Match fixture layout; date in horizontal operational column — separate rollout (layout preservation) |
| Turniere management | `TurniereManagementRow` | `components/admin/tournamentcenter/TurniereManagementRow.tsx` | Inline tile duplicate | Timestamp | Yes | **Migrated** | `SceDateTile` decorative | Context zone keeps schedule text |
| Turniercenter operational | `TournamentOperationalRow` | `components/admin/tournamentcenter/TournamentOperationalRow.tsx` | Inline tile + time in block | Timestamp | Yes | **Migrated** | `SceDateTile` compact + time below | DS-10 R2: time removed from tile |
| Veranstaltungen management | `VeranstaltungListRow` | `components/admin/veranstaltungen/VeranstaltungListRow.tsx` | Inline tile duplicate | Timestamp | Yes | **Migrated** | `SceDateTile` decorative | |
| Club-event card compact | `SceClubEventCard` | `components/sporting-activity/SceClubEventCard.tsx` | Inline `dateToken` | Timestamp | Secondary | **Exception** | — | Compact card schedule line, not list-row tile |
| SITZUNG programme cards | `SceMeetingCard` + shell | `components/sporting-activity/SceMeetingCard.tsx` | Programme shell tile | Timestamp | Yes | **Migrated** | External `SceDateTile` via shell | `programme-personal` omits card date column |
| Training/Match/Tournament programme cards | `Sce*Card` list-row | `components/sporting-activity/Sce*Card.tsx` | Horizontal operational date text | Timestamp | Via shell | **Migrated** | Shell `SceDateTile` | Card internal date column omitted in programme-personal |
| Vereinsleitung meetings list | `VereinsleitungMeetingsList` | `components/admin/vereinsleitung/VereinsleitungMeetingsList.tsx` | Icon + sentence date | Timestamp | Secondary | **Exception** | — | Card uses inline metadata; not date-led tile composition |
| Aufgaben / tasks | Task shells | `components/admin/requirements/*` | Due text / badges | Mixed | Varies | **Exception** | — | Due metadata; no date-led tile pattern yet |
| Finance / invoices | Billing cards | `components/admin/billing/*` | Tabular due dates | Date-only | Secondary | **Exception** | — | Dense finance tables excluded |
| Activity datetime inputs | `SceActivityDateTimeInput` | `components/sce/activity-datetime/*` | Form controls | Input | N/A | **Exception** | — | Explicit exclusion |
| Infoboard clocks | `LiveClockScreen1` | `components/infoboard/*` | Clock header | Live clock | N/A | **Exception** | — | Kiosk, out of DS2 webapp cards |

## Migration summary

- **Migrated (this PR):** Programme date tile (all canonical programme surfaces), Veranstaltungen management rows, Turniere management rows, Turniercenter operational rows (tile contract fixed), training session management date column, shared `EventDomainMetaRail` date stack path, tournament date presentation helper unified on `formatSceDateTileParts`.
- **Remaining (documented):** Matchcenter management rows (fixture layout), legacy `PersonalProgrammeAgendaRow`, meetings overview cards, finance/tasks dense surfaces.

## Timezone / locale

- Formatter uses `TenantFormatConfig` (`locale`, `timezone`).
- `dateOnly` values use UTC noon anchor — no accidental previous-day shift.
- Uppercase short tokens via `normalizeShortToken` (locale-driven, not hardcoded German strings).
