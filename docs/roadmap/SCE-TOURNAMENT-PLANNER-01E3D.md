# SCE-TOURNAMENT-PLANNER-01E3D — Group → Knockout Qualification Mapping + Progression Foundation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01E3D` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01E`](./SCE-TOURNAMENT-PLANNER-01E.md) — Smart Generator |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01E3C`](./SCE-TOURNAMENT-PLANNER-01E3C.md) — **CLOSED / ACCEPTED / MERGED** (PR **#863**) |
| **Status** | **CURRENT — READY FOR CLOSURE** (R1 hardening **PASS**) |
| **Branch** | `cursor/sce-tournament-planner-01e3d-qualification-mapping-progression` |
| **PR** | **#864** (draft) |
| **Next** | **01F** — Automatic Schedule Optimiser + Smart Timing Advisor (**NOT STARTED**) |

## Product purpose

01E3D bridges **GROUP_MIX** qualification rules to **KNOCKOUT** first-entry structural sides:

`GROUP_RANK (groupId, rank)` → `(knockoutPhaseId, roundIndex, slotIndexInRound, side)` → canonical **01E3C** knockout generator → fixtures + `WINNER_OF_FIXTURE` progression.

**In scope:** deterministic default cross-group pairing policy, explicit caller mappings, durable mapping persistence, validation, idempotency/drift safety, BYE-compatible qualification references.

**Out of scope:** standings/results, concrete participant resolution, winner resolution, scheduling, Creator/Planung UI, regeneration locks (01G), loser/placement brackets.

## Mapping model

| Layer | Identity |
| --- | --- |
| **Source** | `GROUP_RANK` — `{ sourceGroupId, rank >= 1 }` |
| **Target** | Structural knockout entry side — `{ roundIndex: 0, slotIndexInRound, side: A \| B }` (`TournamentFixtureSideLabel`) |
| **Persistence** | `TournamentKnockoutQualificationMapping` + `TournamentQualificationSource` |
| **Bracket integration** | Ordered `QUALIFICATION_REFERENCE` entrants → `generateKnockoutBracketForPhase` (01E3C) |

Display labels such as `1A` / `Semifinal 1` remain formatting-only (01E3A display helpers).

### Prisma schema (R1 audit)

`TournamentKnockoutQualificationMapping`:

| Field | Role |
| --- | --- |
| `tenantId`, `eventId` | Tournament ownership (canonical tenant/tournament context) |
| `knockoutPhaseId` | Target KNOCKOUT phase |
| `sourceGroupId`, `rank` | GROUP_RANK source |
| `roundIndex`, `slotIndexInRound`, `side` | Structural first-round entry side |
| `qualificationSourceId` | 1:1 link to `TournamentQualificationSource` |

**Uniqueness (DB-enforced):**

- `qualificationSourceId` — one mapping row per qualification source (source cannot map twice).
- `(knockoutPhaseId, roundIndex, slotIndexInRound, side)` — one source per knockout entry side.
- `(eventId, knockoutPhaseId, sourceGroupId, rank)` — duplicate GROUP_RANK source blocked per competition.
- Partial unique on `TournamentQualificationSource` for `GROUP_RANK` `(eventId, sourceGroupId, rank)`.

**FK delete semantics:** `tenantId` / `eventId` **CASCADE**; `knockoutPhaseId`, `sourceGroupId`, `qualificationSourceId` **RESTRICT** (prevents accidental history loss).

**Service-enforced cross-relation invariants:** group belongs to configured GROUP_MIX phase; phases share tenant/tournament; GROUP_MIX `displayOrder` < KNOCKOUT; rank within group membership; targets are round-0 entry sides only (not internal `WINNER_OF_FIXTURE` paths); cross-tenant / cross-tournament rejected.

## Default pairing policy

`AUTOMATIC_GROUP_RANK_PAIRING_POLICY = SCE_DETERMINISTIC_CROSS_GROUP_RANK_AWARE_SEED_ASSIGNMENT`

`DEFAULT_PAIRING_ALGORITHM` (actual): expand qualifiers in rank-major order (rank 1..N across groups in `displayOrder`), map to 01E3C bracket seeds via round-0 structural sides; for each first-round slot with two real seeds, choose the qualifier pair by **exhaustive search** over remaining slots maximizing lexicographic `pairScore`:

1. cross-group (+1000)
2. different rank (+100)
3. deterministic tie-break (lower combined `groupDisplayOrder` + `rank`)

Not strength seeding (`AUTOMATIC_STRENGTH_SEEDING_IMPLEMENTED = NO`).

Priority intent (structural):

