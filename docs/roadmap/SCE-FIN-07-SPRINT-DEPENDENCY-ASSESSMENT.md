# SCE-FIN-07 — Sprint dependency assessment (read-only)

| Field | Value |
| --- | --- |
| **Date** | 2026-11-13 |
| **Base** | STAGE |
| **Purpose** | Next coherent increment planning without migration execution |

## Implemented on STAGE (verified by automated tests)

| Package | Evidence |
| --- | --- |
| **07A** | `finance-07a-commitment-architecture.test.ts` — domain locks, permissions, lifecycle guards |
| **07B** | `finance-07b-commitment-workspace.test.ts` — workspace wiring |
| **07C** | `finance-07c-approval-inbox.test.ts`, PO UAT readiness tests |
| **07D** | `finance-07d-approval-policy.test.ts`, stage UAT seed/cleanup ledgers |
| **Routes** | `/dashboard/finance/commitments`, `.../approvals` |
| **Schema** | `FinanceCommitment`, `FinanceCommitmentApprovalDecision`, `FinanceCommitmentApprovalPolicy` (Prisma) |

Verifier scripts (STAGE-only): `scripts/sce-finance-07a-stage-migration-verify.ts`, `scripts/sce-finance-07d-stage-migration-verify.ts`.

## Documentation drift

Roadmap header in `SCE-FINANCE-07-COMMITMENTS-APPROVALS-ARCHITECTURE.md` still lists **07B–07G NOT STARTED** while STAGE contains substantial 07B–07D implementation and tests. Treat **code + tests on STAGE** as source of truth until docs are refreshed in a dedicated docs pass.

## Next coherent increment (no new migration without approval)

| Candidate | Scope | Migration risk |
| --- | --- | --- |
| **07E** | Supplier bill → commitment evidence linking (UI + services) | Medium — confirm existing tables |
| **07F** | Expected financial event sync `sourceKind = COMMITMENT` | Medium — enum reserved; sync logic only |
| **07G** | Programme closure / governance hardening | Low |

**Blocked without explicit approval:** any additive Prisma migration not already on STAGE preview parity runbook.

## Sprint recommendation

1. PO UAT batch for FIN-07C/D flows already on STAGE (human).
2. Engineering: open **07E assessment PR** (read-model + route inventory only) before UI.
3. Do not merge FIN-07 packages in this sprint without authorization.
