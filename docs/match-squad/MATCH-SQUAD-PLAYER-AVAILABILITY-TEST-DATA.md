# MATCH_SQUAD_PLAYER_AVAILABILITY — Test Data Ledger

Policy: fictional records for 01A–01F UAT; **TEST_DATA_REMAINING = 0** required at parent module closure. Do not delete pre-existing FC Allschwil data during cleanup.

| Field | Value |
|-------|-------|
| **Module** | MATCH_SQUAD_PLAYER_AVAILABILITY-01A |
| **Tenant** | `fc-allschwil` (`cmomwboak0000tsf3zzivrs46`) |
| **Team** | FC Allschwil Junioren B1 (`cmrkh1mb1000i04jurtajh262`) |
| **TeamSeason** | `cmsoczv2t000504juhvod5hi9` (Season 2026/2027) |
| **Populated UAT event** | `cmrzhj3je006a04kwhbepxvdz` (2026-10-17) |
| **Zero-roster UAT event** | `cmrzhj0mx005q04kwtr9etuk6` (unchanged — no roster rows) |

## Records (2026-10-10, UAT R3)

| TYPE | DISPLAY_NAME | ID | CREATED_AT | CREATED_VIA | PURPOSE | DEPENDENCIES | CLEANUP_STATUS |
|------|--------------|-----|------------|-------------|---------|--------------|----------------|
| Person | SCE Testspieler 01 | `cmv2m3gep0000eujsih4nx7e8` | 2026-10-10T16:31:47Z | `scripts/match-squad-01a-uat-seed-test-data.ts` | UNKNOWN + OPEN participation | PlayerSquadMember | RETAINED_FOR_01B_TO_01F |
| Person | SCE Testspieler 02 | `cmv2m49rp0002kojsysod8r8l` | 2026-10-10T16:32:25Z | same | AVAILABLE (YES) | PlayerSquadMember | RETAINED_FOR_01B_TO_01F |
| Person | SCE Testspieler 03 | `cmv2m4bgq0006kojs4yjztvhz` | 2026-10-10T16:32:27Z | same | UNAVAILABLE (NO) | PlayerSquadMember | RETAINED_FOR_01B_TO_01F |
| Person | SCE Testspieler 04 | `cmv2m4cta000akojs54x9wcpy` | 2026-10-10T16:32:29Z | same | INJURED roster + UNKNOWN (MAYBE) | PlayerSquadMember | RETAINED_FOR_01B_TO_01F |
| Person | SCE Testspieler 05 | `cmv2m4e5x000ekojs14atmlel` | 2026-10-10T16:32:31Z | same | ABSENT roster + no response | PlayerSquadMember | RETAINED_FOR_01B_TO_01F |
| Person | SCE Testspieler 06 | `cmv2m4f42000gkojsn0owkuy1` | 2026-10-10T16:32:32Z | same | AVAILABLE (YES) | PlayerSquadMember | RETAINED_FOR_01B_TO_01F |
| PlayerSquadMember | SCE Testspieler 01 | `cmv2m3hfb0001eujsv1u6mdox` | 2026-10-10 | `addPlayerToTeamSeason` | Structural ACTIVE | Person above | RETAINED_FOR_01B_TO_01F |
| PlayerSquadMember | SCE Testspieler 02 | `cmv2m4am40003kojsf2bisi68` | 2026-10-10 | same | Structural ACTIVE | Person above | RETAINED_FOR_01B_TO_01F |
| PlayerSquadMember | SCE Testspieler 03 | `cmv2m4c0n0007kojs9esrbswh` | 2026-10-10 | same | Structural ACTIVE | Person above | RETAINED_FOR_01B_TO_01F |
| PlayerSquadMember | SCE Testspieler 04 | `cmv2m4dda000bkojst0vha9p8` | 2026-10-10 | same | Structural INJURED | Person above | RETAINED_FOR_01B_TO_01F |
| PlayerSquadMember | SCE Testspieler 05 | `cmv2m4eps000fkojs5sinpfna` | 2026-10-10 | same | Structural ABSENT | Person above | RETAINED_FOR_01B_TO_01F |
| PlayerSquadMember | SCE Testspieler 06 | `cmv2m4fo2000hkojsujxgutxw` | 2026-10-10 | same | Structural ACTIVE | Person above | RETAINED_FOR_01B_TO_01F |

ParticipationResponse rows for event `cmrzhj3je006a04kwhbepxvdz` were created via `respondToParticipation` (STAFF source) for players 01–04 and 06; player 05 intentionally has no row.

## 01D (2026-10-11)

