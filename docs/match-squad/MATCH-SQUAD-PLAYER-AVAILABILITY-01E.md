# MATCH-SQUAD-PLAYER-AVAILABILITY-01E — Target Assignment & Operational Communication

| Field | Value |
|-------|-------|
| **Package** | Target Assignment & Operational Communication |
| **Canonical key** | `MATCH_SQUAD_PLAYER_AVAILABILITY-01E` |
| **Status** | **IN PROGRESS** (draft PR → STAGE) |
| **Branch** | `cursor/match-squad-player-availability-01e-target-assignment-7f76` |
| **Base** | `STAGE` @ `49ba352ba0cbead916ebb82e9ed7d03213dfc520` |

---

## 1. Purpose

01E continues after 01D at **APPROVED `PlayerReleaseRequest`**:

```text
APPROVED REQUEST (01D)
  → TARGET TRAINER EXPLICIT ASSIGNMENT (01E)
  → MatchSquadMember + provenance (01E)
  → PLAYER / GUARDIAN + SOURCE TRAINER notification (01E)
STOP — 01F operational intelligence & club UAT
```

**Invariant:** `Genehmigt ≠ Aufgeboten` · `Approval ≠ Assignment`.

---

## 2. Architecture diagnosis (summary)

| Area | Finding |
|------|---------|
| **PlayerReleaseRequest** | Activity-specific; `APPROVED` is approval history only — not assignment. |
| **Assignment persistence** | **Option A:** `MatchSquadMember` + `playerReleaseRequestId` (unique), `assignedByUserId`, `assignedAt`. |
| **Structural Kader** | No `PlayerSquadMember` on target team; external players appear in Aufgebot with source label. |
| **Match / Tournament** | Shared `MatchSquad` aggregate keyed by `Event.id` + target `teamSeasonId`. |
| **Revoked release before assign** | Live revalidation blocks assignment. |
| **Revoked release after assign** | Row stays in Aufgebot; `Freigabe widerrufen` warning — no silent unassign. |
| **Unassign** | Remove `MatchSquadMember` only; request stays `APPROVED`; candidate returns if still valid. |
| **ParticipationResponse** | Never mutated by assignment. |
| **Notifications** | New type `PLAYER_RELEASE_ASSIGNED`, category `MATCH_SQUAD`; idempotent dedup per member + recipient. |

---

## 3. State machine

| State | Representation |
|-------|----------------|
| RELEASED | Active `PlayerRelease` |
| REQUESTED | `PlayerReleaseRequest.status = PENDING` |
| APPROVED | `PlayerReleaseRequest.status = APPROVED`, no linked member |
| ASSIGNED | `MatchSquadMember` with `playerReleaseRequestId` |
| UNASSIGNED | Member deleted; request may remain `APPROVED` |

---

## 4. API

| Method | Route |
|--------|-------|
| POST | `/api/matchcenter/[matchId]/player-release-requests/[requestId]/assign` |
| POST | `/api/tournamentcenter/[tournamentId]/player-release-requests/[requestId]/assign` |

GET match/tournament squad payloads include `approvedReleaseCandidates`.

---

## 5. UX (Aufgebot)

1. **Aufgeboten** — structural + assigned external (secondary: `{sourceTeam} · freigegeben`).
2. **Genehmigte Freigaben** — approved, not yet assigned; **Aufbieten**.
3. **Weitere Kaderspieler** — target roster only.

---

## 6. Communication

| Recipient | Trigger | Deep link |
|-----------|---------|-----------|
| Player / guardians | After assignment commit | Activity `?tab=teilnahme` |
| Source trainers | After assignment commit | Activity `?tab=aufgebot` |
| Target trainer (actor) | No redundant notification | — |

**Email safety (STAGE):** empty `EMAIL_FROM` / missing Resend → email delivery fails closed; in-app still works.

---

## 7. Migration

`20261011140000_match_squad_player_availability_01e_assignment`

---

## 8. Human UAT (controlled)

| Field | Value |
|-------|-------|
| Source | Junioren B1 |
| Player | SCE Testspieler 01 |
| Target | Junioren B2 |
| Match | `cmrzhj6qc006w04kwxd2d01lj` |
| Route | `/dashboard/matchcenter/cmrzhj6qc006w04kwxd2d01lj?tab=aufgebot` |
| Precondition | Active release + **APPROVED** request, **not** assigned |
| Fixture script | `scripts/match-squad-01e-uat-stage-fixture.ts` (removes assignment row only) |

---

## 9. 01F boundary

Dashboard intelligence, final SCE test-data cleanup, non-critical analytics — **not** 01E.

---

## 10. Test matrix (automated)

- Domain: approved assign, blocked states, idempotency, no structural Kader, unassign/reassign semantics (service + boundary tests).
- UI: `ApprovedReleaseAssignmentPanel`, provenance row labels.
- Regression: full `lib/match-squad` suite.
