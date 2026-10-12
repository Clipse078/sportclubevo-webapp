# SCE-UI-ROLLOUT-01F — Tournament Card Family

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-UI-ROLLOUT-01F` |
| **Programme** | [`SCE-UI-ROLLOUT-01+`](./SCE-UI-ROLLOUT-01.md) |
| **Status** | **IMPLEMENTED / PO UAT PENDING** |
| **Branch** | `cursor/sce-ui-rollout-01f-tournament-card-family` |
| **PR** | Draft → `STAGE` |
| **Schema / PROD** | **No changes** |

---

## Implementation record

| Field | Value |
|-------|-------|
| **STAGE baseline (01F start)** | `b9e1bf1bd5761fb659a21d61c533418ae133c16b` |
| **PO_VISUAL_UAT** | **PENDING_PO** |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |

**01F delivers:** canonical **Tournament Card family** (`SceTournamentCard`), **organiser visibility invariant**, and **representative consumers** in this package — not product-wide legacy removal.

---

## 1. Objective

Deliver the canonical **Tournament visual family** on top of the 01C `SceTournamentPresentationModel` — **one identity grammar, four densities**, with organiser and Hauptteam kept distinct and **no Match semantics**.

---

## 2. Canonical component API

```tsx
<SceTournamentCard
  model={sceTournamentPresentation}
  density="COMPACT"
  fmtCfg={fmtCfg}
  linkToDetail
  surface="list-row"
  showStatus={false}
/>
```

| Export | Location |
|--------|----------|
| `SceTournamentCard` | `components/sporting-activity/SceTournamentCard.tsx` |
| `SceTournamentCardStatus` | `components/sporting-activity/SceTournamentCardStatus.tsx` |
| Rich density scale | `lib/sporting-activity-presentation/canonical/tournament-card-rich-density.ts` |
| Preview fixtures | `components/sporting-activity/__fixtures__/sce-tournament-card-fixtures.ts` |

**Model:** `SceTournamentPresentationModel` only — **no parallel Tournament presentation architecture**.

---

## 3. Densities

| Density | Role |
|---------|------|
| **HERO** | Detail / spotlight |
| **STANDARD** | Programme-style surfaces |
| **COMPACT** | Tournamentcenter list identity |
| **MICRO** | Dense planner / calendar cells (future 01H grid) |

---

## 4. Identity & schedule

- **Identity:** `tournamentTitle` + **organiser** + optional `hauptteam.name` — **no Match semantics**.
- **Organiser invariant:** visible at all densities when data exists (MICRO: dedicated organiser line).
- **Location:** venue → resource on card; organiser omitted from location line to prevent duplication.
- **Schedule:** domain `startAt` / `endAt` (and `allDay` when present).

---

## 5. Representative consumers (01F)

| Surface | Integration |
|---------|-------------|
| Activity Detail | Tournament embed via `SceTournamentCard` HERO |
| `/dashboard/tournamentcenter` | `TurniereManagementRow` — `SceTournamentCard` COMPACT; operational columns unchanged |
| Wochenplaner editor | `WeekplannerTournamentIdentityCard` → `SceTournamentCard` |
| Preview | `/sce-preview/tournament-card`, `/sce-preview/weekplanner-tournament` |

**Deferred:** Wochenplaner **grid**, Dashboard/Mein Programm, Infoboard tournament tiles → **01H–01K** per legacy register.

---

## 6. Validation (implementation)

Automated suites (see PR):

- `components/sporting-activity/__tests__/sce-ui-rollout-01f-tournament-card.test.tsx`
- `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01f-architecture.test.ts`
- `components/admin/tournamentcenter/__tests__/TurniereManagementRow.presentation.test.tsx`

Design System contract: [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md) (Tournament Card Family section).

**Toggle First:** no new binary checkboxes in 01F sources.

---

## 7. Closure criteria (PO)

- [ ] PO visual UAT on STAGE deployment
- [x] Baseline integrity (`b9e1bf1b` → feature branch)
- [ ] Automated validation PASS (CI)
- [ ] PR merged to `STAGE`
- [ ] Roadmap status → **CLOSED**

**NEXT (not started):** [`SCE-UI-ROLLOUT-01G`](./SCE-UI-ROLLOUT-01.md) — Club Event Card family.
