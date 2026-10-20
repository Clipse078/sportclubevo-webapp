# SCE Design System v1.0 — Form & Control Migration Inventory (DS-05)

> **Status:** DS-05 representative adoption + DS-10 gate  
> **Package:** [`SCE-DESIGN-SYSTEM-05`](../roadmap/SCE-DESIGN-SYSTEM-05.md)  
> **Master doc:** [`SCE-DESIGN-SYSTEM.md`](./SCE-DESIGN-SYSTEM.md)  
> **Typed audit:** `lib/design-system/sce-design-system-05-meta.ts`

**Marker:** `FORM_CONTROL_MIGRATION_INVENTORY`

---

## Canonical primitive registry (DS-05)

| Category | Canonical primitive | Notes |
| --- | --- | --- |
| FORM_FIELD | `SceFormField` | Composable layers — not every field shows every layer |
| TEXT_INPUT | `SceTextInput` | `.fca-input` tokens |
| TEXTAREA | `SceTextarea` | `.fca-textarea` |
| SELECT | `SceToolbarSelect` + tokenised native `<select class="fca-select">` | Bounded sets |
| COMBOBOX | `SceListSelectorPanel` / inline combobox patterns | Discovery/search select |
| SEARCH | `SceSearchField` | Shared with `SceClubTeamSearch` |
| DATE | `SceActivityDateInput` | Activity/composer smart entry |
| TIME | `SceActivityTimeInput` | |
| DATE_TIME | `SceActivityDateTimeInput` | |
| CHECKBOX | `SceCheckbox` | Multi-select, row select, consent — **not** binary settings |
| SWITCH_TOGGLE | `SwitchToggle` / `SwitchThumb` | Toggle First |
| RADIO / CHOICE | `SceSegmentedControl` | Mutually exclusive compact modes |
| SEGMENTED | `SceSegmentedControl` | Not navigation tabs |
| VALIDATION | `ValidationSummary` + field errors on `SceFormField` | UNVISITED ≠ ERROR |

---

## Binary checkbox re-audit (DS-05)

| Metric | Value |
| --- | ---: |
| `CHECKBOX_OCCURRENCES_AUDITED` (production `.tsx`, post DS-05) | 64 |
| `BINARY_SETTING_CHECKBOXES_FOUND` (estimated remaining) | 31 |
| `BINARY_SETTING_CHECKBOXES_MIGRATED_DS05` | 14 |
| `BINARY_SETTING_CHECKBOXES_DEFERRED` | 17 |
| `LEGITIMATE_MULTI_SELECTION_CHECKBOXES` | 22 |
| `LEGITIMATE_ROW_SELECTION_CHECKBOXES` | 7 |
| `LEGITIMATE_ACKNOWLEDGEMENT_CHECKBOXES` | 2 |

Semantics: **A** binary setting → **SwitchToggle** · **B** multi-selection → checkbox · **C** row selection → checkbox · **D** acknowledgement → checkbox where appropriate.

---

## Inventory table (significant families)

| CURRENT_COMPONENT / PATTERN | DOMAIN / ROUTES | SEMANTICS | CLASSIFICATION | CANONICAL_TARGET | DS05_ACTION | FUTURE_PACKAGE | STATUS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PlannerEntryCreateForm publication | `/dashboard/planner` create | BINARY_SETTING | MIGRATE_DS05 | PlannerEntryCreatePublicationFields | MIGRATED | — | DS05_DONE |
| NotificationPreferencesSection | Admin / notifications | BINARY_SETTING | MIGRATE_DS05 | SwitchThumb | MIGRATED | — | DS05_DONE |
| CommunicationPreferencesSection | `/dashboard/communication` settings | BINARY_SETTING | MIGRATE_DS05 | SwitchThumb | MIGRATED | — | DS05_DONE |
| PersonalSignatureWorkspace / ComposerField | Communication | BINARY_SETTING | MIGRATE_DS05 | SwitchToggle / SwitchThumb | MIGRATED | — | DS05_DONE |
| SponsorBannerConfigForm click tracking | CMS reusable | BINARY_SETTING | MIGRATE_DS05 | SwitchToggle | MIGRATED | — | DS05_DONE |
| LayoutConfigPanel responsive flags | CMS layout | BINARY_SETTING | MIGRATE_DS05 | SwitchThumb | MIGRATED | — | DS05_DONE |
| CompetitionsSearchBar archived filter | Admin competitions | BINARY_SETTING | MIGRATE_DS05 | SwitchToggle | MIGRATED | — | DS05_DONE |
| CompetitionsSearchBar text search | Admin competitions | SEARCH | MIGRATE_DS05 | SceSearchField | MIGRATED | — | DS05_DONE |
| EmailSenderWorkspace sender fields | Email sender | FORM_FIELD | MIGRATE_DS05 | SceFormField + SceTextInput | MIGRATED | — | DS05_DONE |
| WorkspaceListViewOptions columns | Documents workspace | MULTI_SELECTION | CANONICAL | SceCheckbox | LEGITIMATE | — | UNCHANGED |
| CommunicationInboxConversationList | Inbox | ROW_SELECTION | DOMAIN_SPECIFIC_CANONICAL | SceCheckbox | LEGITIMATE | — | UNCHANGED |
| RolePermissionEditor | Roles admin | MULTI_SELECTION | CANONICAL_WITH_REFINEMENT | SceCheckbox | DEFER | DS-10 | REMAINING |
| Legacy Training/Match event create forms | Admin events | BINARY_SETTING | MIGRATE_LATER | SwitchToggle | DEFER | DS-10 | REMAINING |
| CampaignComposer / VorlageManagementForm | Communication | MIXED | CANONICAL_WITH_REFINEMENT | Audit per control | INVENTORY | DS-10 | REMAINING |
| Infoboard designer panels | Infoboard admin | BINARY_SETTING | MIGRATE_LATER | SwitchToggle | DEFER | DS-10 | REMAINING |
| PersonForm toggles | Personen & Zugänge | BINARY_SETTING | CANONICAL | SwitchToggle | PRE_EXISTING | — | CANONICAL |
| SceActivityComposer | Activity create | DOMAIN_SPECIFIC_CANONICAL | CANONICAL | SceActivityDateTimeInput + SwitchToggle | PRESERVED | — | CANONICAL |
| PlannerEntryEditForm local FieldLabel | Planner edit | LABEL | DUPLICATE | SceFormField | DEFER | DS-10 | REMAINING |

---

## DS-10 obligation

`UNEXPLAINED_LEGACY_FORM_FAMILIES_ALLOWED_AT_DS10_CLOSURE = NO` — every remaining legacy control family must appear here with classification or justified exception before programme closure.
