# SCE-DS2-07G — Isolated verification fixture strategy (batch 8)

## Objective

Unblock **11** parameterized routes that cannot be probed against operational STAGE data without stable foreign keys.

## Blocked routes

| Module | Route pattern | Missing entity |
| --- | --- | --- |
| Aufgaben | `/dashboard/aufgaben/anforderungen/[requirementId]` | `Requirement` |
| Aufgaben | `/dashboard/aufgaben/anforderung/[recipientId]` | `RequirementRecipient` |
| Communication | `/dashboard/communication/kampagnen/[id]` | `CAMPAIGN` sample |
| Communication | `/dashboard/communication/vorlagen/[id]` | `PlatformCommunicationTemplate` |
| Website CMS | `/dashboard/website/news/[id]/edit` | editable news page fixture |
| Vereinsleitung | `/vereinsleitung/initiativen/[slug]` | initiative slug |
| Vereinsleitung | `/vereinsleitung/meetings/[slug]` | `Meeting` |
| Vereinsleitung | `/vereinsleitung/meetings/[slug]/edit` | `Meeting` |
| Vereinsleitung | `/vereinsleitung/targets/[id]` | `Target` |
| Vereinsleitung | `/vereinsleitung/targets/[id]/edit` | `Target` |
| Billing | `/dashboard/admin/commercial/billing/reconciliation/imports/[importKey]` | `BankReconciliationImport` |

## Requirements

1. **Isolation:** Disposable Postgres (Neon branch or ephemeral `DATABASE_URL_VERIFICATION`) — never mutate operational STAGE rows.
2. **Tenant scope:** All fixtures created under a dedicated `VERIFICATION_TENANT_KEY` with FCA-scoped membership for the Playwright persona.
3. **Stability:** Fixture ids written to `lib/design-system/sce-ds2-07g-verification-fixtures.json` (generated, not hand-edited).
4. **Repeatability:** `node scripts/sce-ds2-07g-seed-verification-fixtures.mjs` (planned) applies idempotent upserts.
5. **Teardown:** Branch delete or `sce-ds2-07g-teardown-verification-fixtures.mjs` removes verification tenant subtree only.
6. **Leakage:** No references to production club slugs or live billing imports.

## Implementation status (batch 8)

| Item | Status |
| --- | --- |
| Runner env overrides for fixture ids | **Implemented** (batch 6) |
| STAGE read-only resolution for most domains | **Implemented** |
| Dedicated verification DB + seed script | **Implemented** (batch 9) — local `sce_ds2_07g_verification` + guards |
| Routes remain PENDING | **11** on STAGE until isolated runner replay; not product defects |

## Verification harness (when DB available)

```bash
export DATABASE_URL="$DATABASE_URL_VERIFICATION"
export SCE_DS2_07G_FIXTURE_REQUIREMENT_ID=...
# ...other SCE_DS2_07G_FIXTURE_* from generated manifest
SCE_DS2_07G_MODE=reassess-evidence SCE_DS2_07G_SOURCE_FILES=... node scripts/sce-ds2-07g-authenticated-route-verify.mjs
node scripts/sce-ds2-07g-build-verification-matrix.mjs
```
