# SCE-FINANCE-07E — External reference linking (implementation)

| Field | Value |
| --- | --- |
| **PR** | #971 `cursor/sce-fin-07e-supplier-bill-link-df59` |
| **Canonical proposal** | `docs/finance/SCE-FINANCE-07E-SUPPLIER-BILL-EVIDENCE-PROPOSAL.md` on PR **#969** only |

## What this PR ships

- Service `linkSupplierBillExternalReferenceToCommitment` + detail UI (link/list external refs)
- No `FinanceSupplierBillEvidence` migration, no file upload, no unlink API

## Automated coverage

- `lib/finance/__tests__/finance-07e-supplier-bill-evidence.test.ts` — permission, duplicate handling, obligation chain, audit

See proposal § **DELIVERED** vs § **PROPOSED (deferred)** for metadata, attachments, and unlink.
