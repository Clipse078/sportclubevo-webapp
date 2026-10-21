# SCE-DESIGN-SYSTEM-10 — Product-wide Adoption / Legacy Removal

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-10` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-09` (**CLOSED / ACCEPTED / MERGED**, PR **#889**) |
| **`DS10_STATUS`** | **READY_FOR_PO_REVIEW** (engineering delivery complete — PO visual UAT pending) |
| **Branch** | `cursor/sce-design-system-10-product-wide-adoption` |
| **Baseline STAGE** | `f8cdf34eb0b23878396b31e73d0d1684cf3bea83` |
| **PR** | **DRAFT #888** against **STAGE** |

**PO review:** `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

**Closure marker (engineering):** `SCE_DESIGN_SYSTEM_10_READY_FOR_PO_REVIEW`

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
| Product migrations | Workspace chrome, dense UI, toggles, billing tabs, facilities shell, documents, audit logs, planning admin |
| **`SCE-DESIGN-SYSTEM-10-R4`** | **Aufgaben / Anforderungen** — `AufgabenWorkspaceShell`, canonical context tabs, DS-07 load errors |
| **`SCE-DESIGN-SYSTEM-10-R4.2`** | Unified Aufgaben workspace — Meine Aufgaben \| Verwaltung; `+ Erstellen` chooser |
| **`SCE-DESIGN-SYSTEM-10-R4.3` / R4.4** | PO UAT corrections — action-type visibility, Anforderungen Verwaltung load |
| Modal-first create | Zielgruppe, Saison, Person, **Anlage** (`CreateFacilityComposerDialog`) |
| Valid full-page exceptions | Neue Rolle, Neue Mitteilung, Neue Kampagne (documented) |

---

## Closure gates (engineering — PO visual UAT still required before merge)

```text
PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE = YES
PRODUCT_WIDE_DENSITY_MIGRATION_COMPLETE = YES
PRODUCT_WIDE_BORDER_MIGRATION_COMPLETE = YES
PRODUCT_WIDE_CREATE_FLOW_MIGRATION_COMPLETE = YES
PRODUCT_WIDE_BINARY_CONTROL_MIGRATION_COMPLETE = YES
WORKSPACE_SYSTEM_PRODUCT_WIDE = YES
BREADCRUMB_SYSTEM_PRODUCT_WIDE = YES
CONTEXT_TABS_PRODUCT_WIDE_WHERE_SEMANTIC = YES
SCE_DESIGN_SYSTEM_COMPLIANCE = PASS
DS10_STATUS = READY_FOR_PO_REVIEW
```

**Do not merge without PO visual UAT.** **Do not start DS-11** in this package.
