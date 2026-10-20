# SCE-DESIGN-SYSTEM-04 — Cards & Information Presentation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-04` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-03` (**CLOSED / ACCEPTED / MERGED**, PR **#881**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#882** → **STAGE**; merge `7990f37a991ce48ff3bf1c9f2fcee4b2fe737877`) |
| **`DS04_STATUS`** | **CLOSED / ACCEPTED / MERGED** |
| **Branch** | `cursor/sce-design-system-04-cards-information-presentation` (merged) |
| **Baseline STAGE (pre-merge)** | `c99a1e74510dbf01b2c0a97f0678b918d9140e40` |
| **Accepted implementation HEAD (`FEATURE_HEAD`)** | `4057e5d2cc3766a2040f2de29acd3f2f7292d748` |
| **Closure commit** | `21b4c6e7d6e3e49a17a88d74f5d478c1ff11a836` |
| **STAGE merge commit** | `7990f37a991ce48ff3bf1c9f2fcee4b2fe737877` |
| **PR** | **#882** — **MERGED** |
| **Successor** | **`SCE-DESIGN-SYSTEM-05`** — Forms & Controls |
| **Foundation consumed** | DS-02 tokens · DS-03 workspace/navigation |

**PO closure:** `PO_CARD_SYSTEM_REVIEW = PASS` · `PO_INFORMATION_PRESENTATION_REVIEW = PASS` · `PO_ACTIVITY_PRESENTATION_REVIEW = PASS` · `PO_INFOBOARD_P0_REVIEW = PASS` · `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

**Programme:** `SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS` · **`NEXT_PACKAGE = SCE-DESIGN-SYSTEM-05`** — Forms & Controls

---

## PO acceptance (final closure)

Product Owner accepts the submitted DS-04 implementation at **`4057e5d2cc3766a2040f2de29acd3f2f7292d748`**. No redesign during closure — documentation and programme truth only.

| Field | Value |
| --- | --- |
| `PO_CARD_SYSTEM_REVIEW` | **PASS** |
| `PO_INFORMATION_PRESENTATION_REVIEW` | **PASS** |
| `PO_ACTIVITY_PRESENTATION_REVIEW` | **PASS** |
| `PO_INFOBOARD_P0_REVIEW` | **PASS** |
| `CARD_SYSTEM_PRODUCT_WIDE` | **YES** |
| `COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE` | **YES** |
| `COMMUNICATION_IS_UNIVERSAL_CARD_TEMPLATE` | **NO** |
| `ACTIVITY_CARD_FAMILY_CANONICAL` | **YES** |
| `WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE` | **PASS** |
| `INFOBOARD_MATCH_PRESENTATION_P0` | **CLOSED** |
| `P0_INFOBOARD_MATCH_PRESENTATION` | **CLOSED_BY_DS04** |
| `HOME_LEFT` / `AWAY_RIGHT` / `CANONICAL_MATCH_IDENTITY` | **YES** |
| `LEGACY_MATCH_IDENTITY_FALLBACK` | **NO** |

**Core principle (locked):** ONE SCE INFORMATION LANGUAGE · MULTIPLE PURPOSE-BUILT COMPOSITIONS — not one generic mega-card.

**Canonical families (non-exhaustive):** `SceInformationSurface` · `SceFeatureCard` · `CommunicationHubCapabilityLink` · `DashboardKpiCard` · `SceClubCard` · SCE activity card family · `SceTournamentFixtureCard` · `InfoboardCompactMatchIdentity` · existing identity/presentation primitives.

**Activity family:** `SceMatchCard` · `SceTrainingCard` · `SceTournamentCard` · `SceClubEventCard` backed by `SceActivityPresentationModel` — densities **HERO · STANDARD · COMPACT · MICRO** (see master doc terminology rule for the SCE activity card family).

**Domain-specific canonical (preserved):** tournament fixture presentation · Wochenplaner MICRO · tournament fixture GRID · Infoboard kiosk/channel (aligned) · Programme Engine as activity presentation consumer.

---

## Mission

Standardize and evolve **information presentation within** accepted workspace surfaces — capability cards, summary metrics, object/identity presentation, the **SCE activity card family**, density behaviour, legacy card inventory, Communication-inspired card quality, domain-specific compositions, and **Infoboard fallback match presentation P0** (now **closed**).

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

## Governance (closure template)

| Field | DS-04 value |
| --- | --- |
| `SCE_DESIGN_SYSTEM_COMPLIANCE` | **PASS** (cards / information presentation scope) |
| `WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE` | **PASS** |
| `BINARY_CONTROL_COMPLIANCE` | **PASS** |
| `NEW_BINARY_CHECKBOXES` | **0** |
| `CANONICAL_TOGGLES_USED` | **YES** |
| `PARALLEL_PATTERN_INTRODUCED` | **NO** |
| `UNEXPLAINED_LEGACY_CARD_FAMILIES_ALLOWED_AT_DS10_CLOSURE` | **NO** |
| `DATABASE_MIGRATION_REQUIRED` | **NO** |
| `SCHEMA_DRIFT` | **NO** |
| `PERSISTENT_TEST_DATA` | **0** |
| `PROD` | **UNTOUCHED** |

```text
DS04_STATUS = CLOSED / ACCEPTED / MERGED
SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS
NEXT_PACKAGE = SCE-DESIGN-SYSTEM-05 — Forms & Controls
CARD_SYSTEM_PRODUCT_WIDE = YES
ACTIVITY_CARD_FAMILY_CANONICAL = YES
WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE = PASS
INFOBOARD_MATCH_PRESENTATION_P0 = CLOSED
P0_INFOBOARD_MATCH_PRESENTATION = CLOSED_BY_DS04
COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES
COMMUNICATION_IS_UNIVERSAL_CARD_TEMPLATE = NO
BINARY_CONTROL_COMPLIANCE = PASS
NEW_BINARY_CHECKBOXES = 0
CANONICAL_TOGGLES_USED = YES
MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED
SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED
```

---

## Related

- [`SCE-DESIGN-SYSTEM-03.md`](./SCE-DESIGN-SYSTEM-03.md)
- [`SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md`](../design/SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md)
