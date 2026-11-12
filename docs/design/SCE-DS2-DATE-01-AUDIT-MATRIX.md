# SCE-DS2-DATE-01 / DATE-01R1 — Application-wide date tile audit matrix

Canonical component: `components/design-system/date/SceDateTile.tsx`  
Formatter: `lib/design-system/sce-date-tile.ts` (`formatSceDateTileParts`)

Visual contract: uppercase weekday · numeric day · uppercase month (`DI / 17 / NOV`), DS2 bordered surface tile, **date-only in tile** (time lives in the context zone).

**Classification legend**

| Class | Meaning |
| --- | --- |
| **A** | Migrated to canonical `SceDateTile` |
| **B** | Genuine format exception — tile would reduce scanability |
| **C** | Date is secondary metadata (inline is correct) |
| **D** | Requires migration (tracked; not yet in product) |
| **E** | Technically blocked |

| Route / feature | Component | File | Prior format | Semantics | Date prominent? | Class | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard Mein Programm (canonical) | `PersonalProgrammeCanonicalAgendaRow` | `components/ui/dashboard/PersonalProgrammeCanonicalAgendaRow.tsx` | Programme tile | Timestamp | Yes | **A** | External `SceDateTile`; programme-personal card omits inline date column |
| Dashboard legacy programme | `PersonalProgrammeAgendaRow` | `components/ui/dashboard/PersonalProgrammeAgendaRow.tsx` | Meta rail type+time | Timestamp | Partial | **B** | Non-canonical agenda rows still use compact type+time rail until legacy presentation backfill; a 4.75rem tile would displace the only remaining schedule cue in a single-line row |
| Mein Programm workspace | Canonical agenda row | `app/(admin)/…/mein-programm` | Same | Timestamp | Yes | **A** | Shared row component |
| Personal Kalender month grid | Calendar day cells | `components/ui/calendar/*` | Day numeral in cell | Date-only | N/A | **B** | Calendar cells are day slots, not event identity tiles; tile chrome would break grid density and duplicate the cell numeral |
| Dashboard Heute im Verein | `DashboardCompactScheduleList` | `components/ui/dashboard/DashboardCompactScheduleList.tsx` | Time column only | Timestamp | No | **C** | “Today” scope makes the calendar day implicit; rows are time-sorted within the day |
| Training management list | `TrainingSessionManagementRow` | `components/admin/training/TrainingSessionManagementRow.tsx` | `DD.MM` text | Date-only | Yes | **A** | Dedicated date column; mobile duplicate keeps inline summary (**B** at `max-md` only — single column, no room for tile + identity) |
| Training Woche/day planner | `TrainingSessionRow` | `components/admin/training/TrainingSessionRow.tsx` | Short text | Date-only | Secondary | **C** | Week/day planner is time-primary; date label is contextual |
| Training series management | `TrainingSeriesManagementRow` | `components/admin/training/TrainingSeriesManagementRow.tsx` | Rhythm text | Recurrence | No | **C** | Recurrence pattern, not a single fixture date |
| Matchcenter Spielplanung | `SpieleManagementMatchRow` | `components/admin/matchcenter/SpieleManagementMatchRow.tsx` | Reference meta date line | Timestamp | Yes | **A** | `SceMatchFixtureReferenceLayout` meta column → `SceDateTile` (kickoff remains in score center) |
| Matchcenter Resultate management | `SpieleManagementResultRow` | `components/admin/matchcenter/SpieleManagementResultRow.tsx` | Programme fixture card | Timestamp | Yes | **A** | Same reference-layout migration |
| Team upcoming matches | `SceMatchCard` programme-fixture | `components/sporting-activity/SceMatchCard.tsx` | Reference meta date line | Timestamp | Yes | **A** | Shared `SceMatchFixtureReferenceLayout` |
| Matchcenter Resultate compact list | `MatchcenterResultRow` | `components/admin/matchcenter/MatchcenterResultRow.tsx` | Footer `weekday, DD.MM` | Timestamp | No | **B** | Score-led three-column grid; date is footer metadata under centered score — tile would compete with the primary score column and break horizontal balance |
| Turniere management | `TurniereManagementRow` | `components/admin/tournamentcenter/TurniereManagementRow.tsx` | Inline duplicate | Timestamp | Yes | **A** | Decorative tile + context zone schedule text |
| Turniercenter operational | `TournamentOperationalRow` | `components/admin/tournamentcenter/TournamentOperationalRow.tsx` | Inline tile + time below | Timestamp | Yes | **A** | DS-10 R2: time removed from tile |
| Veranstaltungen management | `VeranstaltungListRow` | `components/admin/veranstaltungen/VeranstaltungListRow.tsx` | Inline duplicate | Timestamp | Yes | **A** | Decorative tile + context zone |
| Club-event card compact | `SceClubEventCard` | `components/sporting-activity/SceClubEventCard.tsx` | Inline `dateToken` | Timestamp | Secondary | **C** | Compact card schedule line inside card body |
| SITZUNG programme cards | `SceMeetingCard` + shell | `components/sporting-activity/SceMeetingCard.tsx` | Programme shell | Timestamp | Yes | **A** | External `SceDateTile` via programme shell |
| Training/Match/Tournament programme cards | `Sce*Card` list-row | `components/sporting-activity/Sce*Card.tsx` | Shell tile / reference | Timestamp | Via shell | **A** | Programme-personal omits redundant inline date column |
| Vereinsleitung meetings overview | `VereinsleitungMeetingsList` | `components/admin/vereinsleitung/VereinsleitungMeetingsList.tsx` | Icon + sentence date | Timestamp | Yes | **A** | DATE-01R1: left `SceDateTile`; time/duration/location inline; status column preserved |
| Club development meeting teasers | `ClubDevelopmentOverview` | `components/admin/club-development/ClubDevelopmentOverview.tsx` | Inline short date | Timestamp | No | **C** | Title-led teaser rows in KPI overview; full date would dominate 2-line links |
| Meeting detail workspace | `MeetingWorkspace*` | `components/admin/meetings/workspace/*` | Header metadata | Timestamp | Partial | **C** | PR #964 scope — not overview cards; title + status primary |
| Aufgaben management table | `AufgabenTaskList` | `components/admin/aufgaben/AufgabenTaskList.tsx` | Due column text | Due timestamp | No | **C** | Tabular management grid; due date is one column among assignee/status/actions |
| Aufgaben subtask rows | `SubtaskRow` | same | Inline due badge | Due | No | **C** | Nested hierarchy row; due is tertiary under parent title |
| Initiative / target overview cards | Various Vereinsleitung cards | `components/admin/vereinsleitung/*` | Status badges | N/A | No | **C** | Status/owner-led; no schedule-primary layout |
| Finance invoice tables | `NativeBillingInvoicesTable` etc. | `components/admin/billing/*` | Tabular `Fällig am` | Date-only | No | **B** | Dense accounting tables need column alignment and numeric date strings for reconciliation scan — tile per row would break table rhythm and sort affordances |
| Finance KPI strips / timelines | Billing operations panels | `components/admin/billing/*` | Inline timestamps | Mixed | No | **C** | Audit trail timestamps, not fixture identity |
| Activity datetime inputs | `SceActivityDateTimeInput` | `components/sce/activity-datetime/*` | Form controls | Input | N/A | **B** | Editable control, not read-only identity |
| Infoboard clocks | `LiveClockScreen1` | `components/infoboard/*` | Live clock | Live clock | N/A | **E** | Kiosk runtime outside DS2 admin card family |