| Field | Value |
|-------|-------|
| **Package status** | **CLOSED** (PR **#825** → STAGE, 2026-10-11) |
| **New agent-seeded rows** | **None required** — reuse SCE Testspieler 01–06 + PO-created `PlayerRelease` rows from 01C UAT (B1 → B2). |
| **Optional 01D UAT** | Create bounded `PlayerReleaseRequest` via Match Aufgebot UI; tag any agent-created rows here with `CLEANUP_STATUS = RETAINED_FOR_01F`. |
| **Closure cleanup** | **Do not** delete SCE Testspieler 01–06 or bounded fixtures — required for **01E** / **01F**. |

## 01D Human UAT R2 — STAGE preparation (2026-10-11)

| Field | Value |
|-------|-------|
| **Readiness scan** | `scripts/match-squad-01d-r2-uat-readiness.ts` (read-only; fingerprint `acd3b37682911890`) |
| **Bounded fixture** | `scripts/match-squad-01d-r2-uat-stage-fixture.ts` — Junioren **A** trainer for R2 multi-team awareness |
| **A target trainer (fixture)** | Spielbetrieb `Person` `cmuo26ofc000004l6l5ousho7` · `User` `cmuo26owq000104l6p21xdbe5` · `TrainerTeamMember` on Junioren A `cmsoczuce000404jum730xbwu` · `isTrainer=true` |
| **Note on «A2»** | STAGE tenant has **Junioren A**, not a separate «A2» team — R2 second target = Junioren A |
| **Primary activities** | B2 match `cmrzhj6qc006w04kwxd2d01lj` (2026-10-18 15:00) · Junioren A match `cmuk7th5s004z04kxj153wp33` (2026-10-18 20:00) |
| **Controlled players** | SCE Testspieler **01** + **06** |
| **Initial state** | 0 active `PlayerRelease` rows for 01/06 × above events (fixture revokes controlled rows only) |
| **B2 target trainer** | Unchanged R1 — Patrick Scotton on B2 |
| **CLEANUP_STATUS** | Fixture rows `RETAINED_FOR_01F` |

## 01D Human UAT R1 — STAGE preparation (2026-10-11)

| Field | Value |
|-------|-------|
| **STAGE migrations** | `20261011120000_match_squad_player_availability_01d_release_request` + `20261011130000_match_squad_player_availability_01d_r1_target_awareness` applied via guarded `db:migrate:deploy-if-enabled` (fingerprint `acd3b37682911890`; **no manual DDL**; **PROD untouched**) |
| **Schema** | `PlayerReleaseRequest` + `NotificationType.PLAYER_RELEASE_TARGETED` verified on shared STAGE Neon |
| **UAT actors (fixture)** | **Source:** FC Allschwil Club Admin (`Person` `cmsnqz0qz000004l8g2efoyhw`, `TrainerTeamMember` on B1 `cmsoczv2t000504juhvod5hi9`). **Target:** Patrick Scotton (`Person` `cmuo3i77h000g04ibl09t7t2p`, `TrainerTeamMember` on B2 `cmsoczvt0000604ju1f1eindm`; `isTrainer` set for roster eligibility). **Second B2 trainer user:** none on STAGE — multi-recipient Human UAT limited to one account (automated tests cover trainer-team expansion). |
| **Controlled players** | SCE Testspieler **01** (straightforward), **06** (Spielpraxis/Entwicklung), **04** (Kaderausgleich + max. 30 Min.) — all on B1 roster |
| **Target match (primary)** | `cmrzhj6qc006w04kwxd2d01lj` — 2026-10-18 vs BSC Old Boys B2 — route `/dashboard/matchcenter/cmrzhj6qc006w04kwxd2d01lj` |
| **Initial state reset** | Revoked legacy 01C UAT `PlayerRelease` rows `cmv2vqa3e000006l845zu5kkx`, `cmv2wc7nt000006jvk1sb3443` (Testspieler 01/02 → B2). **No** pre-created final 01D releases — PO creates three releases in UI. |
| **Scripts** | Read-only inventory: `scripts/match-squad-01d-uat-preflight-readonly.ts` · bounded fixture: `scripts/match-squad-01d-uat-stage-fixture.ts` |
| **FINAL_PARENT_REQUIREMENT** | `TEST_DATA_REMAINING = 0` still deferred to **01F** |

## 01B Human UAT R2.2 (2026-10-10)

| Field | Value |
|-------|-------|
| **PO result** | **PASS** |
| **Controlled match** | `cmrzhj3je006a04kwhbepxvdz` |
| **01B slice status** | **CLOSED** (PR **#821**) |

Some retained UAT `ParticipationResponse` rows may still carry **historical** `responseSource = TRAINER` or `STAFF` from superseded 01B UAT iterations (proxy recording). **Do not SQL-rewrite** for prettier screenshots. Match Squad UI shows canonical status only (Verfügbar / Nicht verfügbar / Unsicher / Offen). **FINAL_MODULE_CLEANUP_REQUIRED:** `TEST_DATA_REMAINING = 0` at parent module closure (unchanged).

**FINAL_MODULE_CLEANUP_REQUIRED:** remove Persons + squad memberships + module-created participation rows; never remove real FC Allschwil roster data.

## 01B Human UAT R1 (2026-10-10)

Controlled match `cmrzhj3je006a04kwhbepxvdz` may show **KEINE ANFRAGE** while `ParticipationResponse` rows from earlier 01A/UAT seeding remain. That is intentional test history: responses are valid without an active request (offline/historical). Do not delete UAT responses to clean screenshots.

## 01B notes (2026-10-10)

| Field | Value |
|-------|-------|
| **Module slice** | 01B availability collection UX |
| **New persistent records** | None required — reuses existing ParticipationResponse + Event deadline fields |
| **UAT match** | `cmrzhj3je006a04kwhbepxvdz` (configure `participationResponseDueAt` for request-active UAT) |
| **LEDGER update** | No new Person/Squad rows in 01B code path |
| **01B closure** | **CLOSED** 2026-10-10 — ledger unchanged; fixtures retained for 01C–01F |

## 01C notes (2026-10-10)

| Field | Value |
|-------|-------|
| **Module slice** | 01C Spielerfreigabe foundation |
| **New schema** | `PlayerRelease` (+ enums) — migration `20261010190000_match_squad_player_availability_01c_player_release` |
| **UAT records** | Create via Team Cockpit UI or API on preview — ledger rows added when seeded for Human UAT |
| **Target TeamSeason** | Prefer existing ACTIVE FC Allschwil TeamSeason in Season 2026/2027 (e.g. Junioren B2) — do not fabricate real club data |

## 01C Human UAT R1 — schema blocker (2026-10-10)

| Field | Value |
|-------|-------|
| **Result** | **BLOCKED_BY_SCHEMA** (not a product UX failure) |
| **Observed** | Team Cockpit → Kader → **Spielerfreigaben** showed schema-not-ready copy on PR **#822** Vercel preview |
| **Preview database** | Shared **STAGE** Neon (`SCE_DATA_ENVIRONMENT=STAGE`; preview `DATABASE_URL` fingerprint matches `STAGE_DB_URL`) |
| **Root cause** | Migration `20261010190000_match_squad_player_availability_01c_player_release` was **pending** on STAGE (preview builds do not apply migrations) |
| **PROD** | Not involved |

## 01C Human UAT R1.1 — STAGE migration remediation (2026-10-10)

| Field | Value |
|-------|-------|
| **Result** | **READY_FOR_RETEST** |
| **Applied to** | Shared STAGE database (Neon `neondb`, FC Allschwil STAGE cluster) |
| **Workflow** | `APP_ENV=stage NODE_ENV=production APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled` with STAGE `DATABASE_URL` / `DIRECT_URL` |
| **Manual DDL** | **No** |
| **PlayerRelease rows created by agent** | **None** — PO creates releases during Human UAT R1.1 |
| **SCE Testspieler 01–06** | Unchanged controlled fixtures (`RETAINED_FOR_01B_TO_01F`) |
| **Resolved UAT target (STAGE data)** | **FC Allschwil Junioren B2** · `teamSeasonId=cmsoczvt0000604ju1f1eindm` · `teamId=cmrkh1mo4000k04ju4c4302w9` (Season 2026/2027, ACTIVE) |
| **FINAL_PARENT_REQUIREMENT** | `TEST_DATA_REMAINING = 0` at parent module closure — **not cleaned now** |

## 01C Human UAT R2 — refinements (2026-10-10)

| Field | Value |
|-------|-------|
| **Result** | **READY_FOR_UAT** on PR **#822** |
| **R1.1 PO** | Core create/edit/revoke accepted; toggle + eligibility picker + activity-context release required |
| **Migration** | `20261010210000_match_squad_player_availability_01c_r2_activity_scope` (`scope`, `eventId`, `trainingSessionId`) applied to shared STAGE |
| **UAT fixtures** | Unchanged — source B1 `cmsoczv2t000504juhvod5hi9`, players SCE Testspieler 01–06, match `cmrzhj3je006a04kwhbepxvdz` |
| **Agent-seeded PlayerRelease** | **None** — PO-led UAT only |
| **PROD** | Not targeted |

## 01C closure (2026-10-11)

| Field | Value |
|-------|-------|
| **01C slice status** | **CLOSED** (PR **#822** → `STAGE`) |
| **HUMAN_UAT_01C** | **PASS** (final PO sign-off after R3.1 + action-color correction) |
| **01C_CREATED_OR_CHANGED_TEST_FIXTURES** | **None by agent** — controlled SCE Testspieler 01–06 unchanged; any `PlayerRelease` rows from PO Human UAT remain as STAGE UAT history (not ledger-seeded) |
| **RETAINED_FOR** | **01D–01F** development/UAT |
| **FINAL_PARENT_REQUIREMENT** | `TEST_DATA_REMAINING = 0` at `MATCH_SQUAD_PLAYER_AVAILABILITY` parent closure only |
| **PROD** | Not targeted |

## 01A closure (2026-10-10)

| Field | Value |
|-------|-------|
| **01A_TEST_DATA_CLEANUP** | `DEFERRED_INTENTIONALLY` |
| **Reason** | SCE Testspieler 01–06 retained for 01B–01F development and UAT |
| **Parent module** | `TEST_DATA_REMAINING = 0` still required at full `MATCH_SQUAD_PLAYER_AVAILABILITY` closure |
| **Pre-existing FCA data** | Must not be deleted |
