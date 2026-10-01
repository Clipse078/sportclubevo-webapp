# SCE Canonical Sports Activity Presentation

**Package:** SCE-ACTIVITY-UX-01  
**Status:** Implemented (Dashboard programme + personal calendar first consumers)

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

## Progressive disclosure

- **Compact** — dashboard programme rows, small calendar chips (`formatSportingActivityPresentation(..., "compact")`)  
- **Standard** — calendar month blocks, programme lists  
- **Detail** — dedicated activity views (future consumers)

## Consumer migration

| Consumer | Status |
|----------|--------|
| Personal Dashboard — Mein Programm (`PersonalProgrammeAgendaRow`) | Migrated |
| Personal calendar month blocks (`buildCalendarEventBlockLines`) | Migrated |
| Personal programme adapters (training / team events) | Migrated |
| Club command center / Heute im Verein | Uses legacy `event-venue-presentation` (inventory) |
| Wochenplaner | Inventory |
| Matchcenter detail/list | Inventory |
| Team upcoming matches | Inventory |
| Mobile app | Future — consume this contract |

## Security / tenancy

Adapters run after personal relevance and permission checks. Presentation helpers do not widen queries; batch loaders are scoped by `tenantId` and authorized session/team sets already enforced in programme adapters.

## Mobile

The native app should consume `SportingActivityPresentation` (or the same JSON snapshot on programme payloads) rather than re-interpret `Event.location` or legacy subtitle strings.
