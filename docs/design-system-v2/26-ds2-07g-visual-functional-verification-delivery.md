# SCE-DS2-07G — Authenticated visual, accessibility and functional verification (batch 1)

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

## Batch 1 result

This run establishes the **authoritative verification matrix** for all **214** DS2-07G canonical routes, runs **static canonical audits** and **automated governance suites**, and documents **authenticated browser limitations** explicitly. It does **not** claim programme completion: **0** routes are marked authenticated-visual **VERIFIED** because no authorized login credentials were available in this environment.

| Status | Count |
| --- | ---: |
| Architecture **IMPLEMENTED** | 214 |
| Automated static checks **PASSED** (per route) | 214 |
| Authenticated visual **VERIFIED** | 0 |
| **PENDING** (awaiting browser evidence) | 214 |
| **BLOCKED** | 0 |

### Authenticated browser coverage

**None.** The linked database contains real users, but `SCE_DS2_07G_LOGIN_EMAIL` / `SCE_DS2_07G_LOGIN_PASSWORD` were not configured (Cursor app secrets list empty). The Playwright runner **refuses to run** without credentials and does not bypass authentication.

High-risk prefix batch prepared for the next authorized run: **41** routes (Wochenplaner, Matchcenter, Finance, Aufgaben, Infoboard, administration, training, competitions).

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
| Closure | 0/214 authenticated-visual VERIFIED until evidence is recorded in `sce-ds2-07g-verification-evidence.json` |

## Static canonical audit

`runStaticCanonicalAudit()` scanned **214** canonical pages for missing DS2 workspace pattern markers. **0** blocking defects.

## Remaining verification work

1. Bind authorized test credentials via Cursor secrets (`SCE_DS2_07G_LOGIN_EMAIL`, `SCE_DS2_07G_LOGIN_PASSWORD`).
2. Run high-risk batch Playwright verification, then module-representative sampling across remaining routes.
3. Record evidence paths into `lib/design-system/sce-ds2-07g-verification-evidence.json` and regenerate the matrix.
4. Update `sce-ds2-07b-route-registry.ts` verification fields only where evidence satisfies `isVerifiedAuthenticatedVisual`.

## Functional regression (automated)

Route governance, design-system governance, and targeted planning/layout characterization tests were executed in this batch (see PR CI). No permission or navigation regressions were introduced by DS2-07G scaffolding.
