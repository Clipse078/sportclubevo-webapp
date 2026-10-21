# SCE-DESIGN-SYSTEM-10 — Product-wide Adoption / Legacy Removal

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-10` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-09` (**CLOSED / ACCEPTED / MERGED**, PR **#889**) |
| **`DS10_STATUS`** | **CLOSED / ACCEPTED / MERGED** |
| **Branch** | `cursor/sce-design-system-10-product-wide-adoption` |
| **Baseline STAGE (canonical DS-10 base)** | `f8cdf34eb0b23878396b31e73d0d1684cf3bea83` |
| **Accepted implementation HEAD (R7.2)** | `d29ac1161828fe2b0aa47620173236d8475096b2` |
| **PR** | **#888** → **STAGE** |
| **Successor** | **DS-11 not started** |

**PO closure:** `PO_DS10_PRODUCT_WIDE_VISUAL_UAT = PASS` · `PO_DS10_ORG_BUILDER_R7_2_VISUAL_UAT = PASS` · `PO_DS10_ORG_BUILDER_R7_2_HOVER_RUNTIME_UAT = PASS` · `PO_DS10_R4_AUFGABEN_VISUAL_UAT = PASS` · `PO_DS10_R4_RUNTIME_UAT = PASS` · `SCE_DS10_AUFGABEN_WORKSPACE_ACCEPTED = YES` · `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

**Closure marker:** `SCE_DESIGN_SYSTEM_10_CLOSED = YES`

---

## Mission

Make SportClubEvo **visibly and structurally** converge on SCE Design System v1.0 across dashboard modules — one navigation, workspace, activity, and visual family. Communication (`/dashboard/communication`, `/dashboard/communication/email-sender`) remains the primary visual reference without copying Communication layout into every domain.

---

## Deliverables

| Artifact | Purpose |
| --- | --- |
| [`SCE-DESIGN-SYSTEM-10-PRODUCT-WIDE-MIGRATION-MATRIX.md`](../design/SCE-DESIGN-SYSTEM-10-PRODUCT-WIDE-MIGRATION-MATRIX.md) | Authoritative disposition matrix |
| [`SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md`](../design/SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md) | Consumed handoff debt |
| `lib/design-system/sce-design-system-10-meta.ts` | Typed matrix + governance |
| `lib/design-system/sce-design-system-10-closure-meta.ts` | Final PO acceptance + closure ledger |
| Product migrations | Workspace chrome, dense UI, toggles, billing tabs, facilities shell, documents, audit logs, planning admin |
| **`SCE-DESIGN-SYSTEM-10-R4`** | **Aufgaben / Anforderungen** — `AufgabenWorkspaceShell`, canonical context tabs, DS-07 load errors |
| **`SCE-DESIGN-SYSTEM-10-R4.2`** | Unified Aufgaben workspace — Meine Aufgaben \| Verwaltung; `+ Erstellen` chooser |
| **`SCE-DESIGN-SYSTEM-10-R5–R7.2`** | Organisation Builder — editor plane, people model, contextual preview, session undo/redo |
| Modal-first create | Platform users, tenants, billing entities, website CMS, communication templates, facilities, and documented valid exceptions |
| Valid full-page exceptions | Neue Rolle, Neue Mitteilung, Neue Kampagne (documented) |

---

## Closure gates (final)

```text
PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE = YES
PRODUCT_WIDE_DENSITY_MIGRATION_COMPLETE = YES
PRODUCT_WIDE_BORDER_MIGRATION_COMPLETE = YES
PRODUCT_WIDE_CREATE_FLOW_MIGRATION_COMPLETE = YES
PRODUCT_WIDE_BINARY_CONTROL_MIGRATION_COMPLETE = YES
WORKSPACE_SYSTEM_PRODUCT_WIDE = YES
BREADCRUMB_SYSTEM_PRODUCT_WIDE = YES
CONTEXT_TABS_PRODUCT_WIDE_WHERE_SEMANTIC = YES
UNRESOLVED_MIGRATION_DEBT = 0
REMAINING_LIGHT_FUNCTIONAL_SURFACES = 0
REMAINING_FULL_PAGE_PRIMARY_CREATE_FLOWS = 0
REMAINING_LEGACY_BINARY_SETTING_CHECKBOXES = 0
SCE_DESIGN_SYSTEM_10_CLOSED = YES
ENGINEERING_MIGRATION_COMPLETE = YES
```

**Do not start DS-11** in this package.
