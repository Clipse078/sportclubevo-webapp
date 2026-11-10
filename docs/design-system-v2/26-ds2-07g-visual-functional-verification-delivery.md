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

## Remaining verification work

1. Continue batch-3 sampling (`SCE_DS2_07G_MODE=batch3`, **33** routes remain without evidence).
2. Agent visual review of captured screenshots (`visual.screenshotReviewed = true`) where layout heuristics are clean.
3. Triage axe failures (contrast/aria baseline vs DS2 regressions); fix confirmed DS2 regressions on this branch.
4. Merge evidence into `sce-ds2-07g-verification-evidence.json` and regenerate the matrix after each chunk.
5. Promote registry lifecycle only when `isVerifiedAuthenticatedVisual` is satisfied (still **0/214**).

## Functional regression (automated)

Route governance, design-system governance, and targeted planning/layout characterization tests were executed in this batch (see PR CI). No permission or navigation regressions were introduced by DS2-07G scaffolding.
