# DASHBOARD-01 — Personal Context + Relevance Resolver

Status: **Implemented** on branch `cursor/dashboard-d-personal-workspace-discovery`.

## Purpose

Establish the canonical server-side foundation for the personal SportClubEvo dashboard:

- **Relationship establishes relevance**
- **Domain authorization establishes visibility**

PersonalContext answers *what is this user related to?* It does **not** grant access to resources.

## PersonalContext contract

Location: `lib/dashboard/personal-context/`

| Field | Meaning |
|-------|---------|
| `tenantId`, `userId`, `personId` | Actor identity (personId null when unlinked) |
| `hasActiveTenantMembership` | Active tenant gate |
| `teams[]` | Personally relevant teams + relationship kinds |
| `orgUnits[]` | Org memberships + assignment-derived org scope |
| `assignments[]` | Active `PersonAssignment` rows (tenant-scoped) |

Public presentation DTO: `PersonalContextDescriptor` (`kind`, `label`, optional `secondaryLabel`) — no raw permission keys, functionKey, or person/user IDs.

## Identity resolution

- Canonical link: `Person.userId` within active `tenantId`
- Cross-tenant Person rows never enter context (strict `tenantId` filters on all queries)
- Users without linked Person: meetings/tasks paths may still apply; team relevance empty

## Team relationships

Sources (deduped per team):

1. `TrainerTeamMember` → `TRAINER`
2. `PlayerSquadMember` → `PLAYER`
3. `PersonAssignment.teamId` → `PERSON_ASSIGNMENT`

## OrgUnit relationships

Sources:

- `OrgUnitMembership` (user and/or linked person)
- `PersonAssignment.orgUnitId`

Org membership does **not** imply access to all org resources.

## PersonAssignment

Loaded from dedicated `PersonAssignment` model (`ACTIVE`, `tenantId` scoped).  
`functionKey` is organisational only — never treated as RPERM relevance.

## Relevance helpers

`lib/dashboard/personal-context/relevance.ts`

- `getPersonallyRelevantTeamIds`
- `isTeamPersonallyRelevant`
- `isOrgUnitPersonallyRelevant`
- `permissionKeysArePersonalRelevance` → always false (explicit guard)

No `canViewBecauseRelevant` APIs.

## Context labels

`lib/dashboard/personal-context/context-labels.ts`

Precedence for team events:

1. Direct sporting role (Trainer / Spieler)
2. Team-scoped PersonAssignment function label
3. Fallback team name

Function labels from `PERSON_FUNCTION_LABELS` — raw `functionKey` is not exposed.

## Event security fix

`lib/personal-agenda/calendar-entries.ts` pipeline:

1. Tenant-scoped candidate query (`teamId IN personally relevant teams`)
2. Personal relevance re-check (`isTeamPersonallyRelevant`)
3. Authorization (`canIncludeEventInPersonalProjection` in `event-projection-access.ts`)
4. Public `PersonalCalendarItem` mapping (title/date only after authorization)

Authorization uses module read permissions (planner-compatible) and review-stage gates (view-only → `APPROVED` / `PUBLISHED`).

## Zero disclosure

Unauthorized or non-relevant events produce **no row** — no redacted placeholders, no metadata leaks in serialized projections.

## Personal agenda integration

- `resolvePersonalContext` is the canonical relationship input
- `resolvePersonalTeamIds` delegates to personal context (backwards compatible)
- `loadPersonalAgenda` resolves context once per request

No parallel `lib/dashboard-personal-agenda-v2`.

## Programme adapter boundary (DASHBOARD-02)

`lib/dashboard/personal-context/programme-adapter-contract.ts` defines adapter input:

`PersonalContext + permissionKeys + time window → PersonalCalendarItem[]`

Event adapter is secured in DASHBOARD-01; other sources follow in DASHBOARD-02.

## Query strategy

Single batched resolution per request:

- membership + person
- parallel trainer / squad / assignments / org memberships

No per-team N+1 in resolver. Event authorization is in-memory on the candidate set.

## Multi-tenant

All queries require `tenantId`. No hardcoded club/team identifiers in resolver logic.

## Schema

**SCHEMA_CHANGED = NO** — uses existing models only.

## DASHBOARD-D pointers

See updated status notes in `DASHBOARD-D-IMPLEMENTATION-PLAN.md` (DASHBOARD-01 section).
