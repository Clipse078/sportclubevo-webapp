# MATCH-SQUAD-PLAYER-AVAILABILITY-01E — Target Assignment & Operational Communication

| Field | Value |
|-------|-------|
| **Package** | Target Assignment & Operational Communication |
| **Canonical key** | `MATCH_SQUAD_PLAYER_AVAILABILITY-01E` |
| **Status** | **CLOSED** (PR **#826** → `STAGE`) |
| **Branch** | `cursor/match-squad-player-availability-01e-target-assignment-7f76` |
| **Base (pre-01E STAGE)** | `49ba352ba0cbead916ebb82e9ed7d03213dfc520` |
| **Feature HEAD (closure)** | `95e92af91a34b0ae1f4d4d2b458f18d99e3263fc` |
| **Lineage** | 01E core (`f375d94c`) + **01E-R1** (`9030fa9e`) + **01E-R2** (`95e92af9`) |

---

## 1. Purpose

01E continues after 01D at **APPROVED `PlayerReleaseRequest`**:

```text
RELEASE (01C)
  → REQUEST (01D)
  → APPROVED (01D)
  → APPROVED RELEASE CANDIDATE (01E — Genehmigte Freigaben)
  → ASSIGN (01E — Aufbieten)
  → MATCH SQUAD / Aufgeboten (01E — temporary MatchSquadMember)
  → REMOVE (01E — Entfernen)
  → APPROVED RELEASE CANDIDATE (when release/request still valid)
STOP — 01F operational intelligence & club UAT
```

**Preserved boundaries:**

- **APPROVAL ≠ ASSIGNMENT** (`Genehmigt ≠ Aufgeboten`)
- **STRUCTURAL KADER MEMBERSHIP ≠ TEMPORARY TARGET ASSIGNMENT**
- **REMOVING A TEMPORARY ASSIGNMENT ≠ ADDING THE PLAYER TO «WEITERE KADERSPIELER»**

---

## 2. Architecture (final)

| Area | Finding |
|------|---------|
| **PlayerReleaseRequest** | Activity-specific; `APPROVED` is approval history only — not assignment. |
| **Assignment persistence** | `MatchSquadMember` + unique `playerReleaseRequestId`, `assignedByUserId`, `assignedAt`. |
| **Structural Kader** | `PlayerSquadMember` on target `TeamSeason` only; external players never auto-added. |
| **Temporary assignment** | `MatchSquadMember` with release provenance in Aufgeboten. |
| **Match / Tournament** | Shared activity-squad aggregate keyed by `Event.id` + target `teamSeasonId`; Tournament Hauptteam via existing event context. |
| **Revoked release before assign** | Live revalidation blocks assignment. |
| **Revoked release after assign** | Row stays in Aufgebot; `Freigabe widerrufen` warning — no silent unassign. |
| **Unassign** | Delete `MatchSquadMember` only; `PlayerRelease` + `APPROVED` request unchanged. |
| **ParticipationResponse** | Never mutated by assignment. |
| **Notifications** | `NotificationType.PLAYER_RELEASE_ASSIGNED`; idempotent dedup per member + recipient + purpose. |

---

## 3. Product model (final)

| Phase | UX / persistence |
|-------|------------------|
| **Input** | `APPROVED` `PlayerReleaseRequest` from 01D + valid `PlayerRelease`. |
| **Unassigned approved** | **Genehmigte Freigaben** — **Aufbieten** only. |
| **Assign** | Target trainer **Aufbieten** → POST assign → `MatchSquadMember` + notifications. |
| **Assigned** | **Aufgeboten** row with `{sourceTeam} · freigegeben`; **Entfernen** only (no Freigeben). |
| **Persistence** | Assignment stored on `MatchSquadMember`, not on target structural roster. |
| **Remove** | **Entfernen** / squad save removes temporary member only. |
| **Post-remove** | Player returns to **Genehmigte Freigaben** when request/release still valid. |
| **Reassign** | Explicit **Aufbieten** again; idempotent assign prevents duplicate rows. |

---

## 4. Counter semantics (locked)

| Counter | Semantics |
|---------|-----------|
| **Kader** | Count of structural target `TeamSeason` `PlayerSquadMember` roster (`structuralRosterTotal`). |
| **Availability chips** | Structural roster players only (Verfügbar / Nicht verfügbar / …). |
| **Aufgeboten** | All players currently selected for the activity, including approved external temporary assignments. |

**Controlled B2 UAT (PO):**

- Assigned external only: **Kader 0 · Aufgeboten 1** — **CORRECT**
- After remove: **Kader 0 · Aufgeboten 0** — **CORRECT**

Regression: `lib/match-squad/__tests__/match-squad-service.test.ts`, `match-squad-counts.test.ts`, `player-release-assignment-lifecycle.test.ts`, `MatchSquadSection.test.tsx` (01E-R2).

---

## 5. UX (Aufgebot)

1. **Aufgeboten** — structural + assigned external (secondary: `{sourceTeam} · freigegeben`).
2. **Genehmigte Freigaben** — approved, not yet assigned; **Aufbieten**.
3. **Weitere Kaderspieler** — target structural roster only (never unassigned externals).

**Freigeben (01C):** structural roster rows only when authorized; not on external assignment rows.

---

## 6. Communication (implemented scope)

| Audience | Behavior |
|----------|----------|
| **Target trainer (actor)** | No redundant self-notification; assignment is their action in Aufgebot. |
| **Player / linked guardians** | After successful assign commit: in-app `PLAYER_RELEASE_ASSIGNED` via guardian expansion (`TEAM_OPERATIONAL` / `IN_APP`); deep link activity **`?tab=teilnahme`**. |
| **Source trainers** | Informational in-app notification after assign; deep link activity **`?tab=aufgebot`**; entity `PlayerReleaseRequest`. |
| **Person without linked User** | No player/guardian delivery targets → skip player-side notifications; source trainers still notified when resolvable. |
| **Email** | Follows effective notification preferences per recipient via `createNotificationIdempotent` (STAGE: empty `EMAIL_FROM` / missing Resend → email fails closed; in-app unaffected). |
| **Dedup / idempotency** | `buildPlayerReleaseAssignmentDedupKey({ matchSquadMemberId, recipientUserId, purpose })` with `PLAYER_GUARDIAN` vs `SOURCE_TRAINER`. |

Implementation: `lib/match-squad/player-release-assignment-producer.ts`.

---

## 7. API

| Method | Route |
|--------|-------|
| POST | `/api/matchcenter/[matchId]/player-release-requests/[requestId]/assign` |
| POST | `/api/tournamentcenter/[tournamentId]/player-release-requests/[requestId]/assign` |

GET/PUT activity squad routes use `buildActivitySquadApiPayload` so release/manage fields stay aligned (**01E-R1**).

---

## 8. Migration

| Migration | Notes |
|-----------|-------|
| `20261011140000_match_squad_player_availability_01e_assignment` | Adds assignment FK + metadata on `MatchSquadMember`. |
| **01E-R1** | No migration. |
| **01E-R2** | No migration. |

**STAGE (closure):** `prisma migrate status` → schema up to date on shared STAGE Neon. **PROD:** not touched. **Manual DDL:** none.

---

## 9. 01E-R1 — release-action state preservation

**Problem:** PUT/409 squad payloads could omit release capability fields → **Freigeben** disappeared after squad mutation or hard refresh.

**Fix:** Canonical enrichment via `buildActivitySquadApiPayload` on GET, PUT, and 409; client merge via `mergeActivitySquadClientPayload`; Freigeben limited to structural rows.

**Regression:** `activity-squad-api-payload.test.ts`, `MatchSquadSection.test.tsx` (01E-R1), `MatchSquadPlayerRow.test.tsx`.

**PO Human UAT R1:** **PASS** (Freigeben stable for selected/unselected structural players; refresh-safe).

---

## 10. 01E-R2 — external removal & Kader counter

**Problem:** Removed external assignments could appear under **Weitere Kaderspieler**; Kader count could include non-structural rows.

**Fix:** Remaining/optimistic lists structural-only; failed PUT rolls back `selectedIds`; Kader from structural roster count only; unassigned valid externals return to **Genehmigte Freigaben**.

**Regression:** `player-release-assignment-lifecycle.test.ts`, `MatchSquadSection.test.tsx` (01E-R2).

**PO Human UAT R2:** **PASS** on B2 controlled fixture (see §11).

---

## 11. Human UAT (PO — closure)

| Slice | Result |
|-------|--------|
| **01E core flow** | **PASS** |
| **01E-R1** | **PASS** |
| **01E-R2** | **PASS** |

**Controlled fixture:** Junioren B1 → **SCE Testspieler 01** → Junioren B2 match `cmrzhj6qc006w04kwxd2d01lj`.

| Step | Observed |
|------|----------|
| Initial | Kader 0 · Aufgeboten 0 · **Genehmigte Freigaben · 1** |
| Assign | Aufgeboten 1 · provenance **FC Allschwil Junioren B1 · freigegeben** · Kader 0 |
| Remove | External **not** under Weitere Kaderspieler |
| Reconcile | Returns to **Genehmigte Freigaben · 1** · Kader 0 · Aufgeboten 0 |

Fixture script: `scripts/match-squad-01e-uat-stage-fixture.ts` (drops assignment row only).

---

## 12. Domain invariants (closure review)

| Invariant | Result |
|-----------|--------|
| Availability ≠ selection | **PASS** |
| Selection ≠ release | **PASS** |
| Release ≠ request | **PASS** |
| Request ≠ approval | **PASS** |
| Approval ≠ assignment | **PASS** |
| Assignment ≠ structural target Kader | **PASS** |
| NOT SELECTED ≠ RELEASED | **PASS** |
| SELECTED ≠ NOT RELEASABLE | **PASS** |
| Freigegeben ≠ Einsatzberechtigt / Angefragt / Zugewiesen | **PASS** |
| Remove preserves PlayerRelease + APPROVED request | **PASS** |

Automated anchors: `player-release-assignment-boundary.test.ts`, 01C/01D boundary tests, assignment service tests.

---

## 13. Authorization & privacy (closure)

| Case | Result |
|------|--------|
| Target trainer assign/remove on own activity | **PASS** (tests + service guards) |
| Source trainer release/request authority | **PASS** (unchanged 01C/01D) |
| Wrong team / tenant | **PASS** (deny) |
| Admin override | **PASS** (existing policy paths) |
| External participant team squad rights | **PASS** (no new cross-team manage) |
| Privacy in discovery/provenance UI | **PASS** (no guardian/contact leakage in assignment surfaces) |

---

## 14. Tournament regression

Shared activity-squad architecture; no Match-only leak.

| Check | Result |
|-------|--------|
| Hauptteam resolution | **PASS** (`tournament-squad-event-context.test.ts`) |
| Structural roster TeamSeason-based | **PASS** |
| GET/PUT payload enrichment | **PASS** (shared payload builder) |
| Teilnahme vs Aufgebot separation | **PASS** (`integrated-workspace.test.ts`) |

---

## 15. Automated regression (closure)

**Command (01A–01E battery):**

```bash
npm run test -- lib/match-squad \
  components/admin/matchcenter/__tests__/MatchSquadSection.test.tsx \
  components/admin/matchcenter/__tests__/MatchSquadPlayerRow.test.tsx \
  components/admin/matchcenter/__tests__/ApprovedReleaseAssignmentPanel.test.tsx \
  app/api/matchcenter/[matchId]/match-squad \
  lib/activity-navigation \
  components/admin/matchcenter/__tests__/MatchSquadCountsSummary.test.tsx \
  app/api/teams/[teamId]/team-seasons/[teamSeasonId]/player-releases
```

| Metric | Value |
|--------|-------|
| **TOTAL** | 157 |
| **PASSED** | 157 |
| **FAILED** | 0 |
| **KNOWN_BASELINE_FAILURES** | 20 (`app/api/matchcenter/[matchId]/__tests__/route.test.ts` PATCH mocks — reproduced on pre-01E STAGE `49ba352b`) |
| **NEW_FAILURES** | **0** |

**Build:** `NODE_OPTIONS=--max-old-space-size=8192 npm run build` → **PASS**

---

## 16. Test data (01E closure)

- **SCE Testspieler 01–06:** retained (`RETAINED_FOR_01F`).
- **01E UAT state:** controlled B2 release/request/assignment history on STAGE; no agent final cleanup.
- **TEST_DATA_REMAINING** | **> 0**
- **FINAL_CLEANUP** | **01F**
- **Unrelated FCA data** | unchanged

Ledger: [`MATCH-SQUAD-PLAYER-AVAILABILITY-TEST-DATA.md`](MATCH-SQUAD-PLAYER-AVAILABILITY-TEST-DATA.md).

---

## 17. 01F boundary

Dashboard intelligence, final SCE test-data cleanup (`TEST_DATA_REMAINING = 0`), non-critical analytics — **not** 01E.

**Handoff input:** CLOSED 01E assignment + notifications on STAGE; retained fixtures; PO-validated lifecycle on B2.
