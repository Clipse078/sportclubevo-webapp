# DASHBOARD-07R1D — Personal Trainings in Mein Programm + Mein Kalender

**Branch:** `cursor/dashboard-d-personal-workspace-discovery`  
**PR:** #706 (base `STAGE`, **do not merge** until DASHBOARD-07R2 human acceptance)  
**Predecessor:** DASHBOARD-07R1C (strict TeamSeason relevance for Event-backed MATCH/TOURNAMENT)

---

## Human acceptance finding

After R1C, Mein Kalender no longer shows unrelated SFV null-`teamSeasonId` matches. F2 tournaments (including 27 Sep Blitzturnier, orange) remain correct.

**Gap:** Recurring team trainings for personally relevant teams (e.g. Junioren F2 trainer) did not appear in Mein Programm or Mein Kalender.

Principle unchanged: **relationship establishes relevance; domain authorization establishes visibility.**

---

## Canonical training data model

| Question | Answer |
|----------|--------|
| Representation | **`TrainingSession`** rows generated from **`TrainingSeries`** (TRAININGCENTER-02) |
| Occurrences | Materialized DB rows (`@@unique([trainingSeriesId, date])`), not legacy `Event` type `TRAINING` |
| Team scope | Denormalized **`teamSeasonId`** on each session (always set) |
| Public flags | No `websiteVisible` / infoboard gate on sessions — personal dashboard must not use publication flags as authorization |

Legacy `Event(TRAINING)` rows are **not** the canonical personal training source after TRAININGCENTER-02.

---

## Root cause

1. `loadPersonalProgramme()` only merged **Event** rows via `loadTeamEventProgrammeItems()` and **meetings**.
2. Canonical trainings live in **`TrainingSession`**, read via `listTrainingSessions()` elsewhere (Weekplanner, Infoboard, Training Center).
3. Unit tests mocked `Event(TRAINING)` without `teamSeasonId`, masking R1C relevance gates; they did not reflect STAGE data shape.

**Exact filter failure:** trainings never entered the programme universe — not filtered out late, but **never loaded**.

---

## Fix (one programme universe)

```
loadPersonalProgramme()
  ├── loadTeamEventProgrammeItems()   → MATCH, TOURNAMENT, OTHER (events only)
  ├── loadTrainingProgrammeItems()    → TrainingSession (NEW)
  └── loadMeetingProgrammeItems()
```

- **Relevance:** `isPersonalTrainingSessionRowRelevant()` — sporting relationship + aligned `teamSeasonId` (same philosophy as R1C, training-specific row shape).
- **Authorization:** `canIncludeTrainingSessionInPersonalProjection()` — `trainings.view` / manage / events / wochenplan manage (mirrors event TRAINING gates); **no** publication flags.
- **Presentation:** `sourceType: TRAINING` → `getProgrammeSourcePresentation()` **training-blue** (programme + calendar).
- **Deep link:** `/dashboard/training/sessions/{id}/edit`
- **Ids:** `training-session:{id}` (distinct from `event:{id}`)

`loadPersonalCalendarEntryProjections()` uses the same training adapter for legacy agenda parity.

---

## Source-aware TeamSeason semantics (R1C preserved)

| Source | Relevance contract |
|--------|-------------------|
| MATCH / TOURNAMENT / OTHER `Event` | Strict `teamId` + `teamSeasonId` alignment (R1C — no null-`teamSeasonId` bypass) |
| `TrainingSession` | Strict personal **`teamSeasonId`** scope (always present on row) |

SFV null-`teamSeasonId` false positives remain excluded.

---

## Performance

- One batched `listTrainingSessions(tenantId, { teamSeasonIds, dateFrom, dateTo })` per programme load.
- No per-team loop, no per-day queries, no second calendar loader.
- Date bounds derived from merged dashboard range via `resolveTrainingSessionDateBoundsForProgrammeRange()`.

---

## STAGE forensics (read-only)

Script: `scripts/dashboard-07r1d-stage-forensics-readonly.ts`

Expected identity: host fragment `ep-wispy-hall-aso93dy6`, database `neondb`, fingerprint `acd3b37682911890`, **STAGE_WRITE = NO**.

Reference actor: tenant `fc-allschwil`, user resolved by email `it@fcallschwil.ch` (IDs only in script output).

Forensic reference dates (not hard-coded in product logic): Mon 21 / Wed 23 Sep 2026 and Mon 28 / Wed 30 Sep 2026.

Cloud agent environment: if `DATABASE_URL` is unset, run forensics on STAGE locally before R2 sign-off.

---

## Security / regression tests

Suite: `lib/personal-agenda/__tests__/dashboard-07r1d-personal-training.test.ts`

Covers personal vs unrelated training, permission-only actors, multi-team union, removed relationship, cross-tenant, calendar/programme parity, R1C SFV protection, Sep 27 Blitzturnier coexistence.

---

## Database safety

No schema change. No migration. No STAGE writes.

---

## Remaining human acceptance (DASHBOARD-07R2)

Visual recheck on STAGE preview:

- F2 Mon/Wed trainings visible in Mein Programm and Mein Kalender (blue).
- 27 Sep Blitzturnier still orange.
- No SFV false-positive flood.
- Quick access, attention, tasks unchanged.

**Dashboard is not closed in R1D.**
