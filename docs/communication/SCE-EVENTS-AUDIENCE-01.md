# SCE-EVENTS-AUDIENCE-01 — Veranstaltungsteilnahme Domain Audience + Operational Attention

## Purpose

Third **DomainAudience** consumer for **club Veranstaltungen** (`Event.type = OTHER`, participation `eventKind: CLUB_EVENT`).

Target UX (operator):

> Vereinsanlass · Helferabend — 6 Rückmeldungen ausstehend — **Erinnerung senden**

Only when a canonical participation request is active (`participationResponseDueAt` set). No active Teilnahmeanfrage → no outstanding audience, no attention item, no reminder action.

## Participation model (current)

| Concept | Implementation |
|---------|----------------|
| Entity | `Event` with `type: OTHER` |
| Invitee population | `EventParticipationAudienceEntry` (kinds `PERSON`, `TEAM`, `ORG_UNIT`, `ROLE`) expanded via `resolveClubEventInviteePersonIds` |
| Population semantics | **Dynamic at read time** — team/role/org-unit entries re-expand on each materialization (not snapshotted to person rows at publish) |
| Responses | `ParticipationResponse` with `eventKind: CLUB_EVENT`, `eventId`, `teamSeasonId: null` |
| Deadline / activation | `Event.participationResponseDueAt` — active only when set (`isParticipationResponseRequested`) |
| Status filter | Shared `lib/participation/participation-audience-resolution.ts` (same OPEN/YES/NO/MAYBE semantics as COMM-10; domain composer adds `MAYBE_ONLY`) |
| Guardians | COMM-03 → COMM-17 → COMM-18 (subjects are invitees, not guardians) |
| Existing comm | COMM-10 presets via club branch in `participation-audience-resolution`; team API when `Event.teamId` + `teamSeasonId` set; otherwise COMM-11 club communication with `EVENT` context |

### Distinction from Spielbetrieb / Training

| | Veranstaltungen | Spielbetrieb / Training |
|---|-----------------|-------------------------|
| Invitee source | `EventParticipationAudienceEntry` | `PlayerSquadMember` (season squad) |
| Domain key | `events` | `spielbetrieb` / `training` |
| Product label | Vereinsanlass / Veranstaltung | Spiel / Turnier / Training |

## Domain audience provider

| Field | Value |
|-------|-------|
| `domainKey` | `events` |
| `sourceKey` | `teilnahme` |
| Registry key | `events.teilnahme` |
| Registration | `ensureEventsDomainAudienceRegistered()` (lazy, with other domain sources) |

### Candidate identity

`v1:evt:{eventId}:kind:CLUB_EVENT:p:{preset-segment}`

Preset segments: `all`, `yes`, `no`, `maybe`, `not-responded`.

Validation: tenant, `type=OTHER`, `kind:CLUB_EVENT` in identity. Tampering fails closed.

### Authorization

| Operation | Permission |
|-----------|------------|
| Discovery / materialize | `events.view` or `events.manage` |
| Manual Erinnerung | `events.manage` + `communication.club.send` |
| Team-scoped event remind | Above + team communication send (COMM-10 path when `teamId` + `teamSeasonId` on event) |

Not gated on `communication.team.view` — Veranstaltungen uses event permissions.

### Live resolution / saved Zielgruppen

Saved references store `{ sourceKey, candidateId }` only. Materialization re-expands invitation entries and responses. Inactive request, past event, archived/cancelled → fail closed.

## Relevance window

| Event state | Attention / audience |
|-------------|----------------------|
| Future / in progress (`effectiveEnd >= now`) | Yes (if active request + preset match) |
| Past (`endAt ?? startAt < now`) | No |
| `ARCHIVED` / `CANCELLED` / outside SCHEDULED+LIVE | No |
| No `participationResponseDueAt` | No |

Effective end: `endAt ?? startAt` (aligned with Veranstaltungen management tabs).

## Operational attention

- Source: `clubEventParticipationOutstandingAttentionSource`
- Kind: `participation-outstanding`
- Action: `events.participation.remind-not-responded` → live `NOT_RESPONDED` materialization
- No persistence; count derived at evaluation time (TOCTOU-safe on send)

## Manual reminder execution

1. Authenticate + authorize (`events.manage`, club send)
2. Reload event; validate lifecycle + active request
3. `resolveClubEventInviteePersonIds` + `NOT_RESPONDED` filter
4. Zero outstanding → no-op
5. Send via COMM-10 (`sendEventNoResponseSmartReminder`) when team-scoped, else COMM-11 draft/publish with EVENT context

## COMM-10 parity

Presets align with `EVENT_AUDIENCE_PRESETS` plus domain `MAYBE_ONLY`. `NOT_RESPONDED` = missing row or `OPEN`; `MAYBE` is not outstanding.

## FCA validation

Read-only script: `scripts/sce-events-audience-01-fca-readonly-aggregate.ts` (aggregates only, no PII export).

## Deferred

- DOMAIN-OPERATIONAL-ATTENTION-01 registry aggregation
- Automatic scheduled reminders (COMM-16 / cron) — manual only in this package
- Dashboard/mobile surfacing of attention items
