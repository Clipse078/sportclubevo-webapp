# SCE Design System 2.0 — White Edition (audit package)

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-00` |
| **Status** | Audit complete — awaiting PO review |
| **Branch** | `cursor/sce-ds2-00-design-audit` |
| **Target** | `STAGE` |
| **Scope** | Documentation and architecture only — no production visual changes |

## Document index

1. [00 — Executive summary](./00-executive-summary.md)
2. [01 — Reference benchmark (SC Cham, FC Allschwil)](./01-reference-benchmark-sc-cham-fc-allschwil.md)
3. [02 — Current SCE design inventory](./02-current-sce-design-inventory.md)
4. [03 — White-first visual language](./03-white-first-visual-language.md)
5. [04 — Typography and navigation](./04-typography-and-navigation.md)
6. [05 — Activity card system](./05-activity-card-system.md)
7. [06 — Tenant branding architecture](./06-tenant-branding-architecture.md)
8. [07 — Migration roadmap](./07-migration-roadmap.md)
9. [08 — Risk and regression matrix](./08-risk-and-regression-matrix.md)
10. [09 — DS2-01 foundation delivery](./09-ds2-01-foundation-delivery.md)
11. [10 — DS2-02 navigation delivery](./10-ds2-02-navigation-delivery.md)
12. [11 — DS2-03 typography delivery](./11-ds2-03-typography-delivery.md)

## DS 2.0 implementation packages

| Package | Status |
| --- | --- |
| `SCE-DS2-00` | Audit merged |
| `SCE-DS2-01` | White foundation tokens (`SCE_WHITE_EDITION` flag) |
| `SCE-DS2-02` | Premium header navigation — see doc 10 (audit roadmap used alternate IDs) |
| `SCE-DS2-03` | Sporting typography + `SceTeamName` — see doc 11 |

## Related canonical governance (unchanged by this package)

- Master: `docs/design/SCE-DESIGN-SYSTEM.md`
- Programme: `docs/roadmap/SCE-DESIGN-SYSTEM-*.md` (DS-01 … DS-11 closed on STAGE)
- Runtime tokens: `app/globals.css`
- Typed contract: `lib/design-system/sce-foundation-contract.ts`
- CLI governance: `scripts/run-design-system-governance.ts`
