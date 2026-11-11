# SCE-DS2-07G — Batch 11 release gate and risk-based verification

| Field | Value |
| --- | --- |
| **PR** | [#953](https://github.com/Clipse078/sportclubevo-webapp/pull/953) |
| **Target** | `STAGE` (`21b2985b629bc867431feb8e8d318d9c6721ffbd`) |
| **Feature HEAD (start)** | `b9f05ef8becebf39157e04afd9378143d97fffa6` |
| **Evidence contract (pre-batch-11)** | `2026-11-11-batch-10` |
| **Merge** | **Not performed** (release assessment only) |

## Phase A — Preflight

| Check | Result |
| --- | --- |
| Repository / origin | `Clipse078/sportclubevo-webapp` |
| Working tree | Clean at preflight |
| Local HEAD = remote feature | `b9f05ef8…` |
| PR mergeability | `MERGEABLE`, `mergeStateStatus: CLEAN` |
| GitHub required CI (batch 10 HEAD) | **4/4 success** (route governance, design-system governance, Vercel ×2) |
| Database isolation | `assertSafeVerificationDatabaseUrl()` refuses non-local / non-`sce_ds2_07g_verification` / STAGE URL equality; mutation harness requires `SCE_DS2_07G_VERIFICATION_MODE=isolated` |

## Two quality gates (Phase B)

### Gate 1 — Release readiness

Question: *Are the code changes in PR #953 safe to merge into STAGE?*

- **Does not** require 214/214 `authenticatedVisual` VERIFIED.
- **Does** require green required CI, no confirmed release-blocking auth/data/visual regressions attributable to DS2-07G, and documented residual risk.

### Gate 2 — Full verification completion

Question: *Is the 214-route six-dimension programme complete?*

- **Answer: No** — **0/214** fully VERIFIED per batch-8 closure (`isAuthenticatedVisualClosure`).
- Batch 11 must **not** relax VERIFIED criteria to satisfy Gate 1.

## Phase C — Accessibility regression comparison (HEAD evidence)

Snapshot on HEAD before batch-11 browser refresh:

| Accessibility dimension | Count |
| --- | ---: |
| FAIL (axe violations) | **75** |
| PENDING (incomplete / fixture) | **139** |
| PASS | **0** |

### FAIL rule rollup (75 routes)

| Axe rule (severity) | Routes | Regression vs STAGE baseline |
| --- | ---: | --- |
| `color-contrast` (serious) | 48 | **Pre-existing baseline** — white-edition canvas debt documented batches 4–7; PR darkens several tokens but axe still reports incomplete/fail |
| `label` | 20 | **Pre-existing baseline** on form archetypes unless route source changed |
| `select-name` | 14 | **Pre-existing baseline** |
| `target-size` | 5 | **Mixed** — shared context-tab menu change reduces debt; individual routes **uncertain** without pairwise STAGE probe |
| `nested-interactive` | 4 | **Improved by PR** on context-tab surfaces; remaining rows **baseline or uncertain** |
| `button-name` | 4 | **Pre-existing baseline** |
| `aria-allowed-attr` / `aria-required-*` | 7 | **Uncertain** — spot-check vs STAGE on same fixture |
| Other (`definition-list`, `link-name`, `aria-hidden-focus`) | 5 | **Pre-existing baseline** |

**Introduced-by-PR critical/high:** None confirmed from static evidence alone. Shared remediations (toast landmark, day planner labels, context tabs, progressbar labels) **reduce** violation classes on affected shells.

### PENDING taxonomy (139 routes)

| Category | Count | Release-gate review |
| --- | ---: | --- |
| Axe incomplete (1 rule, mostly `color-contrast` manual) | 76 | Required before programme PASS; **not** merge-blocking if PO accepts contrast backlog |
| Axe incomplete (2 rules) | 46 | Same |
| Audit aborted / fixture not probed on shared STAGE DB | 11 | **Environment** — isolated DB batch 9 cleared FIXTURE_ENVIRONMENT queue; PENDING rows are stale runner aborts, not product defects |
| Incomplete with keyboard supplement metadata | 6 | Record supplement; not merge-blocking |

No axe rules were suppressed in batch 11.

## Phase D — Visual regression gate (post batch-11 Playwright refresh)

| Classification | Routes | Severity | Action |
| --- | ---: | --- | --- |
| Heuristic **FAIL** with clean layout + `screenshotReviewed: false` | 11 | Low | **Missing agent visual review**, not a confirmed rendering defect — programme gate only |
| Responsive probe failed (`training-session`) | 1 | Medium | **Uncertain** — re-run responsive channel; not release-blocking without defect screenshot |
| Prior capture aborts (`browser has been closed`) | 0 | — | Cleared by batch-11 re-capture |
| Planner duplicate **h1** | 0 | — | Remediated (`PlannerEntryEditForm` **h2**); planner edit no longer in FAIL queue |

Uninspected screenshots are **not** promoted to PASS. Full 214-route visual review backlog remains.

## Phase E — Functional risk (65 mutation-dependent PENDING routes)

Grouped by workflow (representative isolated harness only):

| Workflow group | Risk | Batch 11 harness |
| --- | --- | --- |
| Aufgaben / requirements | Medium–high | `requirement_title_mutation_roundtrip` **PASS** (isolated DB, reverted) |
| Website CMS | Medium | `news_title_mutation_roundtrip` **PASS** |
| Finance / billing / reconciliation | High | **Not executed** — no safe isolated financial mutation fixture in harness |
| Roles / permissions | High | **Not executed** — read-only probes only on STAGE |
| Facilities / match / tournament | High | **Not executed** |
| Communication campaigns | Medium | Fixture seeded; table shape not harnessed in batch 11 |

**3/3** isolated mutation workflows **PASS** (`lib/design-system/sce-ds2-07g-mutation-evidence.json`). **65** routes remain functionally PENDING — route-level PASS is **not** inferred.

Operational STAGE was not mutated.

## Phase F — Release risk register

Machine-readable: `lib/design-system/sce-ds2-07g-release-risk-register.json` (generated via `node scripts/sce-ds2-07g-release-gate-batch11.mjs`).

Buckets:

1. **Confirmed DS2 regressions** — planner duplicate **h1** (fixed).
2. **Pre-existing defects** — contrast/label/select-name majority of 75 axe FAIL.
3. **Unresolved high-risk findings** — 65 mutation workflows without harness coverage.
4. **Missing verification evidence** — 192 visual PENDING (screenshot review), 139 a11y PENDING.
5. **Environment limitations** — 11 visual capture aborts; local AUTH_SECRET required for Playwright login in cloud agent.
6. **Accepted non-blocking debt** — PO may accept contrast backlog and partial functional coverage **only** with explicit sign-off.

## Phase G — Decision recommendation

**B — CONDITIONALLY READY**

- **No confirmed release-blocking** auth, data-integrity, or responsive FAIL rows on HEAD evidence (responsive FAIL count **0** among sampled 214).
- Required CI green on batch-10 HEAD.
- **Full verification incomplete (0/214 VERIFIED)** — must be tracked post-merge.
- Requires **explicit product-owner risk acceptance** and **separate controlled merge approval**.

Not **C** because programme evidence and visual/a11y closure are incomplete. Not **A** because no confirmed merge-blocking defect remains after planner **h1** fix and CI success.

## Phase H — Validation (batch 11 execution)

| Command | Result |
| --- | --- |
| `npm run test:route-governance` | **PASS** (43 tests) |
| `npm run test:design-system` | **PASS** (455 tests) |
| `npm run build` | **PASS** (after clean `.next`) |
| Isolated mutation harness | **3/3 PASS** |
| Playwright visual FAIL refresh | Log: `/opt/cursor/artifacts/sce-ds2-07g-batch11-visual-reassess.log` |

## Controlled merge prerequisites

1. PO accepts documented a11y contrast backlog and incomplete mutation/visual evidence.
2. Named approver for controlled merge (outside this agent).
3. Post-merge continuation of DS2-07G closure queues — **do not** mark programme VERIFIED in release notes.
