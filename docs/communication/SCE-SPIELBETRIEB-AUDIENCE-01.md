# SCE-SPIELBETRIEB-AUDIENCE-01 — Spielteilnahme Domain Audience + Operational Attention

## Purpose

First flagship **DomainAudience** consumer after DOMAIN-CONSUMERS-01 / PROBETRAINING-COMM-01 for **MATCH / TOURNAMENT** squad participation (Spielbetrieb).

Target UX (operator):

> F2 · Spiel/Turnier Sonntag — 2 Rückmeldungen ausstehend — **Erinnerung senden**

Display counts are **not** send authority. Actions re-read live `ParticipationResponse` state and materialize `DomainAudienceReference` at execution time (COMM-03 → COMM-17 → COMM-18).

## Participation model (current)

| Concept | Implementation |
|---------|----------------|
| Events | `Event` with `type` MATCH / TOURNAMENT |
| Invitee population | Active `PlayerSquadMember` for `teamSeasonId` (full season squad — **no match-specific Aufgebot entity**) |
| Responses | `ParticipationResponse` (`OPEN`, `YES`, `NO`, `MAYBE`) |
| Deadline | `Event.participationResponseDueAt` (optional) |
| Guardians | `guardianRelationship` + COMM-18 via COMM-03 recipient resolution |
| Existing comm | SCE-COMM-10 presets + `sendEventNoResponseSmartReminder` |

### Terminology (v1)

Use: **Spielteilnahme**, **Teilnahmeanfrage**, **Rückmeldung**, **Rückmeldung ausstehend**, **Zugesagt**, **Abgesagt**, **Vielleicht**.

Do **not** describe recipients as “für dieses Spiel aufgebotene Spieler” until a canonical match-day selection entity exists.

### Future gap — MATCH-SPECIFIC AUFGEBOT / SELECTION

Planned flow: season squad → selected subset for event → participation request → response → final squad. **Out of scope** for this package.

## Shared participation core

| Before | After |
|--------|-------|
| Preset filtering only in `event-participation-recipients.ts` | Canonical queries in `lib/participation/participation-audience-resolution.ts` |
| COMM-10 only | COMM-10 + Spielbetrieb DomainAudience + operational attention share `listParticipationSubjectPersonIds()` |

COMM-10 APIs and UI are unchanged; `event-participation-recipients.ts` delegates to the shared module.

## Domain audience provider

| Field | Value |
|-------|-------|
| `domainKey` | `spielbetrieb` |
| `sourceKey` | `teilnahme` |
| Registry key | `spielbetrieb.teilnahme` |
| Registration | `ensureSpielbetriebDomainAudienceRegistered()` (lazy, with Probetraining in discovery/expansion) |

### Candidate identity (stable, event-specific)

Format (11 colon segments):

`v1:team:{teamId}:ts:{teamSeasonId}:ev:{eventId}:kind:{MATCH|TOURNAMENT}:p:{preset-segment}`

Preset segments: `all`, `yes`, `no`, `maybe`, `not-responded`.

Example display label: `Spielteilnahme – F2 · Heimspiel – Sonntag – Rückmeldung ausstehend`

### Authorization

| Operation | Gate |
|-----------|------|
| Discovery / materialization | Team communication **view** (`resolveTeamCommunicationAuthorization.canView`) |
| Send / Erinnerung | View **and** team communication **send** |

Communication send permission alone does not grant cross-team participation visibility.

### Live resolution / saved Zielgruppen

Saved `DomainAudienceReference` rows store `{ sourceKey, candidateId }` only. Materialization re-queries squad + `ParticipationResponse` at preview/send time. Invalid or non-actionable events **fail closed** (no fallback to whole club/tenant).

## Operational attention (first source)

| Field | Value |
|-------|-------|
| Source | `spielbetriebParticipationOutstandingAttentionSource` |
| Kind | `participation-outstanding` |
| Relevance | Upcoming (`startAt >= now`), status `SCHEDULED` or `LIVE`, MATCH/TOURNAMENT |
| Count | Live `NOT_RESPONDED` (OPEN) squad members |
| Action | `Erinnerung senden` → `executeSpielbetriebOutstandingParticipationReminder()` |
| Deferred audience | `spielbetrieb.teilnahme` + NOT_RESPONDED candidate for event |
| Deep link | `/dashboard/teams/{teamId}/teilnahmen` |
| Zero outstanding | Item omitted (not persisted) |

No generic attention registry/aggregator in this package (deferred to DOMAIN-OPERATIONAL-ATTENTION-01).

## Manual reminder execution

Reuses **`sendEventNoResponseSmartReminder`** (COMM-10) after:

1. Re-auth view + send  
2. Re-load event (actionable lifecycle)  
3. Re-count `NOT_RESPONDED` via shared core  
4. Zero recipients → safe no-op (no stale send)

## TOCTOU

Race tests ensure a UI count of 3 never authorizes sending to a player who responded before click; execution uses live queries only.

## UI / composer

- **EventCommunicationPanel** — existing “Ohne Rückmeldung” remind path unchanged.  
- **COMM-EVO-03** domain composer — provider supports future: Aus SCE → Spielbetrieb → event → Rückmeldung ausstehend (discovery via `searchCandidates`).  
- Dashboard/mobile aggregation — deferred.

## Automatic reminders

Out of scope (no new cron/policies). Existing `CommunicationReminderSchedule` infrastructure untouched.

## Tests

`lib/spielbetrieb/__tests__/sce-spielbetrieb-audience-01.test.ts` — provider, identity, auth, presets, attention, TOCTOU, fail-closed, COMM-10 regression.

## Related docs

- `SCE-DOMAIN-CONSUMERS-01.md`  
- `SCE-DOMAIN-AUDIENCE-01.md`  
- `SCE-COMM-10-EVENT-COMMUNICATION-SMART-REMINDERS.md`  
- `SCE-PROBETRAINING-COMM-01.md`
