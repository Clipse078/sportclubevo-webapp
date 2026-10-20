# SCE Design System v1.0 — Action & Dialog Migration Inventory (DS-06)

> **Status:** **READY FOR PO REVIEW** (DS-06) — representative adoption complete; **DS-10 gate** for remaining rows  
> **Package:** [`SCE-DESIGN-SYSTEM-06`](../roadmap/SCE-DESIGN-SYSTEM-06.md)  
> **Master doc:** [`SCE-DESIGN-SYSTEM.md`](./SCE-DESIGN-SYSTEM.md)  
> **Typed audit:** `lib/design-system/sce-design-system-06-meta.ts`

**Marker:** `ACTION_DIALOG_MIGRATION_INVENTORY`

**Micro-UX markers:** `WORLD_CLASS_MICRO_UX_REQUIRED` · `ACTION_MICRO_STATES_AUDITED` · `DIALOG_MICRO_STATES_AUDITED` · `COMPOSER_MICRO_STATES_AUDITED` · `LOCAL_MICRO_PATTERN_DRIFT_ALLOWED = NO` · `SCE_ACTION_DIALOG_MICRO_UX`

---

## Canonical primitive registry (DS-06)

| Category | Canonical primitive | Notes |
| --- | --- | --- |
| PRIMARY / SECONDARY / TERTIARY | `Button` · `SceActionLink` | One primary per local decision context |
| DESTRUCTIVE | `Button` variant `danger` | Not styled as primary |
| ICON ACTION | `SceIconButton` | Required `aria-label`; `Button` size `icon` |
| WORKSPACE ACTIONS | `SceWorkspaceHeader` · `PageActions` | Calm hierarchy — Communication reference |
| OVERFLOW MENU | `SceOverflowMenu` · `PopoverContent` | Shared item/trigger tokens |
| DIALOG SHELL | `Dialog` on `SceModalOverlay` | `useSceModalDialog` focus trap |
| CONFIRMATION | `SceConfirmDialog` | Wraps Dialog — **no** parallel modal system |
| COMPOSER | `SceActivityComposer` | Overlay · page · mobile fullscreen · dirty guard |
| DRAWER | `Sheet` | Person create, secondary panels |
| DIRTY GUARD | `SceContextDirtyGuardProvider` | `confirmNavigationIfDirty` |

---

## Action hierarchy (semantic)

| Level | Examples | Target |
| --- | --- | --- |
| PRIMARY | Erstellen · Speichern · Senden · Bestätigen | `Button` / `SceActionLink` primary |
| SECONDARY | Entwurf speichern · Weiter · Zurück (guided) | `Button` secondary |
| TERTIARY / TEXT | Abbrechen · Öffnen · Zurück (low emphasis) | `Button` ghost / link |
| DESTRUCTIVE | Löschen · Entfernen · Widerrufen | `Button` danger + `SceConfirmDialog` when risk warrants |
| ICON ACTION | Edit · Delete · Overflow · Close | `SceIconButton` |

**Destructive kinds:** `DESTRUCTIVE_IMMEDIATE` vs `DESTRUCTIVE_REQUIRES_CONFIRMATION` — confirmation depends on **consequence**, not the word „Löschen“ alone.

---

## Dialog types (semantic)

| Type | Use |
| --- | --- |
| INFORMATIONAL | Read-only context |
| DECISION | Reversible choice |
| CONFIRMATION | Standard confirm/cancel |
| DESTRUCTIVE_CONFIRMATION | Irreversible or high-impact |
| FORM_DIALOG | Short forms on overlay |
| COMPOSER | `SceActivityComposer` — domain workflows |

---

## Nested dialog inventory

| PATTERN | ROUTES | CLASSIFICATION | NOTES |
| --- | --- | --- | --- |
| SceClubTeamSelectorDialog elevated over Composer | Activity create | JUSTIFIED_EXCEPTION | Prefer secondaryPanel/combobox DS-10 |
| PlanningHubManipulationModalShell elevated | Planning hub | JUSTIFIED_EXCEPTION | Operational conflict workspace |
| Legacy inline confirm panels | Registrations, admin | MIGRATE_LATER | Adopt `SceConfirmDialog` |
| Modal picker → second modal | Reusable components | MIGRATE_LATER | Single state machine / full-page |

**Policy:** `AVOID MODAL → MODAL` — prefer popover, combobox, composer `secondaryPanel`, same-dialog state transition.

---

## Inventory table (significant families)

| CURRENT_COMPONENT / PATTERN | DOMAIN / ROUTES | SEMANTICS | CLASSIFICATION | CANONICAL_TARGET | DS06_ACTION | FUTURE_PACKAGE | STATUS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Communication hub Link CTAs | `/dashboard/communication` | PRIMARY + SECONDARY | MIGRATE_DS06 | SceActionLink | MIGRATED | — | DS06_DONE |
| UserRowActionsMenu confirmations | Admin users | DESTRUCTIVE_CONFIRMATION | MIGRATE_DS06 | SceConfirmDialog + SceOverflowMenu | MIGRATED | — | DS06_DONE |
| TurniereTournamentRecordDeleteDialog | Tournament record | DESTRUCTIVE_CONFIRMATION | MIGRATE_DS06 | SceConfirmDialog | MIGRATED | — | DS06_DONE |
| SceActivityComposerFooter | Activity create | COMPOSER actions | CANONICAL | data-sce-composer-action markers | REFINED | — | DS06_DONE |
| Dialog close affordance | Product-wide | DIALOG micro | CANONICAL | SCE_DIALOG_CLOSE_BUTTON_CLASS | REFINED | — | DS06_DONE |
| Raw fca-button-primary / sce-btn links | Communication lists, legacy | PRIMARY duplicate | DUPLICATE | SceActionLink | PARTIAL | DS-10 | REMAINING |
| Row overflow menus (local triggers) | Match, training, planner | OVERFLOW | MIGRATE_LATER | SceOverflowMenu | INVENTORY | DS-10 | REMAINING |
| RegistrationWorkflowPanel inline confirm | Registrations | DECISION | MIGRATE_LATER | SceConfirmDialog | DEFER | DS-10 | REMAINING |
| SceClubTeamSelectorDialog nested | Composer | FORM nested | DOMAIN_SPECIFIC_CANONICAL | elevated stackLayer | EXCEPTION | DS-10 | INVENTORY |
| Admin legacy `<button className="…">` recipes | Admin modules | MIXED | MIGRATE_LATER | Button | DEFER | DS-10 | REMAINING |

---

## DS-10 obligation

`UNEXPLAINED_LEGACY_ACTION_DIALOG_FAMILIES_ALLOWED_AT_DS10_CLOSURE = NO` — every remaining local action/dialog family must appear here with classification or justified exception before programme closure.

`UNEXPLAINED_MICRO_PATTERN_DRIFT_ALLOWED_AT_DS10_CLOSURE = NO` — local overflow triggers, dialog footers, and icon sizes must canonicalise or be listed.

---

## Composer step semantics (preserved)

| State | Meaning |
| --- | --- |
| UNVISITED | Not yet opened |
| CURRENT | Active step |
| COMPLETED | Reviewed/visited **and** valid |
| ERROR | After meaningful validation only |

**Critical:** OPTIONAL ≠ COMPLETED · VALID ≠ COMPLETED · UNVISITED ≠ ERROR
