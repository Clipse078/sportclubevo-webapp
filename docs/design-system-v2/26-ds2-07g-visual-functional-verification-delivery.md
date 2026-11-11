# SCE-DS2-07G — Authenticated visual, accessibility and functional verification

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-07G` |
| **Predecessor** | `SCE-DS2-07F` (PR #952, `21b2985b629bc867431feb8e8d318d9c6721ffbd`) |
| **Target branch** | `STAGE` |
| **Canonical routes in scope** | 214 |

## Preflight

| Check | Result |
| --- | --- |
| Repository | `Clipse078/sportclubevo-webapp` |
| Starting SHA | `21b2985b629bc867431feb8e8d318d9c6721ffbd` (`origin/STAGE`) |
| Predecessor PR #952 | Merged |
| Working tree | Clean at preflight |
| Feature branch | `cursor/sce-ds2-07g-visual-functional-verification-6fe6` |

## Batch 1 result (scaffolding)

Batch 1 landed the **214-route matrix**, static canonical audit, governance tests, and the authenticated Playwright runner. **0** routes were marked **VERIFIED** in batch 1 because credentials were not yet available.

## Batch 2 result (high-risk authenticated verification)

| Status | Count |
| --- | ---: |
| Architecture **IMPLEMENTED** | 214 |
| Automated static checks **PASSED** (per route) | 214 |
| Authenticated visual **VERIFIED** (programme) | 41 |
| High-risk batch **VERIFIED** | 41 / 41 |
| **PENDING** (no browser evidence yet) | 173 |
| **BLOCKED** | 0 |
| Open defects on verified high-risk routes | 0 |

### Execution

- **Credentials:** `SCE_DS2_07G_LOGIN_EMAIL` and `SCE_DS2_07G_LOGIN_PASSWORD` present (values not logged).
- **Base URL:** `http://localhost:3000` against linked STAGE `neondb` (`DATABASE_URL` + local `NEXTAUTH_SECRET` for Auth.js dev).
- **Runner:** `node scripts/sce-ds2-07g-authenticated-route-verify.mjs`
- **Evidence:** `lib/design-system/sce-ds2-07g-verification-evidence.json` (+ screenshots under `/opt/cursor/artifacts/sce-ds2-07g/`)
- **Dynamic fixtures:** training `seriesId` / `sessionId` resolved read-only from STAGE data for parameterized training edit/allocation routes.

Viewports per route: **desktop 1440**, **compact desktop 1093**, **tablet 768**, **mobile 390** — each with screenshot, chrome landmarks, keyboard focus, and HTTP success checks.

## Verification matrix

- **Artifact:** `lib/design-system/sce-ds2-07g-verification-matrix.ts`
- **Regenerator:** `node scripts/sce-ds2-07g-build-verification-matrix.mjs`
- **Authenticated runner:** `node scripts/sce-ds2-07g-authenticated-route-verify.mjs` (requires env credentials)

Each row includes route/module, inferred permissions and test persona, page archetype, desktop/tablet/mobile/accessibility/functional channels, evidence references, and defect slots.

## Baseline debt (not new DS2 regressions)

| Area | Notes |
| --- | --- |
| Contrast smoke | Vitest wrapper may time out during cold Playwright install; direct `scripts/sce-ds2-06-visual-archetypes-browser-check.mjs` passes. Timeout increased in `sce-ds2-06-unified-page-architecture.test.ts`. |
| Matchcenter | Operational panel migration debt (`sce-design-system-10r2-migration-debt.ts`) |
| Infoboard | Designer/preview surfaces tracked for dedicated visual pass |
| Aufgaben | Intercept routes (`@task`) need modal/intercept browser pass |
| Closure | High-risk **41/41** verified; **173** routes await batch 3+ sampling |
| `sce-icons-03-operational-adoption` | **2 failures on feature HEAD and on predecessor STAGE `21b2985b`** — pre-existing icon/pill drift, not introduced by DS2-07G |

## Static canonical audit

`runStaticCanonicalAudit()` scanned **214** canonical pages for missing DS2 workspace pattern markers. **0** blocking defects.

## Batch 3 result (evidence contract + reassessment + sampling)

