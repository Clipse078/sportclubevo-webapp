# Risk and regression matrix — DS 2.0

## 1. Technical risks

| ID | Risk | Cause | Mitigation | Owner package |
| --- | --- | --- | --- | --- |
| R-T1 | Invisible text on white panels | `--foreground` still light while surface flips | Migrate text tokens **with** surfaces in one flag | DS2-01 |
| R-T2 | Specificity wars | Mix of `.sce-type-*`, Tailwind arbitrary vars, inline styles | Token-first PR checklist; grep for `#0a0f1e` | DS2-06 |
| R-T3 | SSR/hydration flash | Tenant vars + theme on `html`/`body` | Pre-paint style injection (existing layout pattern) | DS2-01 |
| R-T4 | `color-mix(…, white)` accent wash invisible | Accent derived on white-on-white | Re-derive accent formula for light canvas | DS2-01, Tenant |
| R-T5 | Match result numerals low contrast | `--sce-match-result-foreground` ivory on white | Dark result typography on white cards | DS2-04 |
| R-T6 | Dual card systems diverge | Legacy `MatchCard` not migrated | Enforce imports via lint or governance | DS2-06 |
| R-T7 | Icon removal breaks wayfinding | Users relied on glyph colour | Uppercase + weight active state; user testing | DS2-03 |
| R-T8 | TeamName truncation accessibility | Long names clipped | `title` + full string in a11y tree | DS2-02 |
| R-T9 | Infoboard regression | Accidental global CSS | Hard boundary — no `@import` from admin white | DS2-01 |
| R-T10 | CMS website clash | `lib/cms/design-system.ts` separate | Dedicated CMS package | LATER |

## 2. Programme / governance risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| R-G1 | DS-02 “dark navy canonical” doc drift | PO amendment + DS-12 charter |
| R-G2 | Unclassified exceptions | Update `sce-design-system-exception-registry.ts` per module |
| R-G3 | BINARY_CONTROL regression | **NEW_BINARY_CHECKBOXES = 0** — use existing `SwitchToggle` only |

## 3. Regression test matrix

| Area | Existing tests | White edition action |
| --- | --- | --- |
| Foundations | `sce-design-system-02-foundations.test.ts` | Update expected token names/values |
| Cards | `sce-design-system-04-cards.test.ts`, `sce-ui-rollout-01d–g` | Snapshot class strings |
| Activity temporal | `sce-design-system-10-r2-activity-card-temporal.test.tsx` | Unchanged logic; theme wrapper |
| Navigation | `AdminSidebar.test.tsx`, `sce-navbar-upgrade-01-*` | Assert no nav item icons |
| Dense UI | `sce-design-system-08-dense-ui.test.ts` | Scroll + contrast |
| Governance CLI | `run-design-system-governance.ts` | PASS baseline 2003 files / 10 rules |
| Infoboard | `components/infoboard/**/__tests__` | **Must stay green** without edits |
| Planning responsive | `sce-planner-ux-08-07-responsive.test.ts` | Re-run on white |

## 4. Governance run (SCE-DS2-00 audit)

```
[sce-design-system-governance] filesScanned=2003 ruleCount=10 durationMs=115 exceptions=10 pass=YES
```

## 5. Manual UAT (deferred)

Per package brief, **no manual browser UAT** in `SCE-DS2-00`. Implementation packages require PO-owned visual acceptance on:

- `app/sce-preview/match-card`
- `app/sce-preview/training-card`
- `app/sce-preview/tournament-card`
- `app/sce-preview/club-event-card`
- Authenticated dashboard + planner sample routes

## 6. Rollback strategy

- Feature flag `SCE_WHITE_EDITION` (proposed) — instant revert to v1.0 dark tokens.
- Tenant branding vars unchanged structurally — rollback does not corrupt DB.

## 7. Highest-impact files (change freeze until package assigned)

| File | Reason |
| --- | --- |
| `app/globals.css` | Token cascade |
| `components/admin/layout/AdminSidebar.tsx` | Nav contract |
| `components/sporting-activity/Sce*Card.tsx` | User-visible fixture/training UI |
| `lib/sporting-activity-presentation/canonical/match-card-rich-density.ts` | Team typography scale |
