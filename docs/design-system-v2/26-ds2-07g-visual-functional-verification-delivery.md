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

## Remaining verification work

1. Module-representative sampling for the remaining **173** routes (batch 3+).
2. Merge additional evidence into `sce-ds2-07g-verification-evidence.json` and regenerate the matrix.
3. Update `sce-ds2-07b-route-registry.ts` verification fields only where evidence satisfies `isVerifiedAuthenticatedVisual` (registry still **0/214** lifecycle VERIFIED until explicit registry promotion).

## Functional regression (automated)

Route governance, design-system governance, and targeted planning/layout characterization tests were executed in this batch (see PR CI). No permission or navigation regressions were introduced by DS2-07G scaffolding.