1. Map every qualifier exactly once.
2. Avoid same-group first knockout pairings where a valid alternative exists (verified for 2–8 groups × 2 qualifiers; **AVOIDABLE_SAME_GROUP_FIRST_ROUND_PAIRINGS = 0** in tested matrices).
3. Spread group winners across the bracket where practical.
4. Pair different ranks where practical.
5. Deterministic / repeatable output.

Canonical **2 groups × 2 qualifiers → 4 KO entrants:** `1A vs 2B`, `1B vs 2A`.

## Explicit mapping

When callers supply `mode: "EXPLICIT"`, mappings are authoritative — SCE does not silently rearrange them (`EXPLICIT_MAPPING_PRESERVED_EXACTLY = YES`).

## BYE integration

GROUP_RANK qualification references may occupy BYE seeds; direct advancement preserves source identity (`GROUP_RANK_BYE_DIRECT_ADVANCEMENT = YES`). No fake BYE participants/fixtures/results.

## Transaction / concurrency (R1)

- First-time persistence runs in a Prisma transaction (qualification sources + mapping rows).
- Bracket generation uses canonical 01E3C service after commit; on bracket failure, mapping rows for that knockout phase are rolled back (`PARTIAL_GROUP_TO_KO_STRUCTURE_AFTER_FAILURE = NO` for mapping persistence).
- Unique constraint violations retry via re-read + idempotent path (`CONCURRENT_DUPLICATE_QUALIFICATION_MAPPINGS = 0` by design).
- Drift: differing persisted mapping fingerprint → `TournamentCompetitionConflictError` (`DESTRUCTIVE_QUALIFICATION_REGENERATION_IMPLEMENTED = NO`).

## Package boundary (01J)

| Concern | 01E3D |
| --- | --- |
| `GROUP_RANK` → concrete participant | **NO** |
| `WINNER_OF_FIXTURE` result resolution | **NO** |
| Standings / points table | **NO** |
| Live knockout progression | **NO** |

## 01D handoff

Structural knockout topology after mapping is assessable; **GROUP_RANK** sides remain **unresolved** for participant-rest feasibility until qualification resolution (01J).

## 01F handoff

No fixture time or tournament pitch assignment. Smart Timing Advisor remains planned (forward, backward, continuous nudging) — **not implemented** in 01E3D.

## Migration (R1 STAGE closure)

| Item | Value |
| --- | --- |
| **Migration** | `20261016210000_sce_tournament_planner_01e3d_knockout_qualification_mapping` |
| **Designated STAGE** | `APP_ENV=stage`, `SCE_DATA_ENVIRONMENT=STAGE`, fingerprint `acd3b37682911890`, host fragment `ep-wispy-hall-aso93dy6`, database `neondb` |
| **Script** | `scripts/sce-tournament-planner-01e3d-r1-stage-migration-verify.ts` |
| **Apply workflow** | Guarded `APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled` (not `db push`) |
| **MIGRATION_APPLIED_TO_DESIGNATED_STAGE** | **YES** |
| **PRISMA_MIGRATION_STATUS** | Database schema up to date |

**Pre/post counts (additive; no data loss):**

| Entity | Pre | Post |
| --- | ---: | ---: |
| Tournament | 47 | 47 |
| TournamentParticipant | 83 | 83 |
| TournamentPhase | 0 | 0 |
| TournamentGroup | 0 | 0 |
| TournamentQualificationSource | 0 | 0 |
| TournamentFixture | 0 | 0 |
| TournamentFixtureSide | 0 | 0 |
| TournamentKnockoutQualificationMapping | N/A (pre-table) | 0 |

**Legacy:** no backfill of qualification mappings for existing tournaments (`LEGACY_QUALIFICATION_MAPPING_BACKFILL = NO`).

## Service entry points

- `generateDefaultGroupRankMappingsPure`
- `applyGroupToKnockoutQualificationAndGenerateBracket`
- `listKnockoutQualificationMappings`

## Creator / Planung adoption

| Flag | Value |
| --- | --- |
| **TOURNAMENT_CREATOR_ADOPTION_REQUIRED** | **YES** (format, qualifiers, pairing mode) |
| **TOURNAMENT_PLANUNG_ADOPTION_REQUIRED** | **YES** (inspect/adjust qualification paths) |

## R1 automated gate (2026-10-16)

- Vitest: tournament planner **01E1–01E3D** regression suite — **27** files, **175** tests, **0** failures.
- `prisma validate` — **PASS**
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` — **PASS**
- Manual UAT / screenshots — PO-owned (skipped by Cursor agent).

**Closure:** `TOURNAMENT_PLANNER_01E3D_R1_CLOSURE_READY` — pending PO merge of PR **#864** (do not merge from agent).
