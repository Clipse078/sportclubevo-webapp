# WORKSPACE-08 — Release Acceptance (W08-08)

**Package:** WORKSPACE-08-08 Security / Regression / Release Acceptance  
**Repository:** Clipse078/sportclubevo-webapp  
**Branch:** `cursor/workspace-08-governance-scale-portability`  
**PR:** #702 (draft, base `STAGE`, not merged)  
**Feature HEAD:** `067b8f6a460cb8d5b170e8fcc06bf6305e18f8dc`  
**STAGE baseline:** `7987a9650f760085117a261709411bbd19905e44`  
**W08D discovery head:** `215fb56897c078d1b85d22f3faaa4b1cf1741aee` (ancestor of feature branch)

---

## BASELINE

| Item | Value |
|------|--------|
| STAGE SHA | `7987a9650f760085117a261709411bbd19905e44` |
| W08 implementation commits | W08-01 … W08-07, W08-07A on feature branch (see git log `origin/STAGE..HEAD`) |
| W08D | Included via `215fb568` docs commit |

---

## PACKAGE_MANIFEST

Coherent W08 packages on feature branch:

- W08-01 — Durable audit foundation  
- W08-02 — Break-glass governance  
- W08-03 — Retention, holds, purge  
- W08-04 — Malware scan / quarantine  
- W08-05 — Background jobs  
- W08-06 — Storage portability  
- W08-07 — Large subtree operations  
- W08-07A — Server/client runtime boundary repair  

---

## MIGRATION_MANIFEST + CHECKSUMS

| Migration | SHA-256 (`migration.sql`) | Status |
|-----------|---------------------------|--------|
| `20260923120000_workspace_08_01_durable_audit_foundation` | `76decca4c6369bac32b478c42b58e840374b7a59db7f766dd860a4519c94b988` | IMMUTABLE |
| `20260923140000_workspace_08_02_break_glass_governance` | `babafb5673201aa8909646a4b14f0e5befdf107ac4b944c882a1b878e545a0b8` | IMMUTABLE |
| `20260923160000_workspace_08_03_retention_governance_hold` | `94e6c4d1fa284a15561d714deb1f2b903d8be991ac1e9367d13220e4dc2b8f8e` | IMMUTABLE |
| `20260923180000_workspace_08_04_malware_scan_quarantine` | `1846eded939d7ee29d069f35128d605ed038b53493ce3548ab742fc9349e361f` | IMMUTABLE |
| `20260923200000_workspace_08_05_background_jobs` | `e84a535e88e030cf6c2952c8f032ac1a0d9a7a35a7727e2af3d242ed2e44b874` | IMMUTABLE |
| `20260923220000_workspace_08_06_storage_provider_identity` | `c5b2f56b5742c5f8273ead5d9ffb6de61a38292bc343b74f543c9d4a2c98c768` | IMMUTABLE |
| `20260923240000_workspace_08_07_subtree_operations` | `59ea60ac5752fc5aefa8fe81fdcdd2859afcdb7fd0fa5d675ea9fba5eace540b` | IMMUTABLE |

**Acceptance-blocker fix (non-W08):** `MIGRATION-ORDER-01` notification enum ordering on empty-database replay — conditional enum DDL in AUFGABEN migrations + expanded enum values in `20260921140000_aufgaben_04n_notification_foundation`. Required for disposable `prisma migrate deploy` proof; documented here; does not alter W08 migration files.

---

## DISPOSABLE_DB_PROOF

| Field | Value |
|-------|--------|
| METHOD | Local PostgreSQL 16 (`127.0.0.1:5432`), dedicated databases |
| CLASSIFICATION | `DISPOSABLE_TEST` |
| DISPOSABLE | YES |
| ALLOW_WRITE | YES (disposable DBs only) |

**Empty replay DB:** full chain `186` migrations — `prisma migrate deploy` SUCCESS; second deploy SUCCESS; `prisma migrate status` — database schema up to date.

**Scripts:** `scripts/w08-stage-prisma.config.ts` (STAGE-baseline migration path for upgrade seeding).

---

## SEEDED_UPGRADE_PROOF

| Step | Result |
|------|--------|
| PRE_W08_BASELINE | STAGE migration set (`7987a965…`) on disposable DB |
| Seed | `scripts/w08-08-seed-pre-upgrade-fixtures.ts` — tenants A/B, nested folders, active/archived/trashed documents, multi-version doc, ACL, favorites/recents, Task EXACT ref, Requirement version ref, legacy Vercel `storageUrl` |
| W08_CHAIN | `prisma migrate deploy` applied W08-01 … W08-07 only (7 pending) — SUCCESS |

---

## POST_MIGRATION_INVARIANTS

Verified on seeded upgrade DB (manifest `/tmp/w08-08-fixture-manifest.json`):

- Tenants preserved (2)  
- Document / version IDs preserved  
- `currentVersionId` unchanged  
- Task + Requirement EXACT version refs unchanged  
- `storageProvider = vercel-blob` backfill; `storageUrl` not rewritten  
- No cross-tenant folder leak  
- W08-04 backfill created `WorkspaceDocumentVersionScan` rows (`NOT_SCANNED`)

