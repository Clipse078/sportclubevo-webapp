# SCE-DESIGN-SYSTEM-07 — Feedback & status migration inventory

**Machine-readable gate for DS-10:** `FEEDBACK_STATUS_MIGRATION_INVENTORY`

Typed rows live in `lib/design-system/sce-design-system-07-meta.ts` (`SCE_DESIGN_SYSTEM_07_FEEDBACK_INVENTORY`).

## Classification legend

| Classification | Meaning |
| --- | --- |
| **CANONICAL** | Already aligned — refine only |
| **CANONICAL_WITH_REFINEMENT** | Canonical target exists; minor drift |
| **MIGRATE_DS07** | Addressed in DS-07 representative adoption |
| **MIGRATE_LATER_DS10** | Inventoried for DS-10 product-wide sweep |
| **DOMAIN_SPECIFIC_CANONICAL** | Justified domain pattern (activity types, infoboard feed) |
| **DUPLICATE** | Local copy of empty/loading/skeleton — consolidate |
| **LEGACY_REPLACE** | Generic errors, ad-hoc alerts — replace with actionable UX |

## DS-07 completed migrations

| Surface | Before | After |
| --- | --- | --- |
| Email Sender | Local readiness section + `AdminStatusPill` headline | `SceReadinessStatusPanel` |
| Tournament Planung | Ad-hoc incomplete / planning panels | `SceReadinessStatusPanel` + `SceSemanticFeedback` |
| Personen & Zugänge | `EmptyState` | `SceEmptyState` variants |
| Mein Programm | `DashboardEmptyState` | Bridge → `SceEmptyState` semantics |
| Planning Hub | Local filtered empty copy | `SceEmptyState` FILTERED_NO_RESULTS |
| Planung setup dialog | Toast + close on load error | `SceActionableError` + retry + skeleton load |

## Known remaining debt (DS-10)

- 90+ `EmptyState` call sites via bridge — bulk semantic variant pass
- Local skeleton copies (Editorial, Homepage builder)
- API-layer `Interner Fehler.` defaults (billing native API)
- `PersonContactTab` inline empty function
- Full-screen spinners in legacy admin modules

```text
STATUS_FEEDBACK_SYSTEM_PRODUCT_WIDE = YES
READINESS_SYSTEM_CANONICAL = YES
EMPTY_STATE_SYSTEM_CANONICAL = YES
LOADING_SYSTEM_CANONICAL = YES
ACTIONABLE_ERROR_UX_REQUIRED = YES
GENERIC_INTERNAL_ERROR_AS_DEFAULT = NO
```