| Status | Count |
| --- | ---: |
| Evidence contract | `2026-11-10-batch-3` (six independent dimensions) |
| High-risk responsive (4 viewports) | **41 / 41** PASS (roles overflow remediated; contained-scroll heuristic) |
| Programme closure (`authenticatedVisual`) | **0 / 214** (visual review + dimension closure required) |
| Accessibility axe PASS (dimension) | **0** (baseline `color-contrast` debt; `aria-valid-attr-value` fixed on route-owned context tabs) |
| Functional read-only PASS (dimension) | **55** across **101** evidence rows |
| Batch-3 module sampling | chunk 0 (**20**) + chunk 1 offset 20 limit 40 (**40**) → **101** evidence rows total |
| Screenshot explicitly reviewed | **5** roles admin routes (`screenshotReviewed: true`) |
| Remaining queue | **113** routes without browser evidence |

### Evidence contract (batch 3)

Each route records **authentication**, **authorization**, **visual** (screenshots + heuristics; `screenshotReviewed: false` until explicit visual inspection), **responsive** (per viewport), **accessibility** (axe-core WCAG 2.2 AA tags on desktop), and **functional** (read-only smoke; mutation workflows stay **PENDING** without isolated DB).

Helpers:

- `scripts/lib/sce-ds2-07g-evidence-contract.mjs`
- `node scripts/sce-ds2-07g-migrate-batch2-evidence.mjs` (offline dimension migration)
- `SCE_DS2_07G_MODE=reassess-batch2|batch3` on `scripts/sce-ds2-07g-authenticated-route-verify.mjs`
- Auth.js login uses CSRF + credentials callback (`AUTH_SECRET` / `NEXTAUTH_SECRET` required on dev server)

## Batch 4 result (contrast closure + route sampling chunk 2)

| Status | Count |
| --- | ---: |
| Authenticated browser evidence rows | **141** / 214 |
| Remaining queue (no browser row yet) | **73** |
| Responsive all-viewport PASS | **137** / 141 |
| Accessibility axe **PASS** | **0** (50 rows clean scan with axe *incomplete*; 91 FAIL with open rule debt) |
| Accessibility zero violations | **50** (PENDING incomplete manual rules) |
| Functional read-only PASS | **82** |
| Screenshot explicitly reviewed | **5** (roles administration workspace) |
| Programme `authenticatedVisual` VERIFIED | **0** / 214 |

### Accessibility root cause (batch 4)

| Group | Finding | Fix on branch |
| --- | --- | --- |
| Rule / token | `color-contrast` — orange L1 active label and account avatar on `#fafafa`; active context tabs; muted on `#f1f5f9`; selection row on legacy `--blue-light` | White-edition tokens: `--muted` `#57606a`, `--sce-color-nav-active`, `--sce-color-context-tab-active`, `--blue-light` `#e8f0fc`, account avatar fallback |
| Component | `aria-prohibited-attr` on platform wordmark wrapper | `SidebarPlatformBrand` `role="img"` |
| Component | `aria-progressbar-name` on finance/planning rails | Explicit `aria-label` on shared progress rails |
| Baseline | `label` / `select-name` on form archetypes | Recorded FAIL — not suppressed |
| Dynamic fixtures | `ExternalClub`, `WebsitePage`, `ReusableComponent` for `[clubId]` / `[id]` probes | Runner fixture resolution + workspace shell wait |

## Batch 5 result (coverage + remediation + evidence closure)

| Status | Count |
| --- | ---: |
| Authenticated browser evidence rows | **181** / 214 |
| Remaining queue (no browser row yet) | **33** |
| Responsive PASS / PENDING (fixture) / FAIL | **146** / **35** / **0** among sampled rows |
| Accessibility PASS / FAIL / PENDING | **0** / **60** / **121** |
| Functional PASS / PENDING | **109** / **72** |
| Screenshot explicitly reviewed | **7** (+ 3 roles detail routes retain batch-4 review in history; re-marked after reassess) |
| Programme `authenticatedVisual` VERIFIED | **0** / 214 |

### Batch 5 remediations

| Area | Change |
| --- | --- |
| Responsive (4 routes) | Tenant-scoped CMS fixtures; keyboard focus probe retries; notifications skip-link; HTTP 404 no longer misclassified as auth FAIL |
| Accessibility | White-edition `--sce-primary` / filled CTA tokens darkened to `#a35f28` (AA with white text and on canvas); contrast regression pairs extended |
| Queue | `selectBatch3Routes` now prefers routes without evidence before re-sampling partial rows |
| Visual review | Agent read of notifications, website page/component edit, communication hub, vereinsleitung initiative form |

