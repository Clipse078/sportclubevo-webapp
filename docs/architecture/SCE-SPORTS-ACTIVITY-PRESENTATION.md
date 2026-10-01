# SCE Canonical Sports Activity Presentation

**Package:** SCE-ACTIVITY-UX-01 / SCE-ACTIVITY-UX-01R1 / SCE-ACTIVITY-UX-01R2  
**Status:** Canonical presentation + compact visible contract (Dashboard programme, calendar foundation, training/match/tournament management semantics)

## Purpose

SportClubEvo surfaces training, matches, and tournaments through several modules. This document defines one **presentation read-model contract** so consumers share the same semantics for identity, schedule, participants, location, status, and (where available) participation — without copying domain rows into a generic persistence entity.

## Source domain ownership

| Activity | Canonical source of truth |
|----------|---------------------------|
| Training | `TrainingSession` (+ series allocations / occurrence overrides) |
| Match | `Event` (`type = MATCH`) + match identity policies (`MatchExternalMapping`, club directory) |
| Tournament | `Event` (`type = TOURNAMENT`) + `organizerName`, participants |
| Other sporting events | `Event` (`type = OTHER`) |

Presentation adapters in `lib/sporting-activity-presentation/` translate authorized, tenant-scoped source rows into `SportingActivityPresentation`. They never become the system of record.

## Presentation contract

`SportingActivityPresentation` (see `lib/sporting-activity-presentation/types.ts`) groups:

- **identity** — resource key, title, type label, activity kind
- **schedule** — ISO instants, optional meeting time (when sources expose it)
- **team / participants** — SCE team, fixture line, opponent, home/away mode
- **context** — competition label, tournament organiser (distinct from venue)
- **location** — structured `SportingActivityLocation`
- **status** — mapped from domain lifecycle when present
- **participation** — optional; only when canonical participation state is already loaded (not invented here)

Programme rows embed an optional snapshot on `PersonalProgrammeItem.activityPresentation`.

## Location semantics

Structured fields: `mode`, `hostOrOrganiser`, `venueName`, `address`, `facilityResource`.

### HOME (training, home matches)

Display hierarchy when data exists:

1. Venue / Sportanlage  
2. Pitch / hall / room (only when explicitly allocated)  
3. Address (when available)

Host club is not repeated when it adds no information (tenant name suppression in formatters).

### AWAY (matches)

1. Host / opponent club at the venue  
2. Venue / Sportanlage  
3. Postal address (when distinct in source)  
4. Pitch / hall / room **only when explicitly supplied**

Absence of pitch is normal; never show “Platz unbekannt” or similar placeholders.

### NEUTRAL (tournaments)

1. **Organiser** (`Event.organizerName`)  
2. Venue  
3. Address  
4. Resource when supplied  

Organiser and venue are separate concepts — do not merge into one label.

## Participation boundary

Presentation may surface existing participation/RSVP state (e.g. pending response). This package does **not** introduce match squad (“Aufgebot”) models or player-pool semantics.

## Compact hierarchy principle (R2)

**PRIMARY = identity / WHO / WHAT** — training title, match fixture, tournament title (plus SCE team on tournament primary when not already in the title).

**SECONDARY = schedule remainder + WHERE / contextual information not already communicated by PRIMARY.**

Do not repeat information merely because it exists in multiple canonical fields. Secondary metadata must answer **where / context**, not restate **who / what** already visible on the primary line.

Central deduplication lives in `lib/sporting-activity-presentation/compact-dedupe.ts` (`filterCompactMetadataPartsAgainstPrimary`). Compact formatters apply it deterministically (case/whitespace tolerant, no fuzzy guessing).

Illustrative FCA examples (tenant-neutral pattern):

| Kind | Primary | Secondary |
|------|---------|-----------|
| Training | `Junioren F2 Training` | `FC Allschwil · Im Brüel · Kunstrasen 2/3` (club context · venue · allocated resource) |
| Tournament | `PlayMore Turnier · Junioren F2` | `FC Arisdorf · Gemeindesportplatz` |
| Away match | `BSC Old Boys – 1. Mannschaft` | `Auswärts · Schützenmatte, Basel` |

## Minimum visible information contract (R1 + R2)

Compact helpers live in `lib/sporting-activity-presentation/compact.ts`:

| Kind | Primary (`primaryText`) | Secondary metadata (agenda row, `omit-start` schedule) |
|------|-------------------------|--------------------------------------------------------|
| **TRAINING** | Training title | End time (start in time column) · club/host context · venue · pitch/hall when known |
| **MATCH** | Home – Away fixture | Auswärts/Neutral when relevant · venue · address · resource only when supplied (never repeat fixture participants) |
| **TOURNAMENT** | Title · SCE team | Organiser · venue · address · resource when supplied (never repeat SCE team) |

Consumers must not reimplement these semantics — use `formatSportingActivityCompactPrimaryText`, `formatSportingActivityCompactAgendaSecondaryLine`, or `resolveSportingActivityCompactPresentation`.

### Training facility field flow (FCA)

Personal programme training rows resolve facility hints in `loadTrainingSessionFacilityHints`:

- **Venue** — `FacilityResource.facility.name` from the effective pitch/hall allocation (session override, else series default).
- **Resource** — pitch/hall `FacilityResource.name` or `code` when a PITCH_HALL allocation exists.

Do not substitute the resource label for the venue when a parent facility name is present in source data.

## Progressive disclosure

- **Compact** — dashboard programme rows (`PersonalProgrammeAgendaRow`), selected-day calendar agenda  
- **Standard** — calendar month block secondary line (identity primary, no full metadata in month cells)  
- **Detail** — dedicated activity views (future consumers)

## Consumer migration

| Consumer | Status |
|----------|--------|
| Personal Dashboard — Mein Programm (`PersonalProgrammeAgendaRow`) | Migrated (R1 compact metadata) |
| Personal calendar month blocks (`buildCalendarEventBlockLines`) | Migrated (concise primary; rich detail via selected-day agenda row) |
| Personal programme adapters (training / team events) | Migrated |
| Training management list (`TrainingSeriesManagementRow` facility cell) | Shared location semantics (venue + resource) |
| Matchcenter Spiele list (`buildSpieleVenueLine`) | Shared compact secondary semantics (no opponent duplication; venue once per row) |
| Tournamentcenter list (`resolveTournamentManagementMetadataLine`) | Shared organiser/venue semantics |
| Club command center / Heute im Verein | Uses legacy `event-venue-presentation` (inventory) |
| Wochenplaner | Not migrated |
| Team upcoming matches | Inventory |
| Infoboard / notifications / mobile | Not migrated |

## Security / tenancy

Adapters run after personal relevance and permission checks. Presentation helpers do not widen queries; batch loaders are scoped by `tenantId` and authorized session/team sets already enforced in programme adapters.

## Mobile

The native app should consume `SportingActivityPresentation` (or the same JSON snapshot on programme payloads) rather than re-interpret `Event.location` or legacy subtitle strings.
