# SCE Canonical Sports Activity Presentation

**Package:** SCE-ACTIVITY-UX-01 (R1–R8)  
**Status:** **Closed on STAGE (2026-10-02)** — canonical presentation read-model, Mein Programm three-line contract, activity type pills, shared `SportingActivityIdentity` on Planning management lists

**Follow-up (not in UX-01):** [`docs/roadmap/SCE-ACTIVITY-DESIGN-01.md`](../roadmap/SCE-ACTIVITY-DESIGN-01.md)

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

### HOME (training occurrence, home matches)

For **training occurrence surfaces**, secondary location is **effective venue · effective resource** only. Do not repeat tenant club or SCE team on the compact secondary line.

Display hierarchy when data exists:

1. Venue / Sportanlage (`Facility.name` from effective allocation)
2. Pitch / hall / room (`FacilityResource.name` or `code` when allocated)

### AWAY (matches)

1. Host / opponent club at the venue  
2. Venue / Sportanlage  
3. Postal address (when distinct in source)  
4. Pitch / hall / room **only when explicitly supplied**

Absence of pitch is normal; never show “Platz unbekannt” or similar placeholders.

### NEUTRAL (tournaments)

Organiser lives in `context.organiser` (`Event.organizerName`), not as a substitute for the participating SCE team.

Compact secondary:

1. **Organiser** when supplied  
2. Venue  
3. Address  
4. Resource when supplied  

Organiser and venue are separate concepts — do not merge into one label.

## Compact hierarchy principle (R2 + R3)

**PRIMARY = identity / WHAT** — training title, match fixture, tournament title · participating SCE team (when not already in the title).

**SECONDARY = WHERE / contextual information not already communicated by PRIMARY** — effective training location, match away/home context + venue, tournament organiser + venue.

Do not repeat information merely because it exists in multiple canonical fields.

Central deduplication lives in `lib/sporting-activity-presentation/compact-dedupe.ts` (`filterCompactMetadataPartsAgainstPrimary`). Compact formatters apply it deterministically (case/whitespace tolerant, no fuzzy guessing). Deduplication does not replace correct canonical field semantics.

Illustrative examples (tenant-neutral pattern):

| Kind | Primary | Secondary |
|------|---------|-----------|
| Training (occurrence) | `Junioren F2 Training` | `Im Brüel · KR2` |
| Tournament | `PlayMore Turnier · Junioren F2` | `FC Arisdorf · Gemeindesportplatz` |
| Away match | `BSC Old Boys – 1. Mannschaft` | `Auswärts · Schützenmatte, Basel` |

## Training allocation model (occurrence programme)

Training location on Dashboard → Mein Programm must represent the **effective allocation for the concrete occurrence/date**. A more specific session/effective allocation takes precedence over generic series/default allocation according to the canonical training allocation model in `lib/training/effective-training-allocation-resolution.ts`:

| Tier | Source | Precedence |
|------|--------|------------|
| Occurrence override | `TrainingSessionAllocation` for this session | Wins per allocation group |
| Series default | `TrainingAllocation` on `TrainingSeries` | Used when no override for that group |

Within each tier and group (`PITCH_HALL`, `DRESSING_ROOM`, `OTHER`):

- Session overrides: highest `displayOrder`, then newest `createdAt`
- Series pitch/other defaults: lowest `displayOrder`, then oldest `createdAt`

**Primary playable surface** for programme hints: resolve `PITCH_HALL` first; if none, resolve `OTHER` (e.g. indoor hall booked as `FacilityResourceType.OTHER`). Dressing rooms do not substitute for venue on programme rows.

### Series/planning vs occurrence/personal programme

- **Planning → Trainings (series/management view)** may show broader series allocation summaries and planning semantics.
- **Dashboard → Mein Programm (occurrence view)** answers: “Where is **this** training on **this** date?” using the same allocation resolver, scoped to the session occurrence.

## Tournament organiser vs participating team

The participating SCE club/team and the organising/host club are **different concepts**.

- Primary: tournament title · SCE team (when not redundant in title)
- Secondary: `Event.organizerName` · venue · resource

Compact secondary must use the actual organiser/host where available and **must not** substitute the current tenant or participating team as organiser.

## Minimum visible information contract

Compact helpers live in `lib/sporting-activity-presentation/compact.ts`:

| Kind | Primary (`primaryText`) | Secondary metadata (agenda row, `omit-start` schedule) |
|------|-------------------------|--------------------------------------------------------|
| **TRAINING** | Training title | End time (optional) · effective venue · pitch/hall when known |
| **MATCH** | Home – Away fixture | Auswärts/Neutral when relevant · venue · address · resource only when supplied |
| **TOURNAMENT** | Title · SCE team | Organiser · venue · resource when supplied |

Consumers must not reimplement these semantics — use `formatSportingActivityCompactPrimaryText`, `formatSportingActivityCompactAgendaSecondaryLine`, or `resolveSportingActivityCompactPresentation`.

### Training facility field flow

Personal programme training rows resolve facility hints in `loadTrainingSessionFacilityHints`:

- **Venue** — `FacilityResource.facility.name` from the effective primary playable allocation (session override, else series default).
- **Resource** — `FacilityResource.name` or `code` when allocated.

Do not substitute the resource label for the venue when a parent facility name is present in source data.

## Activity type identity (semantic colors)

Canonical activity type pills / identity treatment:

| Kind | Label | Semantic color |
|------|-------|----------------|
| Training | TRAINING | **blue** (`training-blue`) |
| Match | SPIEL | **red** (`match-red`) |
| Tournament | TURNIER | **orange** (`tournament-orange`) |

Helpers: `lib/sporting-activity-presentation/activity-type-pill.ts`. UI: `components/sporting-activity/SportingActivityIdentity.tsx`.

Historical consumers may still map match to non-red colors — track migration under **SCE-ACTIVITY-COLOR-01** (shared design tokens, not per-surface hacks).

## Progressive disclosure

- **Compact** — dashboard programme rows (`PersonalProgrammeAgendaRow`), selected-day calendar agenda  
- **Standard** — calendar month block secondary line (identity primary, no full metadata in month cells)  
- **Management** — Planning → Trainings / Spiele / Turniere list rows (`SportingActivityIdentity` + management presentation adapters)  
- **Detail** — dedicated Activity Detail (future: SCE-ACTIVITY-DESIGN-01B)

## Consumer migration

| Consumer | Status |
|----------|--------|
| Personal Dashboard — Mein Programm (`PersonalProgrammeAgendaRow`) | Migrated (R1–R7: compact metadata, club–location line, type pills) |
| Personal calendar selected-day agenda | Uses same compact helpers |
| Planning → Trainings (`TrainingSeriesManagementRow`) | Migrated (R8 management presentation + identity) |
| Planning → Spiele (`SpieleManagementMatchRow`) | Migrated (R8) |
| Planning → Turniere (`TurniereManagementRow`) | Migrated (R8) |
| Command center / Wochenplaner / team views | Planned — SCE-ACTIVITY-DESIGN-01A / 01D |
