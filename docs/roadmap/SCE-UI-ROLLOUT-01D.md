# SCE-UI-ROLLOUT-01D — Canonical Match Card Family

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-UI-ROLLOUT-01D` |
| **Programme** | [`SCE-UI-ROLLOUT-01+`](./SCE-UI-ROLLOUT-01.md) |
| **Status** | **IMPLEMENTATION COMPLETE / PO VISUAL UAT PENDING** |
| **Branch** | `cursor/sce-ui-rollout-01d-match-card-family` |
| **Base** | `STAGE` @ `266e4511b0c14f0e3c100ef2cceeb5fe0e40ed32` |
| **Schema / PROD** | **No changes** |

---

## 1. Objective

Deliver the canonical **Match visual family** on top of the 01C `SceMatchPresentationModel` — **one identity grammar, four densities**, without broad product migration.

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
| Density policy helpers | `lib/sporting-activity-presentation/canonical/match-card-policy.ts` |
| Preview fixtures | `components/sporting-activity/__fixtures__/sce-match-card-fixtures.ts` |

---

## 3. Densities

| Density | Role |
|---------|------|
| **HERO** | Prominent fixture identity, balanced crests, result/status |
| **STANDARD** | Default rich lists / planning-adjacent surfaces |
| **COMPACT** | Dense programmes — retains home/away grammar |
| **MICRO** | Text-first fixture line; crests hidden per contract |

Identity order **never** changes by density.

---

## 4. Representative integration

| Surface | Path | Notes |
|---------|------|-------|
| Activity Detail (MATCH) | `SportingActivityDetailContent` | HERO + `detail-embed`; uses `detail.match.scePresentation` when loaded |
| Team → Nächste Spiele | `/dashboard/teams/[teamId]/spiele` | COMPACT `SceMatchCard` via `TeamCockpitMatch.scePresentation` |
| Server bridge | `loadMatchActivityDetail` / `getTeamCockpitSportingData` | `resolveSceMatchPresentation` / `resolveTeamCockpitMatchPresentation` |

**Not migrated in 01D:** Matchcenter `MatchCard.tsx`, Dashboard today cards, Wochenplaner, Infoboard, Team Resultate (see legacy register).

---

## 5. Infoboard (HIGH RISK deferral)

Canonical `SceMatchCard` supports fixture-authoritative HOME/AWAY grammar. **Broad Infoboard migration remains 01D+01K** — kiosk loaders must continue supplying `matchPresentation`; wrappers must consume 01C identity, not reconstruct sides.

---

## 6. Visual UAT evidence

| Asset | Location |
|-------|----------|
| Preview route | `/sce-preview/match-card` |
| Real product route | `/dashboard/teams/[teamId]/spiele` (Team → Nächste Spiele) |
| Automated render coverage | `components/sporting-activity/__tests__/sce-ui-rollout-01d-match-card.test.tsx`, `components/admin/teams/upcoming-matches/__tests__/TeamUpcomingMatchesView.test.tsx` |
| PO screenshots | Gallery **and** Team → Nächste Spiele (artifacts under `/opt/cursor/artifacts/` when recorded) |

**PO_VISUAL_UAT:** **PENDING** — PO must sign off on **both** the preview gallery and Team → Nächste Spiele; do not merge until accepted.

---

## 7. Downstream ownership

| Legacy register ID | Owner |
|--------------------|-------|
| LEGACY-MATCH-CARD-001 … 002 | 01H (Matchcenter / Spiele rows) |
| LEGACY-MATCH-CARD-003 … 004 | 01K + Infoboard loader |
| LEGACY-MATCH-CARD-005 | 01H |
| LEGACY-MATCH-CARD-006 | 01J |
| LEGACY-MATCH-CARD-007 | 01I |

---

## 8. Validation

- Match card + architecture guardrail tests (01D)
- Existing 01C presentation tests (regression)
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`

---

## 9. Closure criteria (PO)

- [ ] PO visual sign-off on HERO / STANDARD / COMPACT / MICRO + narrow width
- [ ] PR merged to `STAGE`
- [ ] Roadmap status → **CLOSED**

**NEXT after closure:** [`SCE-UI-ROLLOUT-01E`](./SCE-UI-ROLLOUT-01.md) — Training Card family.