## DATE-01R1 migration summary

- **New in R1:** Vereinsleitung meetings overview cards; match programme-fixture reference meta column (`SceMatchFixtureReferenceLayout`) unified on `SceDateTile`.
- **Prior DATE-01:** Programme surfaces, Veranstaltungen/Turniere/training management rows, `EventDomainMetaRail`, tournament date helper on `formatSceDateTileParts`.
- **Documented exceptions:** Legacy `PersonalProgrammeAgendaRow`, calendar month cells, matchcenter compact Resultate rows, finance tables, form inputs, infoboard.

## Timezone / locale

- Formatter uses `TenantFormatConfig` (`locale`, `timezone`).
- `dateOnly` values use UTC noon anchor — no accidental previous-day shift.
- Uppercase short tokens via `normalizeShortToken` (locale-driven).

## Dependent PR #964

- Branch `cursor/sce-mtg-ux-01-meeting-workspace-cc07` contains all DATE-01 commits plus meeting **workspace** work.
- After #963 merges, #964 needs dependency reconciliation (rebase or merge STAGE) — do not auto-merge branches.
- Shared surface: meetings domain files (`VereinsleitungMeetingDetail.tsx`, workspace components) overlap in path only; overview list migration is isolated to `VereinsleitungMeetingsList.tsx` in this package.
