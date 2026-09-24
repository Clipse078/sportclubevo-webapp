# DASHBOARD-07R1C — STAGE Personal Calendar Forensics

**Branch:** `cursor/dashboard-d-personal-workspace-discovery`  
**Base:** `STAGE`  
**PR:** #706  

---

## R1B human acceptance failure

Automated R1B tests passed, but authenticated visual review on STAGE (24 Sep 2026) showed **Mein Kalender** still occupied on multiple September dates while **Mein Programm** correctly surfaced only the F2 **Blitzturnier** (27 Sep). Club-wide / non-personal markers must not appear in the personal calendar universe.

---

## STAGE database identity (read-only)

| Field | Value |
|-------|--------|
| Host fragment | `ep-wispy-hall-aso93dy6` |
| Database | `neondb` |
| Fingerprint | `acd3b37682911890` |
| Environment | STAGE |

Script: `npx tsx scripts/dashboard-07r1c-stage-forensics-readonly.ts` (requires STAGE `DATABASE_URL`).

---

## Actor relationship graph (no PII)

Reference tenant: `fc-allschwil`. Session resolved via `User` → `TenantMembership` → `Person.userId`.

| Entity | Id |
|--------|-----|
| Tenant | `cmomwboak0000tsf3zzivrs46` |
| User | `cmsfzrets001bzsf3m46svf5q` |
| Person | `cmsnqz0qz000004l8g2efoyhw` |
| TenantMembership | `cmsfzreui001czsf3zbl5wz18` |

**Sporting relationships (STAGE data):**

| Team | Source | functionKey | seasonId on assignment | Resolved TeamSeason |
|------|--------|-------------|------------------------|---------------------|
| Junioren F2 | PersonAssignment | TRAINER | null → active season | `cmso877ve000704joqnd1hhbg` |
| Senioren 40+ | PersonAssignment | SPIELER | Season 2026/2027 | `cmsod03tv000h04juo7wyen7w` |

No active `TrainerTeamMember` / `PlayerSquadMember` rows for this person on STAGE.

---

## September forensic table (before fix)

| Date | Source | Event id | Team | teamSeasonId on event | Why included (buggy loader) |
|------|--------|----------|------|------------------------|-----------------------------|
| 2026-09-04 | MATCH | `cmrzhidq1002404kwmko3i6yw` | Senioren 40+ | **null** (SFV) | PersonAssignment SPIELER + empty `teamSeasonIds` → season gate skipped |
| 2026-09-06 | TOURNAMENT | `cmsutrvep000j04l4bvz5k6y2` | Junioren F2 | `cmso877ve…` | PersonAssignment TRAINER, no resolved season scope |
| 2026-09-11 | MATCH | `cmrkh1yqz002e04ju6wqpq0qz` | Senioren 40+ | **null** | Same as 04 Sep |
| 2026-09-12 | TOURNAMENT | `cmsutt8wj000m04l4aks5fnwi` | Junioren F2 | `cmso877ve…` | Same as 06 Sep |
| 2026-09-18 | MATCH | `cmrzhinl3003o04kwfp6notbf` | Senioren 40+ | **null** | Same as 04 Sep |
| 2026-09-23 | MATCH | `cmrzhissy004k04kw30vjm5om` | Senioren 40+ | **null** | Same as 04 Sep |
| 2026-09-27 | TOURNAMENT | `cmubno26b000104jpuejtclwb` | Junioren F2 | `cmso877ve…` | Expected personal F2 trainer scope |

---

## Root cause

| Topic | Finding |
|-------|---------|
| R1B assumption | Aligning `teamSeasonId` on **trainer/squad** rows would narrow false positives. |
| Actual cause | STAGE actor relies on **PersonAssignment** only. Assignments did not populate `teamSeasonIds`; relevance treated empty `teamSeasonIds` as “allow any season / null teamSeasonId”. Adapter query OR-branch included `{ teamSeasonId: null, teamId ∈ personal teams }`, pulling SFV matches. |
| False-positive key | **`teamId` match + `event.teamSeasonId === null`** while personal scope was season-scoped (or should have been). |
| Why tests missed it | Mocks used squad/trainer `teamSeasonIds` and never reproduced **PersonAssignment-only** + **SFV null teamSeasonId** structure. |

---

## Canonical fix

1. **`mergeSportingAssignmentTeamSeasonScopes`** — resolve `TeamSeason` from `PersonAssignment.seasonId` or active season when seasonless sporting assignment.
2. **Sporting kinds** — TRAINER/PLAYER from assignment function groups; org-only assignments stay label-only.
3. **`isPersonalTeamEventRowRelevant`** — require sporting kind; **`event.teamSeasonId` must match** resolved personal `teamSeasonIds`; **null event teamSeasonId → not personal**.
4. **Adapter query** — `teamSeasonId IN personal teamSeasonIds` only (no null OR-branch).

No FCA / actor / date hard-coding.

---

## After fix — loader projection (STAGE, September 2026)

| Date | Personal? | Notes |
|------|-----------|--------|
| 04 / 11 / 18 / 23 Sep | **No** | SFV matches excluded (null teamSeasonId) |
| 06 / 12 Sep | **Yes** | F2 TRAINER + aligned TeamSeason — same relationship as 27 Sep |
| 27 Sep Blitzturnier | **Yes** | Orange TOURNAMENT marker preserved |

**Product note:** 06 / 12 remain personal under the canonical sporting-assignment contract. If acceptance requires hiding them while keeping 27 Sep, that needs an explicit product rule beyond team/season scope.

---

## Regression condition (mandatory test)

`lib/personal-agenda/__tests__/dashboard-07r1c-stage-root-cause.test.ts` — PersonAssignment-only actor, SFV match `teamSeasonId: null` absent; F2 Blitzturnier with aligned TeamSeason present.

---

## Zero disclosure

Unchanged: relevance then authorization; unauthorized rows omitted from `PersonalProgrammeItem[]`; calendar projects the same universe.

---

## Status

**DASHBOARD-07R1C** engineering complete on STAGE read-only evidence. **DASHBOARD-07R2** requires human visual recheck (especially 06 / 12 Sep if product wants them hidden).
