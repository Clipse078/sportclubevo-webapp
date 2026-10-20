# DS-08 → DS-09 handoff — Responsive & Accessibility Hardening

**DS-08 does NOT claim** product-wide responsive quality or accessibility conformance is complete.

DS-08 established canonical **dense UI language**, **representative adoption** (Personen & Zugänge entity list, Roles semantic table, Billing table bridge), and **Server Component–safe** dense primitives. Remaining horizontal overflow, breakpoint refinement, touch-target hardening, responsive density optimisation, and accessibility hardening are explicitly owned by **SCE-DESIGN-SYSTEM-09**.

## DS-09 scope (minimum)

| Area | Notes |
| --- | --- |
| Horizontal overflow review | Product-wide audit — dense tables, toolbars, filters |
| Responsive table strategy | Column collapse, controlled scroll, metadata stacking |
| Mobile metadata stacking | Entity lists + tabular fallbacks |
| Breakpoint quality | Narrow desktop / tablet behaviour |
| Touch targets | Dense controls on touch devices |
| Keyboard navigation | Dense rows, sort headers, pagination, row actions |
| Focus visibility | Tables, lists, toolbars, modals |
| Semantic structure | Landmarks, headings, table/list semantics |
| Screen-reader semantics | Sort state, selection, row actions |
| Reduced motion | Skeletons, transitions on dense surfaces |
| Zoom / reflow | 200% zoom, reflow without loss of function |
| Text truncation / wrapping | Long labels, metadata, status copy |
| Bottom navigation / content collision | Mobile workspace chrome |
| Sticky / fixed UI collision | Headers, context tabs, dense toolbars |
| Modal / dialog responsive behaviour | DS-06 dialogs + dense pickers |
| Workspace / header / context-tab responsiveness | DS-03 surfaces |
| Activity cards | DS-04 presentation |
| Forms | DS-05 controls in dense toolbars |
| Feedback states | DS-07 empty/loading/error in dense regions |
| Dense UI | Final hardening of `components/sce/dense/*` adoption sites |

## Programme locks (unchanged by DS-08 closure)

```text
RESPONSIVE_FINAL_HARDENING = DS09
ACCESSIBILITY_FINAL_HARDENING = DS09
PRODUCT_WIDE_RESPONSIVE_AUDIT_REQUIRED = YES
PRODUCT_WIDE_ACCESSIBILITY_AUDIT_REQUIRED = YES
```

Automated classification: `SCE_DESIGN_SYSTEM_08_DS09_HANDOFF_DEBT` in `lib/design-system/sce-design-system-08-meta.ts`.

**DS-09 consumption:** product-wide responsive & accessibility programme — **not** local one-off patches on individual DS-08 screens.
