# SCE-TOURNAMENT-PLANNER-01E3D — Group → Knockout Qualification Mapping + Progression Foundation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01E3D` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01E`](./SCE-TOURNAMENT-PLANNER-01.md) — Smart Generator |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01E3C`](./SCE-TOURNAMENT-PLANNER-01E3C.md) — **CLOSED / ACCEPTED / MERGED** (PR **#863**) |
| **Status** | **CURRENT — ready for review** |
| **Branch** | `cursor/sce-tournament-planner-01e3d-qualification-mapping-progression` |
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
| **Target** | Structural knockout entry side — `{ roundIndex: 0, slotIndexInRound, side: A \| B }` |
| **Persistence** | `TournamentKnockoutQualificationMapping` + `TournamentQualificationSource` |
| **Bracket integration** | Ordered `QUALIFICATION_REFERENCE` entrants → `generateKnockoutBracketForPhase` (01E3C) |

Display labels such as `1A` / `Semifinal 1` remain formatting-only (01E3A display helpers).

## Default pairing policy

`AUTOMATIC_GROUP_RANK_PAIRING_POLICY = SCE_DETERMINISTIC_CROSS_GROUP_RANK_AWARE_SEED_ASSIGNMENT`

Priority (structural, not strength seeding):

1. Map every qualifier exactly once.
2. Avoid same-group first knockout pairings where a valid alternative exists.
3. Spread group winners across the bracket where practical.
4. Pair different ranks where practical (e.g. 1st vs 2nd across groups).
5. Deterministic / repeatable output.

Canonical **2 groups × 2 qualifiers → 4 KO entrants:** `1A vs 2B`, `1B vs 2A`.

## Explicit mapping

When callers supply `mode: "EXPLICIT"`, mappings are authoritative — SCE does not silently rearrange them.

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

## Migration

`20261016210000_sce_tournament_planner_01e3d_knockout_qualification_mapping` — additive `TournamentKnockoutQualificationMapping` + partial unique index on `GROUP_RANK` `(eventId, sourceGroupId, rank)`.

## Service entry points

- `generateDefaultGroupRankMappingsPure`
- `applyGroupToKnockoutQualificationAndGenerateBracket`
- `listKnockoutQualificationMappings`

## Creator / Planung adoption

| Flag | Value |
| --- | --- |
| **TOURNAMENT_CREATOR_ADOPTION_REQUIRED** | **YES** (format, qualifiers, pairing mode) |
| **TOURNAMENT_PLANUNG_ADOPTION_REQUIRED** | **YES** (inspect/adjust qualification paths) |