Automated: `lib/workspace/__tests__/w08-08-acceptance.test.ts` (`W08-08-DB-01`) with `TEST_DATABASE_URL` + `W08_08_FIXTURE_MANIFEST`.

---

## AUDIT / BREAK_GLASS / RETENTION / MALWARE / JOBS / STORAGE / SUBTREE / RUNTIME

Revalidated via existing W08-01 … W08-07A sentinel suites + W08-08 cross-package tests (permissions independence, storage adapter isolation, subtree threshold, runtime boundary).

| Area | Result |
|------|--------|
| AUDIT | PASS (canonical `AuditLog`, tenant scope, audit.view separation) |
| BREAK_GLASS | PASS (read-only, audited, no ACL/upload/delete widening) |
| RETENTION / HOLDS / PURGE | PASS (reference-aware purge sentinels) |
| MALWARE | PASS — see scanner flags below |
| BACKGROUND_JOBS | PASS |
| STORAGE_PORTABILITY | PASS — Swiss flags below |
| SUBTREE_SCALE | PASS (default threshold 1000, bounded planner) |
| RUNTIME_BOUNDARY | PASS (W08-07A) |

**Scanner / Swiss hosting (truthful):**

| Flag | Value |
|------|--------|
| REAL_SCANNER_PROVIDER_IMPLEMENTED | YES (provider seam) |
| REAL_SCANNER_CONFIGURED | NO |
| REAL_SCANNER_EXECUTED | NO |
| SWISS_STORAGE_CAPABLE | YES |
| SWISS_STORAGE_CONFIGURED | NO |
| SWISS_STORAGE_VERIFIED | NO |
| FULL_PLATFORM_SWISS_RESIDENCY | NO |

---

## TENANT_SECURITY_MATRIX / RACES / FAILURE MATRICES

Covered by existing Workspace unit/sentinel suites (cross-tenant deny, zero-disclosure, destructive races, storage failure classification, scan failure states) — **870** tests under `lib/workspace/__tests__`, `app/api/workspace`, `components/admin/workspace` — **0 failures** after dependency install.

W08-08 adds integration-boundary sentinels (not duplicating per-package matrices).

---

## REGRESSION

| Suite | Count | Result |
|-------|-------|--------|
| Workspace + API + UI | 870 tests | PASS |
| W08 sentinels (incl. W08-08) | 247 `it()` blocks in `w08-*.test.ts` | PASS |
| Prisma validate / generate | — | PASS |
| Build (`APPLY_DATABASE_MIGRATIONS=false`) | — | PASS |
| Typecheck (`tsc --noEmit`) | Pre-existing `scripts/__tests__` errors only | Unchanged baseline |

Task/Requirement DB integration suites under `lib/tasks` / `lib/requirements` require optional `TEST_DATABASE_URL`; not part of Workspace regression gate (no failures in Workspace scope).

---

## SECURITY_SEARCH

W08-08 acceptance test scans workspace routes/services for client storage injection and `@vercel/blob` outside adapters. **P0/P1:** none unresolved in W08 scope.

---

## BENCHMARK

See `docs/workspace/WORKSPACE-08D-BENCHMARK-RECORD.md`. W08-08 closure: ADOPTED / ADAPTED patterns implemented; DEFERRED items listed under residual risks; no feature-parity claims.

---

## RESIDUAL_RISKS

| Risk | Severity | ACCEPTABLE_FOR_W08 | Owner | BLOCKS_W08 |
|------|----------|----------------------|-------|------------|
| Real AV scanner not configured | Medium | YES | Post-W08 ops | NO |
| Full Swiss blob residency not verified | Medium | YES | W08-06+ops | NO |
| WORM / hash-chain audit export | Low | YES | Future compliance | NO |
| Managed external queue | Low | YES | Future scale | NO |
| Async folder move | Low | YES | Performance programme | NO |
| Subtree cancellation | Low | YES | Future UX | NO |
| CLEAN_ONLY rollout / NOT_SCANNED legacy | Medium | YES | Tenant policy activation | NO |
| Storage migration tooling | Medium | YES | Explicit programme | NO |
| DB/runtime/log residency separate from blobs | Info | YES | Platform | NO |
| MIGRATION-ORDER-01 enum replay fix touches pre-W08 SQL | Medium | YES | W08-08 acceptance | NO |
| STAGE `_prisma_migrations` checksum drift if enum SQL edited | Medium | YES | STAGE merge runbook | NO |

---

## W09_READINESS

W08 accepted for merge/STAGE closure only. **Do not start W09** on this PR.

---

## Evidence artifacts (agent run)

- `/opt/cursor/artifacts/w08-empty-migrate-deploy.log`  
- `/opt/cursor/artifacts/w08-second-migrate-deploy.log`  
- `/opt/cursor/artifacts/w08-workspace-regression.log`  
- `/opt/cursor/artifacts/w08-build.log`  

---

## VERDICT

**WORKSPACE-08-08 PASS** — disposable PostgreSQL full-chain + seeded upgrade proven; Workspace regression green; release evidence recorded.

**NEXT:** W08 merge / STAGE closure (explicit step — **do not merge PR #702** from this acceptance task alone).
