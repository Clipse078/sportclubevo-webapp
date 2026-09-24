# PLANNING-INTEGRATION-P0R1 — Product reconciliation (#707 superset)

**Date:** 2026-09-24  
**Repo:** Clipse078/sportclubevo-webapp  
**Branch:** `cursor/planning-ux-05r2-visual-refinement` (PR **#707**)  
**STAGE baseline:** `a49190300247ca766160ab402c8b6dc96596b4be`  
**Starting #707 HEAD:** `5bd81e0652d2e96260fff17ba907e97028de6276`  
**#706 reference HEAD:** `59efcaf6cb8b8f4352836e1d06415d9862d909b8`

## Observed regression

INTEGRATION-CLOSURE-01 correctly restored the **personal dashboard** and **PLANNING-UX-05R2** compact resource language on #707, but several **canonical edit routes** still mounted pre-UX-03 legacy shells:

| Surface | Route | #707 before P0R1 |
|---------|-------|------------------|
| Training session edit | `/dashboard/training/sessions/[id]/edit` | Narrow `bg-white` cards, no `PlanningEditorShell`, no Aufgaben/Anforderungen/Zusammenarbeit |
| Veranstaltung edit | `/dashboard/veranstaltungen/[id]/edit` | Shared editor shell present, but **05R1** participation audience + Anforderungen panel missing |
| Saisonplaner edit | `/dashboard/planner/edit/[id]` | Legacy `PlannerEntryEditForm` on **both** #706 and #707 (season-planner CRUD; not replaced in this pass) |

Root cause: #707 cherry-picked dashboard programme + consolidated 05R2 planning work, but **did not port** the #706-only Training UX-03/R stack and PLANNING-UX-05R1 operational parity patches.

## Route reconciliation matrix

| DOMAIN | ROUTE | BEFORE (#707) | TARGET | SOURCE | ACTION | AFTER |
|--------|-------|---------------|--------|--------|--------|-------|
| TRAINING | `/dashboard/training/new` | 05R2 compact selectors | + 05R1 publication bar + redirect to first session edit | `5d6b49ae` (partial) | PORT + KEEP_05R2 | Compact selectors retained; 05R1 behavior merged |
| TRAINING | `/dashboard/training/sessions/[id]/edit` | Legacy light cards | UX-03/R + 05R1 work/collaboration/requirements | `59e664f9`…`5d6b49ae` | PORT_FROM_706 | `PlanningEditorShell` workspace |
| MATCH | `/dashboard/matchcenter/new` | 05R2 operational create | unchanged | #707 | KEEP_707 | Compact selectors |
| MATCH | `/dashboard/matchcenter/[id]` | Tasks only | + Anforderungen panel | `5d6b49ae` | PORT_FROM_706 | `ContextRelatedRequirementsPanel` |
| TOURNAMENT | create/edit | 05R2 + record workspace | + requirements on edit | `5d6b49ae` | PORT_FROM_706 | Requirements wired |
| VERANSTALTUNG | create | 05R2 shell | redirect to edit after create | `5d6b49ae` | PORT (redirect only) | |
| VERANSTALTUNG | `/dashboard/veranstaltungen/[id]/edit` | Placeholder participants | 05R1 audience + RSVP + requirements | `5d6b49ae` | PORT_FROM_706 | Full operational sections |
| SAISONPLANER | `/dashboard/planner/edit/[id]` | Legacy form | Shared editor (future) | — | DEFER_EXPLICITLY | Unchanged (same on #706) |

## #706 patch forensics (summary)

| COMMIT | CLASSIFICATION | PORTED | REASON |
|--------|----------------|--------|--------|
| `59e664f9` UX-03 rebuild | REQUIRED_PRODUCT_BEHAVIOR | YES | Training session edit shell |
| `5d65b1ab` UX-03R1 | REQUIRED_PRODUCT_BEHAVIOR | YES | Density / allocation disclosure |
| `55acfe7f` UX-03R2 | REQUIRED_PRODUCT_BEHAVIOR | YES | Participant roster + resource semantics |
| `f615438c` UX-04 | SUPERSEDED_BY_05R2 | NO | Visual system superseded on #707 |
| `14d7633e` UX-05 | SUPERSEDED_BY_05R2 | NO | Consolidated in 05R2 port |
| `a8fe7876` test fix | TEST_ONLY | Partial | Absorbed via ported tests |
| `5d6b49ae` 05R1 | REQUIRED_PRODUCT_BEHAVIOR + SCHEMA_REQUIRED | YES (code + schema file; migration **not applied**) | Operational parity |
| `59efcaf6` requirement links | REQUIRED_DEPENDENCY | YES | Anforderungen link/unlink API |
| `cf4fc108` 05R2 | ALREADY_ON_707 | N/A | Authoritative visual layer |

## Patches ported (deliberate)

- Training session edit route + presentation helpers + participants panel + tests (UX-03/R).
- PLANNING-UX-05R1: requirement resource model (schema), club event participation audience APIs/UI, `PlanningEditorWorkSection` requirements slot, match/tournament/veranstaltung/training requirements wiring.
- Requirement link API (`/api/planning/requirement-links`).
- Training create: 05R1 publication + first-session redirect **without** reverting 05R2 `CompactOperationalResourceSelector`.

## Patches not ported

- Full #706 `TrainingSeriesCreateForm` (used `VisualResourceAvailabilityPicker` — conflicts with 05R2).
- Dashboard programme commits (already equivalent on #707).
- Saisonplaner `PlannerEntryEditForm` replacement (no accepted replacement on #706).

## PLANNING-UX-05R1 migration (read-only safety)

| Field | Value |
|-------|--------|
| Migration | `20260924153000_planning_ux_05r1_operational_parity` |
| Repo SHA256 | `f8d1dd8d278a5d137471c316899524e2cc9ad914a97bc234227e48d24c5c7200` |
| Applied in this task | **NO** (P0R1); **YES on STAGE** before INTEGRATION-FINAL-01 merge gate (ledger `2026-09-24T15:48:53.330Z`) |
| STAGE write (INTEGRATION-FINAL-01) | Guarded deploy post-merge: **no pending migrations** (idempotent) |
| Production write | **NO** |

Schema/SQL committed; STAGE ledger + objects verified at INTEGRATION-FINAL-01. See `docs/integration/INTEGRATION-FINAL-01.md`.

## INTEGRATION-FINAL-01 closure (2026-09-24)

- #707 merged to `STAGE` at `a4889fdde4fbd907c4ad9db63bdfad91b719bbdc`.
- #706 closed without merge.
- Migration checksum on STAGE: `f8d1dd8d278a5d137471c316899524e2cc9ad914a97bc234227e48d24c5c7200`.

## Regression sentinels added

- `lib/planning/__tests__/planning-integration-p0r1-active-route-sentinels.test.ts` — canonical create/edit routes must reference shared planning editor primitives; training session edit must not regress to legacy light cards; create surfaces must keep compact operational selectors.

## Residuals

- `/dashboard/planner/edit/[id]` remains legacy season-planner CRUD until a dedicated programme unifies season entries with domain record workspaces.
- Requirement link and club-event participation features need migration on STAGE before full production use (code present, DB not mutated here).
