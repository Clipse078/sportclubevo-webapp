# SCE-UI-ROLLOUT-01D — Canonical Match Card Family

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-UI-ROLLOUT-01D` |
| **Programme** | [`SCE-UI-ROLLOUT-01+`](./SCE-UI-ROLLOUT-01.md) |
| **Status** | **R4 IMPLEMENTATION / PO VISUAL UAT PENDING** |
| **Branch** | `cursor/sce-ui-rollout-01d-match-card-family` |
| **PR** | #832 |
| **Schema / PROD** | **No changes** |

---

## 1. Objective

Deliver the canonical **Match visual family** on top of the 01C `SceMatchPresentationModel` — **one identity grammar, four densities**, with semantic lifecycle badges and product-wide adoption of direct Match surfaces listed in R4.

---

## 2. Canonical component API

```tsx
<SceMatchCard
  model={sceMatchPresentation}
  density="STANDARD"
  fmtCfg={fmtCfg}
  linkToDetail
  surface="standalone"
/>
```

| Export | Location |
|--------|----------|
| `SceMatchCard` | `components/sporting-activity/SceMatchCard.tsx` |
| Lifecycle badges | `resolveSceMatchLifecycleStatus` |
| Context badges | `match-context-badges.ts` (Heim/Auswärts, Sieg/Unentschieden/Niederlage) |
| Preview fixtures | `components/sporting-activity/__fixtures__/sce-match-card-fixtures.ts` |

---

## 3. Densities

| Density | Role |
|---------|------|
| **HERO** | Prominent fixture identity, balanced crests, result/status |
| **STANDARD** | Default rich cards / Team → Nächste Spiele grid |
| **COMPACT** | Dense lists — Team Resultate, Matchcenter rows, Team Übersicht tiles |
| **MICRO** | Constrained horizontal identity (preview / narrow embeds) |

Identity order **never** changes by density (HOME left, AWAY right).

---

## 4. R4 Match presentation adoption matrix

| Surface | Classification | Density | Notes |
|---------|----------------|---------|-------|
| `SceMatchCard` / preview gallery | **CANONICAL_ALREADY** | all | `/sce-preview/match-card` |
| Activity Detail MATCH | **CANONICAL_ALREADY** | HERO | `SportingActivityDetailContent` |
| Team → Nächste Spiele | **MIGRATED_R4** (revalidated) | STANDARD | `TeamUpcomingMatchRow` |
| Team → Resultate | **MIGRATED_R4** | COMPACT | `TeamResultRow` |
| Team → Übersicht Nächstes Spiel | **MIGRATED_R4** | COMPACT | `TeamNextMatchSummary` |
| Team → Übersicht Letztes Resultat | **MIGRATED_R4** | COMPACT | `TeamLatestResultSummary` |
| Matchcenter Spielplanung row | **MIGRATED_R4** | COMPACT `list-row` | `SpieleManagementMatchRow` — operational readiness unchanged |
| `MatchCard.tsx` (Matchcenter legacy card) | **DEFERRED_01H** | STANDARD | Non-row surfaces |
| Wochenplaner match blocks | **DEFERRED_01H** | COMPACT | `WeekplannerMatchIdentityCard` |
| Dashboard / Mein Programm today | **DEFERRED_01I** | COMPACT/MICRO | `DashboardTodayEventCards` |
| Team programme / related activity | **DEFERRED_01J** | COMPACT | Broader cockpit adoption |
| Communication / notification refs | **DEFERRED_01K** | MICRO | Inline refs |
| Infoboard match rails | **DEFERRED_01K** | COMPACT | HIGH RISK — loader + kiosk |
| `SpieleManagementMatchIdentity` | **LEGITIMATE_NON_VISUAL** | — | Retained for non-row tooling/tests until 01H retires imports |
| Domain/query `home`/`away` fields | **LEGITIMATE_NON_VISUAL** | — | Data layer only |

---

## 5. Visual UAT evidence

| Asset | Location |
|-------|----------|
| Preview route | `/sce-preview/match-card` |
| Team preview | `/sce-preview/team-next-matches` |
| Product routes | Team Spiele / Resultate / Übersicht, Matchcenter Spielplanung |
| Automated coverage | 01D + Team + Matchcenter row tests (see §8) |

**PO_VISUAL_UAT:** **PENDING** — PO sign-off on gallery **and** four migrated product surfaces.

---

## 6. Downstream ownership (unchanged deferrals)

| Legacy register ID | Owner |
|--------------------|-------|
| LEGACY-MATCH-CARD-001 | 01H |
| LEGACY-MATCH-CARD-003 … 004 | 01K |
| LEGACY-MATCH-CARD-005 | 01H |
| LEGACY-MATCH-CARD-007 | 01I |

**Retired / delegating (R4):** LEGACY-MATCH-CARD-002 (Spiele row identity), LEGACY-MATCH-CARD-006 (Team upcoming row — now canonical).

---

## 7. Validation

- `components/sporting-activity/__tests__/sce-ui-rollout-01d-match-card.test.tsx`
- `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01d-architecture.test.ts`
- `lib/sporting-activity-presentation/canonical/__tests__/match-lifecycle-status.test.ts`
- Team + Matchcenter integration tests
- 01C presentation regression tests
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`

---

## 8. Closure criteria (PO)

- [ ] PO visual sign-off on HERO / STANDARD / COMPACT / MICRO + R4 product surfaces
- [ ] PR #832 merged to `STAGE`
- [ ] Roadmap status → **CLOSED**

**NEXT after closure:** [`SCE-UI-ROLLOUT-01E`](./SCE-UI-ROLLOUT-01.md) — Training Card family.
