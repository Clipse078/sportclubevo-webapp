# SCE-UI-ROLLOUT-01E — Training Card Family

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-UI-ROLLOUT-01E` |
| **Programme** | [`SCE-UI-ROLLOUT-01+`](./SCE-UI-ROLLOUT-01.md) |
| **Status** | **CLOSED** |
| **Branch** | `cursor/sce-ui-rollout-01e-training-card-family` |
| **PR** | [#833](https://github.com/Clipse078/sportclubevo-webapp/pull/833) → `STAGE` |
| **Schema / PROD** | **No changes** |

---

## Closure record

| Field | Value |
|-------|-------|
| **STAGE baseline (01E start)** | `adca5a59d59a9876b67d574d2fb757626e5e997d` |
| **Accepted final implementation** | `23616fe4b148c2f368ec60e2bd7655a89074dd98` |
| **PO_VISUAL_UAT** | **PO_OWNED** (PO authorized closure without Cursor visual pass) |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **Automated closure validation** | **PASS** (32 targeted tests across 01E + consumer guardrails; see §7) |
| **Build (prior implementation validation)** | **PASS** (`NODE_OPTIONS=--max-old-space-size=8192 npm run build`) |

**01E closes:** canonical **Training Card family** (`SceTrainingCard`), **session vs recurring schedule presentation**, and **representative consumers** in this package — not product-wide legacy removal.

---

## 1. Objective

Deliver the canonical **Training visual family** on top of the 01C `SceTrainingPresentationModel` — **one identity grammar, four densities**, with domain-backed status badges and adoption of direct Training surfaces included in 01E.

---

## 2. Canonical component API

```tsx
<SceTrainingCard
  model={sceTrainingPresentation}
  density="COMPACT"
  fmtCfg={fmtCfg}
  linkToDetail
  surface="list-row"
  showStatus={false}
/>
```

| Export | Location |
|--------|----------|
| `SceTrainingCard` | `components/sporting-activity/SceTrainingCard.tsx` |
| `SceTrainingCardStatus` | `components/sporting-activity/SceTrainingCardStatus.tsx` |
| Rich density scale | `lib/sporting-activity-presentation/canonical/training-card-rich-density.ts` |
| Preview fixtures | `components/sporting-activity/__fixtures__/sce-training-card-fixtures.ts` |

**Model:** `SceTrainingPresentationModel` only — **no parallel Training presentation architecture**.

---

## 3. Densities

| Density | Role |
|---------|------|
| **HERO** | Detail / spotlight |
| **STANDARD** | Programme-style surfaces |
| **COMPACT** | Management list identity (`/dashboard/training`) |
| **MICRO** | Dense planner / calendar cells (future 01H grid) |

---

## 4. Identity & schedule

- **Identity:** `trainingTitle` + optional `team.name` — **no Match semantics** (no VS, home/away pairing, scores).
- **Location:** club/host → venue → resource via `formatSceActivityLocationHierarchy` (missing levels omitted cleanly).
- **Schedule:** `SESSION` uses concrete `startAt`/`endAt`; `RECURRING_DEFINITION` uses weekday rhythm + `timeLabel` / optional `timeDetailLines` — recurring definitions are **not** coerced into fake dated sessions.

---

## 5. Representative consumers (01E)

| Surface | Integration |
|---------|-------------|
| Activity Detail | Training embed via `SceTrainingCard` |
| `/dashboard/training` | `TrainingSeriesManagementRow` — `SceTrainingCard` COMPACT for identity; actions, status, facility, weekday columns unchanged |
| Wochenplaner editor | `WeekplannerTrainingIdentityCard` → `SceTrainingCard` |
| Preview | `/sce-preview/training-card`, `/sce-preview/weekplanner-training` |

**Deferred:** Wochenplaner **grid** still uses `PlanningHubActivityBlock` → **01H** (`WOCHENPLANER_GRID_BROAD_MIGRATION: DEFERRED_TO_01H`).

---

## 6. Legacy / downstream (unchanged boundaries)

Remaining legacy consumers (not closure failures): `PlanningHubActivityBlock`, `TrainingSessionRow`, programme/calendar/dashboard training rows → **01H–01J** per [`SCE-UI-LEGACY-REGISTER`](../design/SCE-UI-LEGACY-REGISTER.md).

---

## 7. Validation (closure)

Automated suites executed at closure (final HEAD = implementation HEAD; no runtime delta):

- `components/sporting-activity/__tests__/sce-ui-rollout-01e-training-card.test.tsx`
- `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01e-architecture.test.ts`
- `components/admin/training/__tests__/TrainingSeriesManagementRow.test.tsx`
- `lib/planning/__tests__/planning-ux-07r8a-wochenplaner-unified-activity-editor.test.ts`

**Result:** 32 tests **PASS** (22 + 10).

Design System contract documented in [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md) (Training Card Family section).

**Toggle First:** `BINARY_CONTROL_COMPLIANCE: PASS` — no new binary checkboxes in 01E sources.

---

## 8. Closure criteria

- [x] PO-owned visual UAT authorization recorded
- [x] Baseline integrity (`adca5a59` → feature branch)
- [x] Automated validation PASS
- [x] PR #833 merged to `STAGE`
- [x] Roadmap status → **CLOSED**

**NEXT (not started):** [`SCE-UI-ROLLOUT-01F`](./SCE-UI-ROLLOUT-01.md) — Tournament Card family (indicative branch `cursor/sce-ui-rollout-01f-tournament-card-family` from post-merge canonical `STAGE`).
