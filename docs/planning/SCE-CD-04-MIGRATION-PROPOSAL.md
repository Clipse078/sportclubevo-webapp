# SCE-CD-04 — Consolidated Migration Proposal

## Summary

Additive schema for Vereinsentwicklung **strategy**, **initiative backlog**, **milestones**, **target links**, **development sprints**, and **optional task primary initiative association** (`Task.primaryInitiativeId`) without overwriting task `contextType` / `contextId`.

**Remote migration execution:** NOT performed by agents or this PR on shared databases. Apply via the standard deployment pipeline after review.

## Migrations (exact order)

| Order | Migration | Scope |
|------|-----------|--------|
| 1 | `prisma/migrations/20261113183000_sce_cd_04_strategy_sprints/migration.sql` | Enums, `Initiative` backlog fields, `InitiativeMilestone`, `InitiativeTargetLink`, `DevelopmentSprint`, `DevelopmentSprintTaskMembership` |
| 2 | `prisma/migrations/20261114103000_sce_cd_04_task_primary_initiative/migration.sql` | `Task.primaryInitiativeId` FK → `Initiative`, index `(tenantId, primaryInitiativeId)` |

After both: `npx prisma generate` in CI/build.

## Schema detail (migration 1)

### New enums

| Enum | Values |
|------|--------|
| `InitiativeDisposition` | NONE, DEFERRED, REJECTED, ARCHIVED |
| `DevelopmentSprintStatus` | PLANNED, ACTIVE, COMPLETED |
| `InitiativeMilestoneStatus` | OPEN, DONE |

### `Initiative` columns

| Field | Type | Default |
|-------|------|---------|
| `expectedOutcome` | TEXT nullable | null |
| `backlogPriority` | INT | 0 |
| `disposition` | `InitiativeDisposition` | NONE |

Indexes: `(tenantId, backlogPriority)`, `(tenantId, disposition)`.

### New tables

- **InitiativeMilestone** — `(tenantId, initiativeId)`, `(initiativeId, sortOrder)`
- **InitiativeTargetLink** — `@@unique([initiativeId, targetId])`, tenant indexes
- **DevelopmentSprint** — `@@unique([tenantId, slug])`, `(tenantId, status)`
- **DevelopmentSprintTaskMembership** — `(sprintId, removedAt)`, `(tenantId, taskId)`; preserves sprint history via `removedAt` / `addedAfterSprintStart`

## Schema detail (migration 2)

### `Task.primaryInitiativeId`

- Nullable FK → `Initiative.id`, `ON DELETE SET NULL`
- Optional Vorhaben rollup for meeting/match/training-context tasks
- Does **not** replace `contextType` / `contextId`; clearing the FK restores prior-only context

## Backfill & compatibility

- Existing initiatives: `backlogPriority = 0`, `disposition = NONE`, `expectedOutcome = null`
- Existing tasks: `primaryInitiativeId = null`
- No JSON backfill from legacy `Target.linkedInitiativeRefs` in these migrations (optional follow-up job)
- Application code assumes columns/tables exist after migrations; previews without migration will 500 on new APIs

## Surfaces requiring migration 1 + 2

| URL | APIs |
|-----|------|
| `/vereinsleitung/strategie` | `GET /api/club-development/strategy-overview` |
| `/vereinsleitung/initiativen/backlog` | `GET /api/club-development/initiatives/backlog` |
| `/vereinsleitung/initiativen/[slug]` | milestones, target-links, **primary-tasks**, connected work, progress |
| `/vereinsleitung/sprints` | `GET/POST /api/club-development/sprints` |
| `/vereinsleitung/sprints/[slug]` | sprint PATCH (start), tasks, close |
| `/vereinsleitung/sprints/[slug]/board` | board + task status PATCH |
| Sprint / initiative pickers | `GET /api/club-development/task-candidates`, `GET /api/club-development/targets/candidates` |

## Isolated-database validation (local)

Evidence from this branch (no shared-data writes):

```bash
npx prisma generate
npx vitest run lib/club-development/__tests__/sce-cd-04*.test.ts
npm run test:route-governance
npm run build
```

Apply migrations 1–2 on an isolated Postgres instance before PO UAT on preview; Vercel preview without migration will not serve sprint/backlog/milestone/primary-initiative APIs.

## Deployment order

1. Review and merge application + SQL migrations
2. Run migration `20261113183000_sce_cd_04_strategy_sprints`
3. Run migration `20261114103000_sce_cd_04_task_primary_initiative`
4. `prisma generate` + deploy application
5. PO UAT on authenticated Vereinsentwicklung URLs (see PR checklist)

## Rollback

1. Drop `Task.primaryInitiativeId` column and FK (migration 2)
2. Drop new tables and `Initiative` columns (migration 1, reverse FK order)

No destructive changes to pre-existing task or initiative rows.