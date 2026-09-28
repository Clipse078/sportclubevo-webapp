# SCE-COMM-EVO-06 — Personalisation & Dynamic Fields

## Architecture

Single server-owned **Communication Personalisation Engine** under `lib/communication/personalisation/`:

| Layer | Module | Responsibility |
|-------|--------|----------------|
| Registry | `field-registry.ts` | Canonical field keys, labels, categories, missing policies, implemented/deferred |
| Parser | `token-parser.ts` | Safe `<token>` / `<token\|fallback="…">` parsing — registered keys only |
| Context | `load-personalisation-context.ts` | Tenant, team, org unit, event, season, allocations |
| Resolver | `resolve-field-values.ts` | Deterministic value + `RESOLVED` / `MISSING` / `AMBIGUOUS` / `UNAVAILABLE` |
| Engine | `personalisation-engine.ts` | Validate, preview, render |
| Dispatch | `publish-personalisation.ts` | Per-recipient render at publish; block send on policy |
| Freeze | `PlatformCommunicationRecipientSnapshot.renderedSubject` / `renderedBodyText` | Immutable dispatch output |

**No** arbitrary templates, JavaScript evaluation, or DB path tokens.

## Token syntax

- Inserted by UI **Feld einfügen**: `<first_name>`, `<event_date>`, …
- Optional modifiers: `<first_name|fallback="Mitglied">`, `<match_pitch|policy=block>`
- Unknown tokens → validation error; never executed.

## When values resolve

| Phase | Behaviour |
|-------|-----------|
| Draft / template | Semantic tokens stored in `subject` / `bodyText` |
| Preview | Server `POST /api/communication/personalisation/preview` (bounded recipient) |
| Publish / scheduled execute | Resolve per delivery target at dispatch time |
| Historical | Frozen on `PlatformCommunicationRecipientSnapshot` — never re-rendered |

Scheduled communications (COMM-16) resolve at **execution**, not at schedule creation.

## Recipient vs subject vs guardian

- **Recipient** (`first_name`, …): delivery identity (guardian user when `viaGuardianSubstitution`).
- **Subject / child / player** (`child_first_name`, `player_full_name`, …): `subjectPersonId` on snapshot.
- **Guardian** (`guardian_first_name`, …): `guardianPersonId` when guardian delivery.
- **Ambiguity**: `<child_team>`, `<active_season_team>`, single-pitch tokens with multiple allocations → `AMBIGUOUS` or list tokens — never “first row wins”.

## Location & address

| Rule | Detail |
|------|--------|
| Source | `Event.location` free-text (structured street/PLZ not on Event — deferred) |
| `location_full_address` | Central formatter `formatFullPostalAddress` — no malformed `", 4123 "` |
| Away match | Away venue text only — **no** club/home pitch or home dressing room |
| Home match / training | `pitchCode`, dressing-room codes via `lib/facilities/display-helpers.ts` |
| Tournament multi-pitch | `<tournament_pitches>` / `<pitch_allocations>` list; `<tournament_pitch>` ambiguous if >1 |

## Pitch / facility

- **Single**: `<pitch_allocation>`, `<training_pitch>`, `<match_pitch>` (home only) — ambiguous if multiple.
- **List**: `<pitch_allocations>`, `<training_pitches>`, `<tournament_pitches>`.
- Tournament DB allocations: `TournamentResourceAllocation` + `FacilityResource.name`.

## APIs

- `GET /api/communication/personalisation/fields?contextKind=…` — metadata only (no resolvers).
- `POST /api/communication/personalisation/preview` — authorised preview + diagnostics.

## Field catalogue

Authoritative definitions: `COMMUNICATION_PERSONALISATION_FIELDS` in `field-registry.ts`.

**Counts (EVO-06):** 101 implemented · 24 deferred · 125 total.

### Deferred (no canonical source yet)

| Token | Reason |
|-------|--------|
| `preferred_language` | No stable person-level locale field |
| `club_short_name`, `club_phone`, `club_website`, `club_address` | No tenant correspondence address model |
| `team_league`, `team_head_coach`, `team_coaches`, `team_manager` | No single canonical coach/manager resolver in comm scope |
| `org_unit_lead` | No deterministic lead field |
| `location_street`, `location_postcode`, `location_city`, `location_country` | Event has free-text location only |
| `meeting_point`, `event_meeting_location`, `match_meeting_point`, `tournament_meeting_point` | Not stored separately from `meetingTime` / location |
| `match_round`, `registration_deadline` | No canonical field |
| `event_link`, `attendance_link`, `profile_link`, `task_link` | Safe deep links not wired in EVO-06 |
| Helper/task namespace | Out of scope (documented as expansion candidates) |

### Sample implemented mapping

| Token | Label (DE) | Source domain |
|-------|------------|---------------|
| `first_name` | Vorname | Delivery `Person` |
| `child_first_name` | Kind Vorname | Subject `Person` |
| `guardian_first_name` | Erziehungsberechtigte/r Vorname | Guardian `Person` on snapshot |
| `club_name` | Vereinsname | `Tenant.name` |
| `season` | Saison | Event season or active `Season` |
| `context_team` | Kontext-Team | `CommunicationContextRef` / event team |
| `active_teams` | Aktive Teams | `PlayerSquadMember` active season |
| `active_season_team` | Team (aktive Saison) | Only if exactly one team |
| `event_date` | Event Datum | `Event.startAt` (tenant TZ) |
| `match_opponent` | Spielgegner | `Event.opponentName` (MATCH context) |
| `location_full_address` | Vollständige Adresse | Formatted `Event.location` |
| `pitch_allocations` | Plätze (Liste) | Pitch codes / tournament resources |
| `attendance_status` | Teilnahmestatus | `ParticipationResponse` label |
| `sender_name` | Absendername | Frozen email sender snapshot |
| `communication_link` | Mitteilungs-Link | Internal dashboard href |
| `current_date` | Heutiges Datum | Tenant timezone at dispatch |

## Security

- Preview recipient must sit in authorised audience resolution (COMM-03).
- Contact fields respect `allowContactFields` / sender scope.
- Rendered values are escaped in email HTML path; tokens in user content are not re-parsed as HTML.
- Client never supplies resolved values for send truth.

## Future (architect only)

Registry/parser designed for future **conditional sections** (role / attendance). No `IF` syntax in EVO-06.

## Migration

`20260928180000_sce_comm_evo_06_personalisation` — additive columns on `PlatformCommunicationRecipientSnapshot`. Not applied to remote DB in agent runs.
