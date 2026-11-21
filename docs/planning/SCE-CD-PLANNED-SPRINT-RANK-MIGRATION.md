# Planned sprint workspace rank — migration proposal (separate from STAGE rollout)

| Step | Artifact | Notes |
| --- | --- | --- |
| 1 | `prisma/migrations/20261121180000_sce_cd_planned_sprint_rank/migration.sql` | `DevelopmentPlannedSprintRank` table (tenant + sprint, rank int) |
| 2 | Application | `lib/club-development/sprints/planned-sprint-rank.ts`, `PUT /api/club-development/umsetzungsplanung/planned-order` |

Apply on shared STAGE only after explicit PO approval alongside PR #1020 UAT. Until migration is deployed, the API returns HTTP 409 with the migration id; UI falls back to start-date ordering for phases without a stored rank.

No backfill is required: phases without a rank row keep date-based ordering among themselves, after manually ranked phases.