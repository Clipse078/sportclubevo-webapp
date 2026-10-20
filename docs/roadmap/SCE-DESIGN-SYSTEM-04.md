# SCE-DESIGN-SYSTEM-04 — Cards & Information Presentation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-04` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-03` (**CLOSED / ACCEPTED / MERGED**, PR **#881**) |
| **Status** | **READY FOR PO REVIEW** (draft PR — visual UAT PO-owned) |
| **Foundation consumed** | DS-02 tokens · DS-03 workspace/navigation |

---

## Mission

Standardize and evolve **information presentation within** accepted workspace surfaces — capability cards, summary metrics, object/identity presentation, the **SCE activity card family**, density behaviour, legacy card inventory, Communication-inspired card quality, domain-specific compositions, and **Infoboard fallback match presentation P0**.

**Core principle:** ONE SCE INFORMATION LANGUAGE · MULTIPLE PURPOSE-BUILT COMPOSITIONS.

---

## PO closure markers (pending visual review)

```text
CARD_SYSTEM_PRODUCT_WIDE = YES
COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES
COMMUNICATION_IS_UNIVERSAL_CARD_TEMPLATE = NO
ACTIVITY_CARD_FAMILY_CANONICAL = YES
WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE = PASS
INFOBOARD_MATCH_PRESENTATION_P0 = CLOSED
PREMIUM_DOES_NOT_MEAN_OVERSIZED = YES
BINARY_CONTROL_COMPLIANCE = PASS
NEW_BINARY_CHECKBOXES = 0
MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED
SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED
```

---

## Deliverables

| Artifact | Purpose |
| --- | --- |
| [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md) | Master entry — DS-04 section |
| [`SCE-DESIGN-SYSTEM-04-CARD-INVENTORY.md`](../design/SCE-DESIGN-SYSTEM-04-CARD-INVENTORY.md) | DS-10 migration gate |
| `lib/design-system/sce-design-system-04-meta.ts` | Typed audit + governance |
| `lib/design-system/sce-card-information-hierarchy.ts` | Hierarchy layers |
| `components/sce/information/SceInformationSurface.tsx` | Composable panel shell |
| Infoboard P0 | Screen 1 fallback removed; mapper + Screen 2 `matchPresentation` |

---

## Representative adoption (DS-04)

| Area | Evidence |
| --- | --- |
| Communication | `CommunicationHubCapabilityLink` + `SceFeatureCard` family markers |
| Activity / Programme | Activity card guardrails unchanged — canonical family |
| Dashboard | `DashboardKpiCard` summary-metric marker |
| Admin / Roles | `SceInformationSurface` on roles layout |
| Operational / Infoboard | Canonical home/away `matchPresentation` |

---

## Related

- [`SCE-DESIGN-SYSTEM-03.md`](./SCE-DESIGN-SYSTEM-03.md)
- [`SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md`](../design/SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md)
