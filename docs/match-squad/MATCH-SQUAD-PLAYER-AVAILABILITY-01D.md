# MATCH-SQUAD-PLAYER-AVAILABILITY-01D — Cross-Team Discovery, Request & Approval

| Field | Value |
|-------|-------|
| **Package** | Cross-Team Discovery, Request & Approval |
| **Canonical key** | `MATCH_SQUAD_PLAYER_AVAILABILITY-01D` |
| **Status** | **IN PROGRESS** (implementation on STAGE preview branch) |
| **Branch** | `cursor/match-squad-player-availability-01d-3805` |
| **Base** | `STAGE` @ `21086013390bcb88d8f9d03c1752108b0c5d5da9` |

---

## 1. Purpose

01D completes the trainer-to-trainer workflow after **01C Spielerfreigabe**:

```text
PLAYER RELEASE (01C)
  → DISCOVERY (01D)
  → REQUEST (01D)
  → SOURCE TRAINER DECISION (01D)
  → APPROVED REQUEST (01D)
STOP — assignment & communication belong to 01E
```

---

## 2. Architecture diagnosis (summary)

| Area | Finding |
|------|---------|
| **PlayerRelease** | Canonical 01C aggregate — one row per target-specific rule (`PERIOD` / `ACTIVITY`). |
| **Release targets** | `targetTeamSeasonId` — same tenant/season; eligibility via `resolvePlayerReleaseTargetTeams`. |
| **Match / Tournament squad** | `MatchSquad` + `MatchSquadMember` keyed by `Event.id` + own-team `teamSeasonId`. |
| **Availability** | `ParticipationResponse` — independent signal; displayed in discovery, blocks request on `NO`. |
| **Conflict engine** | No full person calendar engine; 01D adds **lightweight overlap hints** via `MatchSquadMember` + event times. |
| **Authorization** | Target: `resolvePlayerReleaseTargetViewAccess` + squad edit paths. Source: `resolvePlayerReleaseAccess.canManageSource`. |
| **Existing request models** | `PlatformCommunicationRequest`, CMS approval, editorial workflows — **semantically unrelated**. |
| **REUSABLE_REQUEST_MODEL** | **NO** — dedicated bounded aggregate required. |
| **Audit** | `logAction` on create / approve / reject / cancel; snapshot fields on request row. |
| **Concurrency** | `expectedVersion` = `updatedAt` ISO on decide/cancel (same pattern as 01A/01C). |

---

## 3. Domain aggregate — `PlayerReleaseRequest`

| Field | Role |
|-------|------|
| `playerReleaseId` | Live reference to authorizing release (revalidated on approve). |
| `personId` | Released player (denormalized for queries). |
| `sourceTeamSeasonId` / `targetTeamSeasonId` | Stammteam vs requesting team. |
| `targetEventId` | MATCH or TOURNAMENT activity anchor. |
| `requestedMinutes` | Optional; must be ≤ release `maxMinutes` when set. |
| `status` | `PENDING` \| `APPROVED` \| `REJECTED` \| `CANCELLED`. |
| `releaseMaxMinutesSnapshot` / `releaseReasonSnapshot` | Decision context if release later changes. |
| `requestedByUserId` / `decidedByUserId` / `cancelledByUserId` | Audit actors. |

**Migration:** `20261011120000_match_squad_player_availability_01d_release_request`

---

## 4. Invariants (locked)

| Invariant | Enforcement |
|-----------|-------------|
| Discovery requires **explicit ACTIVE release** | Query + `isPlayerReleaseValidForTargetActivity`. |
| `NOT_SELECTED ≠ RELEASED` | Unchanged 01A/01C. |
| `SELECTED` does not auto-block discovery | Conflict = time overlap hints, not selection alone. |
| `Freigegeben ≠ Einsatzberechtigt` | Suitability labels; unknown never shown as eligible. |
| `Genehmigt ≠ Zugewiesen` | No `MatchSquadMember` mutation on approve. |
| Request ≠ release / availability mutation | Service boundaries + tests. |

---

## 5. Discovery semantics

- **Entry:** Match/Tournament **Aufgebot** → **Freigegebene Spieler finden**.
- **Direction:** Inverse of 01C target picker — releases where `targetTeamSeasonId` = activity team.
- **Validity:** Calendar date within `validFrom`/`validUntil`; `PERIOD` or `ACTIVITY` (non-training) for MATCH/TOURNAMENT.
- **Ranking:** Suitability → conflicts → availability (explainable sort priority).

---

## 6. API (STAGE)

| Method | Route |
|--------|-------|
| GET/POST | `/api/matchcenter/[matchId]/released-players` |
| POST | `/api/matchcenter/[matchId]/player-release-requests/[requestId]/cancel` |
| GET/POST | `/api/tournamentcenter/[tournamentId]/released-players` |
| POST | `/api/tournamentcenter/[tournamentId]/player-release-requests/[requestId]/cancel` |
| GET | `/api/teams/[teamId]/team-seasons/[teamSeasonId]/player-release-requests` |
| POST | `/api/teams/.../player-release-requests/[requestId]/decide` |

---

## 7. UX

| Surface | Behaviour |
|---------|-----------|
| **Match Aufgebot** | SCE workspace section — discovery cards, **Anfragen**, status pills (Angefragt/Genehmigt/…). |
| **Tournament Aufgebot** | Same component (`variant=tournament`). |
| **Source Kader** | **Anfragen für freigegebene Spieler** — Genehmigen / Ablehnen. |

---

## 8. 01E boundary

01D **does not**: assign to target squad, send guardian/player comms, or mutate `PlayerRelease` on approve/reject.

---

## 9. Human UAT (deterministic)

| Item | STAGE guidance |
|------|----------------|
| **SOURCE** | FC Allschwil Junioren B1 (`cmsoczv2t000504juhvod5hi9`) — SCE Testspieler with ACTIVE release to B2. |
| **TARGET** | Junioren B2 match/tournament Aufgebot. |
| **Match route** | Planning → Spiele → UAT match → Aufgebot → Freigegebene Spieler finden. |
| **Source review** | Teams → B1 → Kader → Anfragen für freigegebene Spieler. |
| **Confirm** | Genehmigt does **not** add player to Aufgebot automatically. |

---

## 10. Test data ledger

See `docs/match-squad/MATCH-SQUAD-PLAYER-AVAILABILITY-TEST-DATA.md` — 01D may add bounded `PlayerRelease` / `PlayerReleaseRequest` rows tagged for 01F cleanup.
