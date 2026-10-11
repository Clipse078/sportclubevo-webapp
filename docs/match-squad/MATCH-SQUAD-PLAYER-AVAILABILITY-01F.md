# MATCH-SQUAD-PLAYER-AVAILABILITY-01F — Operational Intelligence & Club UAT

| Field | Value |
|-------|-------|
| **Package** | Operational Intelligence & Club UAT |
| **Canonical key** | `MATCH_SQUAD_PLAYER_AVAILABILITY-01F` |
| **Status** | **OPEN** (PO Club UAT **PASS** recorded; merge + cleanup APPLY deferred) |
| **Branch** | `cursor/match-squad-player-availability-01f-operational-intelligence-44b0` |
| **Feature HEAD** | `a914e77b795766dd37e2b71c7eb664122e8849a5` |
| **Base STAGE** | `0315716bfd3c0ed30cbdc8e3e21059ef35827a91` |
| **Predecessor** | 01E **CLOSED** (PR **#826**) |
| **PR** | **#827** (draft → `STAGE`) |
| **Preview** | Vercel preview @ `a914e77` (shared STAGE Neon) |

---

## 1. Diagnosis summary

The 01A–01E workflow is complete in domain terms (availability → selection → release → discovery → request → approval → assignment → communication → remove/reassign). The main 01F gap was **operational visibility**: source trainers could manage releases and decide pending requests, but could not see **per-activity request outcome and Aufgebot status** without opening the target match. Target inbound Kader showed raw request status without **Genehmigt / Aufgeboten / Noch nicht aufgeboten** semantics aligned with Aufgebot.

**No new persistence.** Presentation is derived from existing `PlayerRelease`, `PlayerReleaseRequest`, and `MatchSquadMember.playerReleaseRequestId`.

---

## 2. Operational visibility matrix (after 01F)

| State | Source Kader | Target Kader inbound | Target Aufgebot | Coordinator |
|-------|--------------|----------------------|-----------------|-------------|
| RELEASED (no request) | Freigabe row + validity | Inbound card | Discovery | Existing team views |
| REQUEST PENDING | Anfragen panel + track | Angefragt | Discovery / request | — |
| APPROVED unassigned | Track: Genehmigt · Noch nicht aufgeboten | Same | Genehmigte Freigaben | — |
| ASSIGNED | Track: Aufgeboten + deep link | Aufgeboten | Aufgeboten row | — |
| REJECTED / CANCELLED | Track label | Pill | — | — |
| Release revoked / expired | Release display phase | Drops from inbound when inactive | Blocked assign | — |
| Event cancelled | Aktivität abgesagt | Same | Existing feasibility | — |

---

## 3. Derived read model

| Module | Role |
|--------|------|
| `lib/match-squad/cross-team-player-operational-state.ts` | Pure `deriveCrossTeamOperationalPresentation` |
| `lib/match-squad/cross-team-player-operational-state-service.ts` | Load tracks for source/target team seasons |

**Canonical signals preserved** — derivation never writes domain state.

API: `GET .../player-releases` adds `operationalTracksByReleaseId`.

---

## 4. UI surfaces

| Actor | Surface | Change |
|-------|---------|--------|
| Source trainer | Team → Kader → Spielerfreigaben | Per-release operational tracks (activity, status, deep link) |
| Target trainer | Team → Kader inbound Freigegebene Spieler | Operational pill + secondary line |
| Target trainer | Match Aufgebot | Unchanged (01E) |

---

## 5. Notifications (review)

| Event | Implemented |
|-------|-------------|
| Targeted release | `PLAYER_RELEASE_TARGETED` (01D R1) |
| Request | **No** dedicated notification (source uses Kader Anfragen panel) |
| Approve/Reject | **No** push (by design in 01D) |
| Assignment | `PLAYER_RELEASE_ASSIGNED` (01E) |
| Removal | **No** new type (remove returns player to Genehmigte Freigaben) |

Email remains preference-aware; STAGE fails closed without mail provider.

---

## 6. Club UAT script (controlled)

**Tenant:** fc-allschwil · **Source:** Junioren B1 `cmsoczv2t000504juhvod5hi9` · **Target:** Junioren B2 `cmsoczvt0000604ju1f1eindm` · **Players:** SCE Testspieler 01–06 (ledger IDs) · **Primary B2 match:** `cmrzhj6qc006w04kwxd2d01lj` · **Availability match:** `cmrzhj3je006a04kwhbepxvdz`

Phases A–L follow package prompt (availability → selection → release → awareness → request → decision → approved pool → assign → comms → remove → reassign → refresh).

Readiness: `npx tsx scripts/match-squad-01f-club-uat-readiness.ts`

---

## 7. Test-data cleanup (prepared, not applied)

Script: `scripts/match-squad-01f-controlled-test-data-cleanup.ts`

- Default **DRY RUN**
- **APPLY** only with `APP_ENV=stage` (or `SCE_DATA_ENVIRONMENT=STAGE`), operational DB guard, and `--confirm MATCH-SQUAD-01F-CLEANUP`
- Deletes **ledger-scoped** programme rows only (SCE Testspieler 01–06 and linked artefacts)

**Do not APPLY until PO declares Club UAT PASS.**

---

## 8. Tests & build

| Gate | Result (2026-10-11) |
|------|---------------------|
| `npm run test -- lib/match-squad` | **138 passed**, **NEW_FAILURES = 0** |
| `TeamPlayerReleaseSection.test.tsx` (operational tracks) | **4 passed** |
| `NODE_OPTIONS=--max-old-space-size=8192 npm run build` | **PASS** |
| Schema / migration | **None** (01E assignment migration only) |
| PROD | **Untouched** |

New tests: `cross-team-player-operational-state.test.ts`, `match-squad-01f-cleanup-safety.test.ts`.

---

## 11. Human UAT — PO sign-off (2026-10-11)

**Environment:** STAGE shared DB · Vercel preview deployment for PR **#827** @ **`a914e77`**.

| Slice | Scope | Result |
|-------|-------|--------|
| **Operational visibility — source** | B1 **Kader → Spielerfreigaben** shows per-activity track for SCE Testspieler **01** without opening B2 Aufgebot | **PASS** |
| **Operational visibility — target inbound** | B2 **Freigegebene Spieler** uses **Genehmigt / Aufgeboten / Noch nicht aufgeboten** vocabulary | **PASS** |
| **Lifecycle delta (01F)** | Approved-but-unassigned shows **Genehmigt · Noch nicht aufgeboten**; assign/remove/reassign updates source track (01E fixture) | **PASS** |
| **Refresh / deep links** | Hard refresh on source release row + target inbound; activity deep link `?tab=aufgebot` | **PASS** |
| **Club UAT A–L (full chain)** | Controlled SCE Testspieler **01–06**, B1→B2, match `cmrzhj6qc006w04kwxd2d01lj` | **PASS** (01A–01E validated previously; 01F adds visibility only) |
| **Overall** | **PO_UAT** | **PASS** |

**Observed STAGE fixture (read-only agent snapshot, aligns with PO preview):**

- Active release `cmv406syn0000egjsl4y9rs05` · SCE Testspieler **01** · B2 match **18.10.2026**
- Request `cmv407uvj0000k6js3gfpnmlf` · **APPROVED** · **not assigned** → presentation **Genehmigt · Noch nicht aufgeboten**

Scan: `npx tsx scripts/match-squad-01f-club-uat-readiness.ts` · tracks: `npx tsx scripts/match-squad-01f-operational-tracks-snapshot.ts`.

**Note:** Unattended agent browser verification of Vercel preview is blocked by **Deployment Protection**; PO preview UAT @ `a914e77` is authoritative for UI sign-off.

---

## 12. Closure gates (partial — merge/cleanup deferred)

| Gate | Result |
|------|--------|
| Implementation on branch `…-44b0` | **COMPLETE** |
| PO Club UAT | **PASS** (§11) |
| Automated regression | **PASS** (§8) |
| Build | **PASS** (§8) |
| Cleanup **DRY RUN** | **PASS** — 25 controlled rows inventoried |
| Cleanup **APPLY** | **NOT RUN** (await explicit closure prompt after merge) |
| PR merge → `STAGE` | **NOT DONE** (per guardrails) |
| Package **CLOSED** | **NO** (open until merge + optional cleanup closure) |

---

## 9. Known limitations

- Coordinator cross-team dashboard: **not added** (permission-safe team Kader + match surfaces sufficient).
- PERIOD releases with many activities: source view lists **one track per request** (not collapsed into a single state machine).
- Request/decision push notifications: intentionally omitted unless PO identifies operational risk.

---

## 10. Roadmap

| Item | Status |
|------|--------|
| 01A–01E | CLOSED |
| **01F** | OPEN — PO UAT **PASS**; draft PR **#827**; merge + `TEST_DATA_REMAINING = 0` deferred |
| Sponsor / Mobile / SCE-UI-ROLLOUT | Not started |
