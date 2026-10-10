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

**FINAL_MODULE_CLEANUP_REQUIRED:** remove Persons + squad memberships + module-created participation rows; never remove real FC Allschwil roster data.

## 01B notes (2026-10-10)

| Field | Value |
|-------|-------|
| **Module slice** | 01B availability collection UX |
| **New persistent records** | None required — reuses existing ParticipationResponse + Event deadline fields |
| **UAT match** | `cmrzhj3je006a04kwhbepxvdz` (configure `participationResponseDueAt` for request-active UAT) |
| **LEDGER update** | No new Person/Squad rows in 01B code path |

## 01A closure (2026-10-10)

| Field | Value |
|-------|-------|
| **01A_TEST_DATA_CLEANUP** | `DEFERRED_INTENTIONALLY` |
| **Reason** | SCE Testspieler 01–06 retained for 01B–01F development and UAT |
| **Parent module** | `TEST_DATA_REMAINING = 0` still required at full `MATCH_SQUAD_PLAYER_AVAILABILITY` closure |
| **Pre-existing FCA data** | Must not be deleted |
