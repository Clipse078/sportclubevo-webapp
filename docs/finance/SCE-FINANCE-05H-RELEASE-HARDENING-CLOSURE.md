# SCE-FINANCE-05H — Release Hardening & FIN-05 Closure

| Field | Value |
| --- | --- |
| **Programme** | FIN-05 — Financial Reporting & Intelligence |
| **Package** | **FIN-05H** — release integrity gate (not a new Finance feature) |
| **Status** | **IMPLEMENTED** — Product Owner end-to-end UAT **PENDING** |
| **Branch** | `cursor/sce-finance-05h-release-hardening-closure` |
| **Base** | `STAGE` @ `c5aa6c71` (FIN-05G / PR **#914**) |
| **Release tests** | `lib/finance/__tests__/finance-05h-release-hardening-closure.test.ts` |
| **Architecture locks** | `SCE_FINANCE_REPORTING_05H_ARCHITECTURE_LOCKS`, `FINANCE_05H_IMPLEMENTATION` |

## Purpose

FIN-05A–05G delivered Finance reporting as a coherent product. FIN-05H verifies and hardens **end-to-end integrity** across workspaces without introducing new financial semantics, intelligence layers, or redesign.

```text
SIMPLE UNDERSTANDING.
SHALLOW NAVIGATION.
DEEP CAPABILITY.

COMPLEXITY SHOULD EXIST IN THE SYSTEM, NOT IN THE USER'S HEAD.
```

**FIN-05 overall** remains **IMPLEMENTED / PO UAT PENDING** until Product Owner sign-off. **FIN-06** remains **NOT STARTED**.

## Scope

| In scope | Out of scope |
| --- | --- |
| Cross-workspace reconciliation tests | New reporting features |
| Source-authority audit | FIN-06 publishing/sharing |
| Tenant isolation & permission masking checks | FIN-09 liquidity |
| Empty / restricted / incomplete state contracts | FIN-11 statutory accounting |
| Navigation & terminology audit | Permission mock debt remediation |
| Visualization **documentation** refinement | Visual redesign / browser UAT by engineering |
| Performance / query-shape review | SCE-SCALE-01 infrastructure |

## End-to-end audit matrix

| Workspace | Source authority | Primary question | Write authority | Read model | Permissions |
| --- | --- | --- | --- | --- | --- |
| **Übersicht** | Consumes `loadFinanceManagementOverviewReadModel` + optional FIN-04E timing bundle | Where do we stand; what needs attention? | None (interpretive) | `FinanceOverviewDecisionIntelligenceReadModel` | `finance.view` + measure visibility |
| **Finanzstruktur** | FIN-01 structure | How are accounts grouped? | Structure edit permissions | Structure services | Structure capabilities |
| **Budget** | Approved Budget (FIN-02) | What did we approve? | Budget governance | Budget workspace | Budget measures |
| **Ist** | FIN-03 actual entries | What happened? | Actual recording | Actual workspace | Actual measures |
| **Prognose** | Current Forecast (FIN-04A/C) | What do we expect? | Forecast workspace | Forecast services | Forecast measures |
| **Zeitplanung** | FIN-04E expected events | When are movements expected? | Timing evidence | Timing read/visual models | Forecast + timing |
| **Berichte** | Shared canonical measures via `loadCanonicalMeasures` | Why are we here; explain variance? | None | P&L + comparative + detail | Reporting access |
| **Investigation** | FIN-03 evidence + FIN-05B variance | Why does this line differ? | None | Detail read model | Evidence visibility |
| **Einrichtung** | Finance configuration | Capabilities & setup | Settings | Settings loaders | Admin / finance setup |

### Per-workspace state contracts (representative)

| Workspace | Empty / incomplete | Restricted | Error |
| --- | --- | --- | --- |
| Übersicht | No structure, no budget, no forecast, no timing | Forecast hidden → no conclusion fabrication | Loader failures → degraded timing section |
| Berichte | No structure / no budget / no forecast explicit | NOT_VISIBLE measures; no zero substitution | NOT_FOUND drill-down |
| P&L | Residual unassigned bucket | Unauthorized columns masked | Reconciliation flags mismatch |

## Source authority verification

| Concept | Canonical source | FIN-05 consumers |
| --- | --- | --- |
| Approved Budget | FIN-02 approved version | Overview, Reporting, P&L |
| Actual | FIN-03 entries (grain/cutoff authoritative) | All reporting surfaces |
| Current Forecast | FIN-04 current version | Overview, Reporting, P&L |
| Automatic Forecast | FIN-04B projection | **Not** substituted in FIN-05 reporting loaders |
| Scenarios | FIN-04D | **Not** substituted for current forecast |
| Expected events | FIN-04E timing evidence | Overview timeline; timing workspace |
| Reporting / Overview | **Interpretation only** | Must not mutate sources |

## Cross-workspace reconciliation

For identical tenant / year / measure inputs:

- Overview management summaries **match** P&L reconciliation canonical totals (income, expense, result).
- Overview conclusion **matches** comparative intelligence forecast-vs-budget variance on Reporting.
- P&L section totals **reconcile** (`reconciles: true`) including unassigned residual accounts.
- YTD actual vs annual budget/forecast remain **PERIOD_MISMATCH** / context-only (FIN-05B/F).

Automated coverage: `finance-05h-release-hardening-closure.test.ts` (sections A–H).

## Issues discovered & classification

| ID | Summary | Classification | Action |
| --- | --- | --- | --- |
| — | No blocking FIN-05 integrity defects found in audit-led review | — | No code fixes required |
| VIS-REFINE | Rigid “timeline only forever” wording in 05G narrative | FIN-05H hardening (documentation) | Refined `FINANCE_EXPECTED_MOVEMENT_VISUALIZATION_PRINCIPLE` |
| PERM-MOCK | `lib/permissions` 47 known mock failures | PRE-EXISTING / UNRELATED | Baseline comparison gate only |
| SCALE | Large-tenant query caching | FUTURE PACKAGE | Document for SCE-SCALE-01 |

## Issues fixed

- Registered FIN-05H architecture locks and release test suite.
- Refined expected-movement visualization principle (question-driven visuals; timeline not exclusive).
- Updated programme documentation and roadmap status to **FIN-05H IMPLEMENTED / PO UAT PENDING**.

## Issues deferred

| Item | Destination |
| --- | --- |
| Permission mock debt (`prisma.userPermissionOverride.findMany`) | Dedicated permissions hygiene (not FIN-05H) |
| Prepared read-model caching at scale | SCE-SCALE-01 |
| FIN-06 publishing & sharing | FIN-06 |
| Projected liquidity line/area | FIN-09 |
| Statutory statements / GL | FIN-11 |

## Visualization principle (FIN-05H refinement)

**Choose visualization according to the financial question**, while preserving underlying data semantics.

| Data nature | Allowed forms (examples) |
| --- | --- |
| Discrete expected movements | Event timeline, calendar, period movement profile, event list |
| Continuous authoritative value over time | Line / area when semantically valid (FIN-09 liquidity) |
| Category magnitude | Bar |
| Variance contribution | Ranked comparison, diverging bar, direct list |

**Forbidden implications:** fabricated timing precision, fake monthly phasing, running balance, liquidity, accounting recognition.

Current Übersicht implementation remains the **compact event timeline** (FIN-05G). FIN-05H does **not** redesign it.

## FIN-09 liquidity boundary (unchanged)

| Question | Owner |
| --- | --- |
| What money is expected to move, and when? | FIN-04E / FIN-05 Overview |
| How much moves per meaningful period? | Future movement profile (when honest) |
| How much cash at time *t*? | **FIN-09** projected liquidity |

Annual budget/forecast must not be ÷12 for cash movements. Expected events retain month/range precision.

## Architecture boundaries (reconfirmed)

| Package | Scope |
| --- | --- |
| FIN-06 | Publishing & sharing |
| FIN-07 | Commitments & approvals |
| FIN-08 | Revenue / receivables |
| FIN-09 | Liquidity & treasury |
| FIN-10 | Funds / grants |
| FIN-11 | Accounting & statutory statements |

FIN-05H introduces **no** generic BI, new forecast/scenario engines, or statutory accounting.

## Binary control compliance

| Check | Result |
| --- | --- |
| NEW_BINARY_CHECKBOXES | **0** in FIN-05H diff |
| CANONICAL_TOGGLES_USED | N/A (no new binary controls) |
| MULTI_SELECTION_PATTERN | Unchanged (row selection only where pre-existing) |

## Validation gates (FIN-05H closure)

Run on feature branch:

- `npm run test -- lib/finance/__tests__/finance-05h-release-hardening-closure.test.ts`
- FIN-05A–05G regression suites under `lib/finance/__tests__/`
- Finance architecture / tenant isolation guards (existing suites)
- `npm run test:design-system`
- Changed-path ESLint
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`
- Permissions apples-to-apples: `npm run test -- lib/permissions` vs STAGE baseline `c5aa6c71`

## Product Owner UAT handoff

End-to-end coherence flow (visual sign-off by PO):

1. Finance **Übersicht** — outlook, attention, drivers, expected movements.
2. **Finanzstruktur** — hierarchy sanity.
3. **Budget** → **Ist** → **Prognose** → **Zeitplanung** (if enabled).
4. Return to **Übersicht**, then **Berichte**.
5. Drill a **favourable** and **unfavourable** driver; inspect account **evidence**; return to statement.

Judge: single financial language, no contradictory truths, clear Actual period/grain, investigatable variances, credible source links.

## Result

```text
FIN-05H IMPLEMENTED
PRODUCT OWNER UAT PENDING

FIN-05 END-TO-END INTEGRITY VERIFIED (automated gate)
FIN-05 OVERALL COMPLETE — AWAITING PRODUCT OWNER APPROVAL
```
