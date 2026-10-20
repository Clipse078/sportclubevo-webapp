# DS-07 → DS-08 handoff — Personen & Zugänge dense UI

**DS-07 does NOT claim** the Personen & Zugänge administrative list/table is visually final.

DS-07-R1 refined **feedback-only** layers inside the existing list workspace:

- filtered / no-results empty states (`SceEmptyState` contained in the list surface)
- filter reset actions
- loading skeleton geometry (`people-access-list` recipe)
- local actionable errors (where adopted)

## Remaining visual debt (DS-08 scope)

| Area | Notes |
| --- | --- |
| Dense administrative table/list hierarchy | Row/column scanning, not feedback cards |
| Row density | Comfortable admin density vs. Communication calm |
| Column alignment | Multi-breakpoint grid consistency |
| Responsive dense UI | Mobile row stacks vs. desktop grid |
| Table/list actions | Row menus, bulk actions placement |
| Table headers | Sticky/scanning hierarchy |
| Row hover/focus | Keyboard and pointer affordances |
| Status placement | Status pills vs. metadata columns |
| Metadata density | Secondary lines, scope summaries |

Automated classification: `SCE_DESIGN_SYSTEM_07_DS08_HANDOFF_DEBT` in `lib/design-system/sce-design-system-07-r1-meta.ts`.

**DS-08 consumption:** representative dense list redesign on Personen & Zugänge + canonical primitives in `components/sce/dense/*`. Full product-wide migration remains **DS-10**.
