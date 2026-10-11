# MATCH-SQUAD-PLAYER-AVAILABILITY-01D — Cross-Team Discovery, Request & Approval

| Field | Value |
|-------|-------|
| **Package** | Cross-Team Discovery, Request & Approval |
| **Canonical key** | `MATCH_SQUAD_PLAYER_AVAILABILITY-01D` |
| **Status** | **CLOSED** (merged to STAGE via PR **#825**) |
| **Branch** | `cursor/match-squad-player-availability-01d-3805` (historical) |
| **Base (pre-merge)** | `STAGE` @ `21086013390bcb88d8f9d03c1752108b0c5d5da9` |
| **Feature HEAD (merge)** | `587a7e2ab902e1a583d19fe8e803e3fe1168d3fa` |
| **Closure** | 2026-10-11 · PO UAT **PASS** · regression **NEW_FAILURES = 0** · build **PASS** |

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
| **Target team Kader** | **Freigegebene Spieler** — persistent inbound overview + notification deep link (`?freigegebeneSpieler=1`). |

---

## 7a. Target Trainer-Team Release Awareness (01D R1)

| Topic | Behaviour |
|-------|-----------|
| **Targeted vs broad** | Explicit `targetTeamSeasonId` → proactive target-trainer awareness. General discoverability remains activity-level only (no broadcast spam). |
| **Recipients** | Active `TrainerTeamMember` on target `TeamSeason` → linked `Person.userId`. Trainers without user accounts do not block release creation; team-level inbound list still works. |
| **Notification** | Reuses SCE `Notification` platform — type `PLAYER_RELEASE_TARGETED`, category `MATCH_SQUAD`, in-app (+ email default). Aggregated copy e.g. «B1 hat 3 Spieler für B2 freigegeben.» within burst/window or optional `awarenessBurstKey` on create. |
| **Persistence** | `GET …/inbound-player-releases` + Kader section until release expires/revokes. **Read ≠ resolved** — marking notification read only acknowledges awareness. |
| **Deep link** | `/dashboard/teams/{teamId}/kader?freigegebeneSpieler=1` |
| **Request states** | Inbound list shows **Angefragt / Genehmigt / Abgelehnt** where a `PlayerReleaseRequest` exists (team-level, latest per release). **Genehmigt ≠ Zugewiesen**. |
| **Automatic** | Successful targeted `createPlayerRelease` triggers awareness post-commit (release transaction unaffected on notification failure). |
| **01E boundary** | No guardian/player push, no assignment, no squad mutation on approve. |

---

## 7b. Multi-Activity / Multi-Team Release Planning (01D R2)

| Topic | Behaviour |
|-------|-----------|
| **Domain atomicity** | One `PlayerRelease` row per **player × target team × target activity** (`scope=ACTIVITY`, `eventId`). Batch UX creates many atomic rows in one planning action — no arrays on `PlayerRelease`. |
| **Entry** | Source **Kader** → multi-select players → **Für andere Teams freigeben** → planning sheet. |
| **Activities** | Upcoming **MATCH** / **TOURNAMENT** across eligible target teams (union of per-player eligibility). Chronological grouping; target team on each row. |
| **Eligibility matrix** | Player × activity combinations validated server-side; invalid pairs skipped with summary note (e.g. «1 Kombination ist nicht möglich»). |
| **Defaults** | Plan-level purpose; optional **per-activity max minutes** via «Details anpassen». |
| **Review** | Compact counts: Spieler · Einsätze · Freigaben — confirm once (`POST …/player-releases/plan` with `action=create`). |
| **Persistence (R2)** | Pre-validated plan → **`prisma.$transaction`** creates all reviewed non-INVALID releases → commit → grouped awareness per target activity (post-commit). Mid-batch write failure rolls back the whole plan (no partial «4 Freigaben erstellt»). |
| **Activity discovery** | Includes canonical MATCH/TOURNAMENT rows keyed by `teamId` + `seasonId` when `teamSeasonId` is null (STAGE league imports). |
| **Awareness (R2)** | Aggregated **per target activity** — B2 Match A notification does not mention A2 Match B. Dedup key includes `eventId`. Deep link prefers Match/Tournament center route. |
| **Discovery** | Activity-scoped releases match only their `eventId`; **PERIOD** releases unchanged. |
| **Status** | **01D R1 UAT = PASS** · **01D R2 UAT = PASS** · **01D R2.1 UAT = PASS** · **01D R2.2 UAT = PASS** · **PO_UAT = PASS** |

## 7c. Uniform Match + Kader release planner (01D R2.1)

| Topic | Behaviour |
|-------|-----------|
| **Canonical UI** | One `PlayerReleasePlanningSheet` for **TEAM → Kader** and **Match → Aufgebot → Freigeben**. Legacy `PlayerReleaseEditorSheet` via `ActivityPlayerReleaseButton` remains for **training** and **generic planning-editor** activity rows only — not Match Aufgebot. |
| **Entry contract** | `PlayerReleasePlannerContext`: `sourceTeamSeasonId`, `selectedPersonIds`, optional `sourceEventId`, `entryPoint` (`TEAM_KADER` \| `MATCH_AUFGEBOT`). |
| **Match context** | `sourceEventId` = current match (planner context only). Target activities selected independently; `PlayerRelease.eventId` always references **target** activity. |
| **Target UX (R2.2)** | **Team-first master → detail → master** inside one sheet (`plannerView`: teams \| team-activities). Overview shows **team rows only** (counts + chevron). Drill into one team → multi-select activities → **N Einsätze übernehmen** → return to overview with per-team selected counts. Optional **Team suchen…** when ≥10 eligible teams. **Weitere Einsätze** on team detail when Match entry uses ±7-day proximity window. |
| **Ranking** | With `sourceEventId`: proximity to source match date, then chronology. Kader without source: chronological within team. |
| **Multi-player Match Aufgebot** | Planner API supports multiple `personIds`; row-level **Freigeben** opens with one preselected player (bulk Match selection deferred — no disruptive Aufgebot redesign in R2.1). |
| **Schema** | **No change** — source match not persisted on `PlayerRelease`. |

### Canonical hierarchy (R2.2)

```text
PLAYER(S)
  → TARGET TEAM (overview)
  → TARGET ACTIVITY/ACTIVITIES (focused team detail)
  → optional next TARGET TEAM
  → ÜBERSICHT (review)
  → CONFIRM (create plan)
```

Match and Kader share the same sheet, candidate engine, selection state, conditions, review, and create services — only Match adds source banner + proximity ranking.

Human UAT scan: `scripts/match-squad-01d-r2-1-uat-readiness.ts` (entry/context); R2.2 flow validated via `PlayerReleasePlanningSheet` component tests + PO UAT checklist below.

### API (STAGE)

| Method | Route |
|--------|-------|
| POST | `/api/teams/…/player-releases/plan/candidates` — `{ personIds[], sourceEventId? }` |
| POST | `/api/teams/…/player-releases/plan` — `{ action: "review" \| "create", personIds[], eventIds[], activityDefaults?, … }` |

### Human UAT R2 — deterministic STAGE scenario (2026-10-11)

Scan: `scripts/match-squad-01d-r2-uat-readiness.ts` · fixture/cleanup: `scripts/match-squad-01d-r2-uat-stage-fixture.ts`

| Role | Context |
|------|---------|
| **Source** | FC Allschwil Junioren **B1** (`teamSeasonId=cmsoczv2t000504juhvod5hi9`) · impersonate **FC Allschwil Club Admin** (`Person` `cmsnqz0qz000004l8g2efoyhw`) |
| **Players** | SCE Testspieler **01** + **06** |
| **Activity A (B2)** | **Sonntag 18.10.2026 · 15:00** · `cmrzhj6qc006w04kwxd2d01lj` · vs BSC Old Boys B2 · `/dashboard/matchcenter/cmrzhj6qc006w04kwxd2d01lj` |
| **Activity B (Junioren A)** | STAGE has no literal «A2» team — use **FC Allschwil Junioren A** as second target. **Sonntag 18.10.2026 · 20:00** · `cmuk7th5s004z04kxj153wp33` · vs SC Binningen · `/dashboard/matchcenter/cmuk7th5s004z04kxj153wp33` |
| **B2 target trainer** | **Patrick Scotton** (`Person` `cmuo3i77h000g04ibl09t7t2p`) |
| **A target trainer** | **Spielbetrieb** (`Person` `cmuo26ofc000004l6l5ousho7`) — bounded R2 fixture trainer on Junioren A |
| **Expected plan** | **2 · 2 · 4** · Activity A: **Kaderausgleich**, max **30** Min. · Activity B: **Spielpraxis**, no max minutes |

**Source flow:** B1 Kader → multi-select 01+06 → **Für andere Teams freigeben** → pick both activities in one sheet → review **2 Spieler · 2 Einsätze · 4 Freigaben** → **Details anpassen** → confirm **4 Freigaben erstellen** → success **4 Freigaben erstellt**.

**B2 awareness:** Patrick — proactive notice references **B2 match 18.10** only; Aufgebot shows 01+06; no Junioren A leakage.

**A awareness:** Spielbetrieb — separate notice for **Junioren A match 18.10** only; no B2 leakage.

**UX criteria (PO):** fast; clear multi-player / multi-activity / multi-team; date+time obvious; progressive disclosure; safe single confirm; calm sheet.

**Request slice:** B2 requests Testspieler 01 for Activity A → B1 **Anfragen für freigegebene Spieler** → approve → B2 **Genehmigt**, not auto-assigned; release 01→Activity B unchanged.

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

### Mandatory R1 — Target trainer awareness (PO PASS)

1. As **B1** trainer: release **3** controlled players explicitly for **B2** (same target team).
2. Switch to authorized **B2** trainer **without** opening Match/Tournament first.
3. Verify proactive notice: «B1 hat 3 Spieler für B2 freigegeben» (or canonical equivalent) in notification bell.
4. Open **Teams → B2 → Kader** — section **Freigegebene Spieler** shows **3 freigegebene Spieler**, all players correct, source B1, conditions visible; **B3** must not see B2-targeted rows.
5. Open B2 Match/Tournament **Aufgebot → Freigegebene Spieler finden** — same valid players discoverable.
6. Request one player; as B1 approve; return to B2 — inbound/discovery shows **Genehmigt**, player **not** auto-assigned to Aufgebot.

---

## 10. Canonical entry points (final)

| Entry | Route / action | Planner | Notes |
|-------|----------------|---------|-------|
| **A — Kader** | Team → **Kader** → multi-select → **Freigaben planen** / **Für andere Teams freigeben** | `PlayerReleasePlanningSheet` | No source Match; activities in chronological order within each target team. |
| **B — Match Aufgebot** | Match → **Aufgebot** → **Freigeben** | `PlayerReleasePlanningSheet` | `sourceEventId` + Match context banner; target activities ranked by proximity to source match, then chronology. |

Both entry points share: candidate resolution, eligibility, conflict hints, selection state, conditions, plan validation, transactional batch persistence, target awareness, review, and confirmation.

**Legacy:** `PlayerReleaseEditorSheet` remains only for **training** and **generic planning-editor** activity rows via `ActivityPlayerReleaseButton`, plus **single-release edit** in `TeamPlayerReleaseSection` — not Match Aufgebot release planning.

---

## 11. Human UAT — final PO sign-off (2026-10-11)

| Round | Scope | Result |
|-------|-------|--------|
| **R1** | Target trainer-team release awareness | **PASS** |
| **R2** | Multi-player / multi-team / multi-activity Kader planning | **PASS** |
| **R2.1** | Uniform Match + Kader `PlayerReleasePlanningSheet` | **PASS** |
| **R2.2** | Team-first target activity selection (master → detail → master) | **PASS** |
| **Overall** | **PO_UAT** | **PASS** |

Accepted UX hierarchy:

```text
PLAYER(S)
  → TARGET TEAM
  → TARGET ACTIVITY / ACTIVITIES
  → OPTIONAL NEXT TARGET TEAM
  → REVIEW
  → CONFIRM
```

---

## 12. Product invariants (final)

| Signal / action | Independent of |
|-----------------|----------------|
| Availability | Selection |
| Selection | Release |
| Release | Request |
| Request | Approval |
| Approval | Assignment |

German operational labels (unchanged):

- `NOT_SELECTED ≠ RELEASED`
- `SELECTED ≠ NOT RELEASABLE`
- `Freigegeben ≠ Einsatzberechtigt`
- `Freigegeben ≠ Angefragt`
- `Angefragt ≠ Genehmigt`
- `Genehmigt ≠ Zugewiesen`

**01D stops at APPROVED REQUEST.** No `MatchSquadMember` creation, no target Aufgebot mutation, no guardian/player assignment communication — those belong to **01E**.

---

## 13. Closure verification

| Gate | Result |
|------|--------|
| Automated regression (01C/01D/match-squad battery) | **153 passed**, **NEW_FAILURES = 0** |
| `TeamPlayerReleaseSection.test.tsx` | **4 passed** (requests-panel fetch mock + defensive `requests ?? []`) |
| Known STAGE baseline (e.g. `MatchcenterDetail` jsdom suite) | Reproduced on `origin/STAGE` — not counted as 01D regressions |
| Build | `NODE_OPTIONS=--max-old-space-size=8192 npm run build` — **PASS** |
| Migrations | `20261011120000_match_squad_player_availability_01d_release_request` + `20261011130000_match_squad_player_availability_01d_r1_target_awareness` only; **no R2/R2.1/R2.2 schema migration** |
| PROD | **Untouched** |

---

## 14. Roadmap (post-01D)

| Package | Status |
|---------|--------|
| 01A | CLOSED |
| 01B | CLOSED |
| 01C | CLOSED |
| MATCH_SQUAD_AVAILABILITY_SORTING-01 | CLOSED |
| SCE-ACTIVITY-NAV-01 | CLOSED |
| SCE-UI-STANDARD-01 | Foundation established / first adoption complete |
| **01D** | **CLOSED** |
| **01E** | **NEXT** — input: approved 01D request → actual target assignment + operational communication/confirmation |
| 01F | PLANNED |
| Sponsor Commercial Workflows | After 01F |
| Mobile App | After Sponsor |
| SCE-UI-ROLLOUT-01+ | Parallel / incremental — not a blocker for 01E |

---

## 15. Test data ledger

See `docs/match-squad/MATCH-SQUAD-PLAYER-AVAILABILITY-TEST-DATA.md` — SCE Testspieler **01–06** and bounded fixtures **retained** for 01E/01F; final module cleanup remains **01F**.