## Batch 6 result (214/214 browser coverage + fixture remediation + evidence closure)

| Status | Count |
| --- | ---: |
| Authenticated browser evidence rows | **214** / 214 |
| Remaining unsampled queue | **0** |
| Responsive PASS / PENDING (fixture) / FAIL | **205** / **9** / **0** |
| Accessibility PASS / FAIL / PENDING | **0** / **79** / **135** |
| Functional PASS / PENDING | **130** / **84** |
| Screenshot explicitly reviewed (cumulative) | **16** (9 batch-6 agent reads + prior roles/notifications/website samples) |
| Programme `authenticatedVisual` VERIFIED | **0** / 214 |

### Batch 6 execution

- **Runner:** `SCE_WHITE_EDITION=1` + `SCE_DS2_07G_MODE=batch3` (33 routes) then `reassess-evidence` for 35 fixture-blocked rows.
- **Fixture remediation:** Extended tenant-scoped resolution (`teamId`, `personId`, `orgUnitId`, billing keys, communication ids, `tenantSlug`, etc.) in `scripts/sce-ds2-07g-authenticated-route-verify.mjs`.
- **Environmental blockers (9 routes):** No STAGE rows for `Requirement` / `RequirementRecipient`, communication campaign/template samples, Vereinsleitung meetings/targets, or bank reconciliation import key — left **PENDING** (not promoted to PASS).
- **CMS hero editor:** `hero` reusable type lacks `ConfigForm` registration (`ReusableComponentEditor` default branch); reproduced on `origin/STAGE` — tracked debt `DS2-07G-CMS-HERO-EDITOR-GAP`.

### Visual review (batch 6)

Agent image inspection (desktop artifact reference) via `scripts/sce-ds2-07g-record-visual-review-batch6.mjs`. Full **214×4** manual review is not complete; routes with loading-only captures (e.g. platform home skeleton, Vereine list spinner) stay **screenshotReviewed** with **PENDING** verdict notes.

## Batch 7 result (systemic a11y + toast/day planner + evidence refresh)

| Status | Count |
| --- | ---: |
| Authenticated browser evidence rows | **214** / 214 |
| Responsive PASS / PENDING (fixture) | **203** / **11** |
| Accessibility PASS / FAIL / PENDING | **0** / **66** / **148** |
| Functional PASS / PENDING | **130** / **84** |
| Screenshot explicitly reviewed | **19** (batch 6 + batch 7 agent reads restored after reassess) |
| Programme `authenticatedVisual` VERIFIED | **0** / 214 |

### Batch 7 remediations (shared root causes)

| Area | Change |
| --- | --- |
| Global toast stack | `ToastProvider` toast container `role="region"` (fixes `aria-prohibited-attr` on shell-wide `aria-label` divs) |
| Day planner | Conflict badge tokens for white canvas; `DayPlannerPlanSelect` label + `name` |
| Context tabs | `SceContextTabs` overflow `details/summary` → button menu (reduces `nested-interactive` / `target-size` debt) |
| Platform brand | `SidebarPlatformBrand` drops prohibited `role="img"` grouping; single visible wordmark `alt` |
| Tokens | White `--tenant-secondary` eyebrow contrast; extended `sce-ds2-06-contrast-pairs` |
| Evidence | Targeted Playwright reassess of 45 + 72 axe-FAIL rows (`/opt/cursor/artifacts/sce-ds2-07g-reassess-*.log`) |

### Environmental blockers (unchanged)

Nine routes still lack STAGE fixtures (`Requirement`, `RequirementRecipient`, `CAMPAIGN`/`PlatformCommunicationTemplate`, `Meeting`, `Target`, `BankReconciliationImport`). Responsive + evidence remain **PENDING**; classified as **fixture unavailable**, not application defects.

## Batch 8 result (verification framework, evidence quality, closure strategy)

| Status | Count |
| --- | ---: |
| Evidence contract | `2026-11-11-batch-8` |
| Fully VERIFIED (`authenticatedVisual`) | **0** / 214 |
| Accessibility PASS / FAIL / PENDING | **0** / **66** / **148** |
| Functional PASS / PENDING / NOT_APPLICABLE | **129** / **79** / **6** |
| Visual PASS / PENDING / FAIL | **8** / **181** / **25** |
| Screenshot explicitly reviewed | **19** |
| Fixture-environment blockers | **11** |

