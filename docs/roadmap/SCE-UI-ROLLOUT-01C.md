# SCE-UI-ROLLOUT-01C — Universal Activity Presentation Model

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-UI-ROLLOUT-01C` |
| **Programme** | [`SCE-UI-ROLLOUT-01+`](./SCE-UI-ROLLOUT-01.md) |
| **Status** | **CLOSED** |
| **Branch** | `cursor/sce-ui-rollout-01c-universal-activity-presentation` |
| **PR** | [#831](https://github.com/Clipse078/sportclubevo-webapp/pull/831) → `STAGE` |
| **Base** | `STAGE` @ `d7273d9393c4219cc6f6ce3442614db30b576881` |
| **Feature HEAD (pre-merge)** | `49b1a8cc461711893f338a8be5b0783680aefeb2` |
| **Schema / PROD** | **No changes** |

---

## 1. Objective

Establish the **canonical typed presentation contract** and resolver/adapters for MATCH, TRAINING, TOURNAMENT, and CLUB_EVENT — without broad card UI migration (01D–01G).

---

## 2. Canonical TypeScript model

| Export | Module |
|--------|--------|
| `SceActivityPresentationModel` | `lib/sporting-activity-presentation/canonical/types.ts` |
| `resolveSceActivityPresentation` | `lib/sporting-activity-presentation/canonical/resolve.ts` |
| Activity Detail bridge | `lib/sporting-activity-detail/resolve-canonical-presentation.ts` |

Discriminants: `MATCH` | `TRAINING` | `TOURNAMENT` | `CLUB_EVENT` (maps legacy `EVENT` → `CLUB_EVENT`).

Shared dimensions: `activityId`, `resourceKey`, `typeLabel`, `schedule`, `location`, `status`, `route`.

---

## 3. Identity contracts

| Kind | Contract |
|------|----------|
| **MATCH** | `fixture.home` / `fixture.away` (`ClubIdentity`) — **home left, away right** via `buildMatchClubIdentityPair`; `homeLeftAwayRightInvariant: true` |
| **TRAINING** | `trainingTitle` + optional `team`; location hierarchy via `formatSceActivityLocationHierarchy` |
| **TOURNAMENT** | `tournamentTitle` + `organiser` (`buildTournamentOrganiserClubIdentity`); optional `hauptteam` |
| **CLUB_EVENT** | `eventTitle` + optional `organiser`; no required team |

---

## 4. Adapters

| Kind | Entry |
|------|--------|
| MATCH | `resolveSceMatchPresentation({ match, tenantLogoUrl, … })` |
| TRAINING | `resolveSceTrainingPresentationFromLegacy(SportingActivityPresentation)` |
| TOURNAMENT | `resolveSceTournamentPresentation({ tournament, tenantClubName })` |
| CLUB_EVENT | `resolveSceClubEventPresentationFromLegacy(SportingActivityPresentation)` |

Legacy serializable `SportingActivityPresentation` remains for programme embedding; **MATCH/TOURNAMENT** canonical resolution requires domain summaries (no fixture guessing from strings).

---

## 5. Density contract

`SCE_ACTIVITY_DENSITY_CONTRACT` — HERO / STANDARD / COMPACT / MICRO dimension policies in `canonical/density.ts`. Maps existing `SportingActivityDensity` via `mapSportingActivityDensityToSceDensity`.

---

## 6. Infoboard gap (01K owner)

| Need | Current state | Owner |
|------|---------------|-------|
| Fixture-authoritative `MatchClubIdentityPair` on kiosk payloads | Loader can set `matchPresentation`; fallback branch still HIGH RISK | **01D + 01K** |
| Canonical model capability | **Ready** — `resolveSceMatchPresentation` supplies home/away identities | 01C |

Do **not** mark Infoboard legacy rows migrated in this package.

---

## 7. Downstream migration (deferred)

| Package | Scope |
|---------|--------|
| **01D–01G** | Visual card families consuming `SceActivityPresentationModel` |
| **01H–01L** | Surface adoption (Matchcenter, Dashboard, Infoboard, …) |
| **01N** | Retire duplicate formatters listed in legacy register |

---

## 8. Validation

- `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01c-presentation-model.test.ts`
- `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01c-architecture.test.ts`
- Existing `sporting-activity-presentation` + match identity regression suites

---

## 9. SCE design system compliance

| Field | Value |
|-------|-------|
| `CANONICAL_ACTIVITY_MODEL_USED` | **YES** — `SceActivityPresentationModel` |
| `PARALLEL_PRESENTATION_MODEL_INTRODUCED` | **NO** |
| `NEW_BINARY_CHECKBOXES` | **0** |
| `BINARY_CONTROL_COMPLIANCE` | **PASS** |
| **RESULT** | **PASS** |

---

**NEXT programme package after closure:** [`SCE-UI-ROLLOUT-01D`](./SCE-UI-ROLLOUT-01.md) — Canonical Match Card family.

---

## 10. Closure evidence (2026-10-12)

| Gate | Result |
|------|--------|
| IMPLEMENTATION | **PASS** |
| AUTOMATED_VALIDATION | **PASS** — 20 canonical tests; 112 sporting-activity / design / detail regressions |
| BUILD | **PASS** — `NODE_OPTIONS=--max-old-space-size=8192 npm run build` |
| HUMAN_UAT | **NOT_REQUIRED** — `VISIBLE_UI_CHANGE = NO` |
| CI (PR #831) | **PASS** — Vercel, Vercel Preview Comments |
| SCE_DESIGN_SYSTEM_COMPLIANCE | **PASS** |
| PR #831 merged | **YES** @ `2026-10-12T07:47:18Z` — merge commit `bed933f151199c586a3121a200689b122ec1f1f9` |
| Canonical `STAGE` | `bed933f151199c586a3121a200689b122ec1f1f9` |

Repository-wide `tsc --noEmit` reports **pre-existing** failures (including `scripts/__tests__/*` TS2339/TS2783 and unrelated app test fixtures). **01C production modules** typecheck via Next.js build; no new production TypeScript errors attributable to 01C scope.
