# DASHBOARD-02 — Mein Programm (Canonical Personal Programme)

Status: **Implemented** on branch `cursor/dashboard-d-personal-workspace-discovery`.

## Purpose

Server-side aggregation answering **“What is happening for me?”** — not club-wide schedules.

Primary sources: **TRAINING**, **MATCH**, **TOURNAMENT**, **EVENT** (Veranstaltung / `Event.type=OTHER`), **MEETING**.

Tasks and participation deadlines remain in `loadPersonalAgenda` (DASHBOARD-05 boundary).

## Canonical service

| Entry | Location |
|-------|----------|
| `loadPersonalProgramme()` | `lib/personal-agenda/load-personal-programme.ts` |
| RSC wrapper | `getPersonalDashboardProgramme()` (same module) |

Inputs:

- authenticated tenant + `userId`
- resolved via `resolvePersonalContext()` internally
- bounded window (`from` / `to` optional; default today → +14 tenant-local days)
- optional `limit`

Output: `PersonalProgrammeItem[]` + range metadata.

Legacy consumers continue using `loadPersonalAgenda()` which delegates calendar entries to the same adapters via `loadPersonalCalendarEntryProjections()`.

## Programme DTO

`PersonalProgrammeItem` — `lib/personal-agenda/personal-programme-types.ts`

Presentation-safe fields: `id`, `sourceType`, `startsAt`, `endsAt`, `allDay`, `title`, `subtitle`, `contextLabel`, `venue`, `status`, `deepLink`, optional team/opponent/homeAway metadata, `typeLabel`, `ariaLabel`.

Excluded: permission keys, raw functionKey, Person/User IDs, ACL internals.

Calendar backward compatibility: `personalProgrammeItemsToCalendarItems()` maps to `PersonalCalendarItem` with discriminated `sourceType` values.

## Source adapters

| Source | Adapter | Relevance | Authorization |
|--------|---------|-----------|---------------|
| Training/Match/Tournament/Event | `adapters/team-event-programme-adapter.ts` | `PersonalContext` team relationship | `canIncludeEventInPersonalProjection()` |
| Meeting | `adapters/meeting-programme-adapter.ts` | `MeetingParticipant.userId` or `createdByUserId` | `MEETINGS_VIEW` + `canSeeMeeting()` |

Parallel fetch: team events + meetings in `Promise.all` after context resolution.

Query pattern: one batched `event.findMany` (teamId IN relevant teams) + two meeting queries (participant, organiser). Authorization is in-memory on candidates — no N+1 per team.

## Personal relevance

Reuses DASHBOARD-01 only. Technical permissions, tenant membership, and club admin role **do not** establish programme relevance.

## Zero disclosure

Authorization runs **before** `PersonalProgrammeItem` construction. Unauthorized rows are omitted entirely (no counts/titles/IDs in output).

Event review-stage and module-read gates preserved from DASHBOARD-01.

## Context labels

Reuses `resolveTeamEventContextLabel`, `meetingParticipantContextLabel`, `meetingOrganizerContextLabel`.

## Deduplication

Stable keys: `event:{id}`, `meeting:{id}`. Participant + organiser on same meeting → single row (participant label wins).

## Sorting

`sortPersonalProgrammeItems()`: `startsAt ASC`, then `sourceType` order, then `id`.

## Time window

`resolvePersonalProgrammeRange()` — default **14 days** forward from tenant-local start of today; explicit `from`/`to` supported with max 366-day guard.

## Tenant timezone

Day grouping: `personalProgrammeDayKey()` / `groupPersonalProgrammeItemsByDay()` using `toLocalDateKey()` (same as publishing/matchcenter semantics).

## Status

Cancelled/postponed/completed events remain visible when authorized (`ARCHIVED` excluded). Presentation mapping in `programme-status.ts`.

## Deep links

| Source | Route |
|--------|-------|
| Team events | `/dashboard/planner/edit/{eventId}` |
| Meeting | `/vereinsleitung/meetings/{slug}` |

## Existing consumers

| Consumer | Integration |
|----------|-------------|
| Meine Agenda / cockpit | `loadPersonalAgenda` → shared adapters |
| Personal Kalender (month) | `loadPersonalProgramme()` + `resolvePersonalProgrammeMonthGridRange()`; tasks via `loadTaskDeadlineProjections()` when filtered |
| Command center | unchanged entry via `loadPersonalAgendaItems` |

**Heute im Verein** widget retained; Mein Programm supersedes its *personal* dashboard role in DASHBOARD-06.

## DASHBOARD-03 handoff

Calendar should call `loadPersonalProgramme()` (or `loadPersonalAgenda` with explicit month range) — **no parallel Training/Match/Tournament/Event/Meeting query stack**.

Use shared day keys for dots and filtering.

## Mobile-02

Server DTO is framework-agnostic (no React-only fields).

## Schema

**SCHEMA_CHANGED = NO**