### Batch 8 evidence-contract corrections

| Area | Change |
| --- | --- |
| Closure rule | `isAuthenticatedVisualClosure` requires `visual.status === PASS` and `screenshotReviewed === true` |
| Accessibility | `resolveAccessibilityDimension` records axe incomplete rule ids; classifies manual vs keyboard supplement; never PASS on incomplete alone |
| Functional | `resolveFunctionalDimension` with governed `NOT_APPLICABLE` (5 future-module + 1 intercept); form vs read-only classification |
| Runner | Preserves visual review metadata on reassess merge; fixes workspace chrome landmark selector; serializes `incompleteSummaries` |
| Workspace | `SceWorkspaceChrome` exposes `data-testid` and `<main data-sce-page-shell>` |
| Offline | `sce-ds2-07g-reconcile-evidence-batch8.mjs`, `sce-ds2-07g-closure-report.mjs`, visual readiness check |
| Fixtures | `docs/design-system-v2/27-ds2-07g-fixture-isolation-strategy.md` (isolated DB plan; STAGE mutation refused) |

Closure queue artifact: `docs/design-system-v2/28-ds2-07g-closure-queue-batch8.md` (grouped by root cause, not route list only).

## Batch 9 result (isolated verification environment)

| Item | Result |
| --- | --- |
| Local verification DB | `sce_ds2_07g_verification` @ `127.0.0.1` (guarded by `DATABASE_URL_VERIFICATION`) |
| Fixture manifest | `lib/design-system/sce-ds2-07g-verification-fixtures.json` |
| FIXTURE_ENVIRONMENT queue | **0** (11 routes probed on isolated stack) |
| Mutation harness | **3/3 PASS** (`lib/design-system/sce-ds2-07g-mutation-evidence.json`) |
| Evidence contract | `2026-11-11-batch-9` (+ `verificationEnvironment` on runner manifest) |

Provision: `npm run ds2-07g:provision-verification-db` → `npm run ds2-07g:seed-verification-fixtures` (requires `SCE_DS2_07G_VERIFICATION_CONFIRM` + `SCE_OPERATION_AUTHORIZATION`).

### Remaining verification work

1. ~~Close **11** `FIXTURE_ENVIRONMENT` routes via disposable verification DB~~ — **done on isolated env**; STAGE URLs unchanged.
2. Reassess accessibility with batch-8 runner to persist incomplete rule ids; remediate **66** axe FAIL rows (shared contrast/label debt).
3. Agent visual review for **181** routes without `screenshotReviewed`.
4. Mutation workflows (**79** functional PENDING) — isolated harness or tracked baseline debt; do not infer from render-only probes.
5. Programme closure remains **0/214** until all six dimensions satisfy batch-8 contract.

## Batch 10 result (accessibility remediation + visual heuristic closure)

| Status | Count (pre-batch-10 evidence) |
| --- | ---: |
| Evidence contract | `2026-11-11-batch-10` |
| Fully VERIFIED | **0** / 214 |
| Accessibility PASS / FAIL / PENDING | **0** / **77** / **137** |
| Visual PASS / PENDING / FAIL (heuristic) | **8** / **180** / **26** |
| Screenshot explicitly reviewed | **19** |

### Batch 10 shared remediations

| Area | Change |
| --- | --- |
| Document outline | `SceActivityComposerHeader` uses **h2** in page mode; specimen/infoboard detail headings demoted to **h2** |
| Main landmark | Aufgaben record/create/series routes compose `main` or `SceWorkspaceChrome` instead of dialog-only shells |
| Tenant roles create | Removed nested `FormPagePattern` h1 under roles layout chrome (module layout already owns **h1**) |
| Labels | Task context/visibility/series selects receive explicit accessible names; attention deadline color darkened for white canvas |
| Evidence | Targeted Playwright reassess of visual-heuristic FAIL queue + contract bump to batch-10 |

Programme **VERIFIED** count remains **0** until screenshot review, axe incomplete resolution, and functional mutation evidence align per batch-8 closure rules.

## Functional regression (automated)

Route governance, design-system governance, and targeted planning/layout characterization tests were executed in this batch (see PR CI). No permission or navigation regressions were introduced by DS2-07G scaffolding.
