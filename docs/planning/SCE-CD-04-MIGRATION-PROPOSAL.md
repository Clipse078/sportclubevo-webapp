# SCE-CD-04 — Migration Proposal: Strategy, Backlog, Milestones, Sprints

## Summary

Additive schema extension for Vereinsentwicklung strategy surfaces: initiative backlog disposition/priority, formal target↔initiative links, initiative milestones, and development sprint task membership (independent of task `contextType` / `contextId`).

**Remote migration execution:** NOT performed by this change set. Apply via standard deployment pipeline after review.

## New enums

| Enum | Values | Purpose |
|------|--------|---------|
| `InitiativeDisposition` | NONE, DEFERRED, REJECTED, ARCHIVED | Backlog handling separate from `InitiativeStatus` |
| `DevelopmentSprintStatus` | PLANNED, ACTIVE, COMPLETED | Sprint lifecycle |
| `InitiativeMilestoneStatus` | OPEN, DONE | Initiative delivery checkpoints |

## `Initiative` extensions

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `expectedOutcome` | `TEXT` nullable | null | Free-text outcome statement |
| `backlogPriority` | `INT` | 0 | Higher = higher priority in backlog sort |
| `disposition` | `InitiativeDisposition` | NONE | Backlog lane |

**Indexes:** `(tenantId, backlogPriority)`, `(tenantId, disposition)`.

## New tables

### `InitiativeMilestone`

Tenant-scoped milestones under an initiative. Indexed by `(tenantId, initiativeId)` and `(initiativeId, sortOrder)`.

### `InitiativeTargetLink`

Join table `initiativeId` + `targetId`, `@@unique([initiativeId, targetId])`. Same-tenant enforced in service layer.

### `DevelopmentSprint`

Tenant-scoped sprint with slug, goal, status, optional schedule, `visibilityScope` (default ORGANISATION). `@@unique([tenantId, slug])`.

### `DevelopmentSprintTaskMembership`

Links tasks to sprints without mutating task context. `addedAfterSprintStart` flags late additions. `removedAt` supports soft-remove history on close (REMOVE disposition). Index `(sprintId, removedAt)` for active board queries.

## Backfill

- Existing initiatives receive `backlogPriority = 0`, `disposition = NONE`, `expectedOutcome = null`.
- No data migration from `Target.linkedInitiativeRefs` JSON into `InitiativeTargetLink` in this migration (optional follow-up job).

## Deployment order

1. Deploy application code that tolerates missing tables (not required — migration is additive-only).
2. Run migration `20261113183000_sce_cd_04_strategy_sprints`.
3. Run `prisma generate` in build pipeline.
4. Deploy API/services that use new models.

## Rollback

Drop new tables and columns in reverse order if needed (no destructive changes to existing rows).
