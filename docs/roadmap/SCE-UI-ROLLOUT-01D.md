# SCE-UI-ROLLOUT-01D — Canonical Match Card Family

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-UI-ROLLOUT-01D` |
| **Programme** | [`SCE-UI-ROLLOUT-01+`](./SCE-UI-ROLLOUT-01.md) |
| **Status** | **CLOSED** |
| **Branch** | `cursor/sce-ui-rollout-01d-match-card-family` |
| **PR** | #832 (merged to `STAGE`) |
| **Schema / PROD** | **No changes** |

---

## Closure record

| Field | Value |
|-------|-------|
| **STAGE baseline (01D start)** | `266e4511b0c14f0e3c100ef2cceeb5fe0e40ed32` |
| **Accepted final implementation (R11)** | `817c763e77e6605f333888d3378bf9a2b3fcd452` |
| **PO_VISUAL_UAT** | **PASS** (PO on R11 deployment) |
| **MANUAL_UAT_EXECUTION_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **Automated closure validation** | **PASS** (01D + crest + architecture guardrails; see §7) |
| **Build** | **PASS** (`NODE_OPTIONS=--max-old-space-size=8192 npm run build`) |

**01D closes:** canonical **Match Card family** (`SceMatchCard`), **canonical club crest resolution architecture**, and **consumers legitimately migrated in this package** — not product-wide legacy removal.

---

## 1. Objective

Deliver the canonical **Match visual family** on top of the 01C `SceMatchPresentationModel` — **one identity grammar, four densities**, with semantic lifecycle badges and adoption of direct Match surfaces included in 01D.

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

Identity order **never** changes by density (**HOME left, AWAY right**). Rich density scale is centralized in `match-card-rich-density.ts` (not duplicated per consumer).

---

## 4. Match presentation adoption (01D scope)

| Surface | Classification | Density | Notes |
|---------|----------------|---------|-------|
| `SceMatchCard` / preview gallery | **CANONICAL** | all | `/sce-preview/match-card` |
| Activity Detail MATCH | **CANONICAL** | HERO | `SportingActivityDetailContent` |
| Team → Nächste Spiele | **MIGRATED_01D** | STANDARD | `TeamUpcomingMatchRow` |
| Team → Resultate | **MIGRATED_01D** | COMPACT | `TeamResultRow` |
| Team → Übersicht Nächstes Spiel | **MIGRATED_01D** | COMPACT | `TeamNextMatchSummary` |
| Team → Übersicht Letztes Resultat | **MIGRATED_01D** | COMPACT | `TeamLatestResultSummary` |
| Matchcenter Spielplanung row | **MIGRATED_01D** | COMPACT `list-row` | `SpieleManagementMatchRow` — operational block below card |
| Matchcenter Resultate row | **MIGRATED_01D** | COMPACT | `SpieleManagementResultRow` |
| Wochenplaner match identity (01D) | **MIGRATED_01D** | COMPACT | `WeekplannerMatchIdentityCard` |
| `MatchCard.tsx` (Matchcenter legacy card) | **DEFERRED_01H** | STANDARD | Non-row surfaces |
| Dashboard / Mein Programm today | **DEFERRED_01I** | COMPACT/MICRO | `DashboardTodayEventCards` |
| Team programme / related activity | **DEFERRED_01J** | COMPACT | Broader cockpit adoption |
| Communication / notification refs | **DEFERRED_01K** | MICRO | Inline refs |
| Infoboard match rails | **DEFERRED_01K** | COMPACT | HIGH RISK — loader + kiosk |
| Legacy `SportingTeamLogo` / Rangliste | **DOWNSTREAM** | — | Tracked in legacy register |
| Public / Infoboard compatibility paths | **DOWNSTREAM** | — | Not 01D closure criteria |

**Matchcenter composition:** `SceMatchCard` → operational Matchvorbereitung / open-points block; the card is **not** horizontally compressed by the operational stack.

---

## 5. Canonical club crest architecture (accepted R11)

**Pipeline:**

```text
SOURCE
  → sce-club-crest-resolution.ts (pure resolver)
  → sce-club-visual-identity.ts (server loaders / context)
  → match loaders / externalLogoUrl
  → resolveMatchSideClubLogoUrl
  → ClubIdentity
  → ClubCrest
  → SceMatchCard consumers
```

**Rendering (`ClubCrest`):** real crest = full PNG/image; square layout bounds; `object-contain`; native aspect ratio; **no** circular clipping on real images; **no** avatar pill on real crests; initials/icon **only** when canonical resolution returns no usable asset or image load fails.

Design system reference: [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md) — Match card family + SCE CLUB VISUAL IDENTITY.

---

## 6. Downstream ownership (remaining legacy)

| Legacy register ID | Owner |
|--------------------|-------|
| LEGACY-MATCH-CARD-001 | 01H |
| LEGACY-MATCH-CARD-003 … 004 | 01K |
| LEGACY-MATCH-CARD-005 | 01H |
| LEGACY-MATCH-CARD-007 | 01I |

**Retired / delegating (01D):** LEGACY-MATCH-CARD-002 (Spiele row identity), LEGACY-MATCH-CARD-006 (Team upcoming row — now canonical).

---

## 7. Validation (closure)

Automated suites executed at closure:

- `components/sporting-activity/__tests__/sce-ui-rollout-01d-match-card.test.tsx`
- `components/sporting-activity/__tests__/ClubCrest.test.tsx`
- `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01d-architecture.test.ts`
- `lib/sporting-activity-presentation/canonical/__tests__/match-lifecycle-status.test.ts`
- `lib/sporting-activity-design/__tests__/sce-ui-rollout-01d-r9-crest-parity.test.ts`
- `lib/sporting-activity-design/__tests__/sce-ui-rollout-01d-r10-crest-data-resolution.test.ts`
- `lib/sporting-data/__tests__/sce-club-visual-identity.test.ts`
- `lib/sporting-data/__tests__/match-external-crest-resolution.test.ts`
- Team + Matchcenter integration tests
- `lib/design-system/__tests__/sce-binary-control-standard.test.ts`
- Wochenplaner match presentation guardrails (where present)
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`

---

## 8. Closure criteria

- [x] PO visual sign-off on accepted R11 implementation
- [x] PR #832 merged to `STAGE`
- [x] Roadmap status → **CLOSED**

**NEXT (not started):** [`SCE-UI-ROLLOUT-01E`](./SCE-UI-ROLLOUT-01.md) — Training Card family (branch `cursor/sce-ui-rollout-01e-training-card-family` from post-merge `STAGE`).
