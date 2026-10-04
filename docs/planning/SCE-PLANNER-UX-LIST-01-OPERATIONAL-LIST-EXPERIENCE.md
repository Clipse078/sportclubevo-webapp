# SCE-PLANNER-UX-LIST-01 — Operational List Experience

**Status:** PLANNED

**Priority:** Important UX upgrade — **non-blocking** for SCE-PLANNER-UX-08-04

**Not part of:** PR #801 / SCE-PLANNER-UX-08-04

---

## Current problem

The Planner **Liste** perspective behaves too much like a flat data table.

Human UAT (08-04 closure) showed:

- Weak activity-type hierarchy
- Long visually repetitive rows
- Conflict warnings dominate
- Activity / resource / status semantics are not sufficiently scannable
- Dense football background competes with operational content
- Insufficient visual distinction between Training / Spiel / Turnier / Veranstaltung
- Limited operational / action hierarchy

Liste remains **readable and functional** — this is an improvement opportunity, not an 08-04 blocker.

---

## World-class target

Transform Liste into a dense **operational agenda**.

Primary hierarchy:

**WHEN → TYPE → ACTIVITY → RESOURCES → STATUS → ACTION**

Conceptual row examples:

```
17:00–18:30
TRAINING
Junioren F2
Kunstrasen 2 A · Garderobe E1
Geplant
```

```
20:15–22:15
SPIEL
2. Mannschaft vs FC Oberdorf
Kunstrasen 3 · O4 · E2
Konflikt
```

---

## Future package requirements

- Sticky day / date grouping
- Canonical activity identity colors
- Compact type badge
- Strong activity / team title
- Concise facility / resource line
- Meaningful status badge
- Conflict count / details without warning-icon overload
- Search
- Type filter
- Team filter
- Facility filter
- Conflict filter
- Useful sorting
- Clear selected-row state
- Click row → Activity Detail
- Privileged mutation through explicit contextual action
- No implicit edit on ordinary row click
- Responsive density
- Keyboard navigation / accessibility
- Substantially calmer operational content surface so decorative background does not compete with list data

---

## Reuse (do not fork domain truth)

- `SportingActivityPresentation`
- Activity identity semantics
- Canonical conflict model
- Canonical permissions / capabilities

Do not create a separate list-specific domain truth.

---

## Sequence position

Discovered during **08-04** Human UAT. **Overlaps thematically** with canonical package **08-06** (List / search / bulk operational UX) but captured here as a focused operational-list experience spec. Remains **after 08-05** in the stored sequence unless the master roadmap explicitly merges or reorders packages.
