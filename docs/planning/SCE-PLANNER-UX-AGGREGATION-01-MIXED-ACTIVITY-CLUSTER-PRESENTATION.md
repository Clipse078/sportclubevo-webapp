# SCE-PLANNER-UX-AGGREGATION-01 — Mixed Activity Cluster Presentation

**Status:** PLANNED

**Priority:** High UX / data-semantics improvement

**Not part of:** PR #801 / SCE-PLANNER-UX-08-04

---

## Problem

Planning **Kalender** may label a mixed simultaneous activity cluster using only one activity type.

**Observed during 08-04 Human UAT (FCA Club Admin, Vercel Preview):**

| Surface | Copy |
|---------|------|
| Calendar cluster card | «10 Trainings» |
| Canonical detail / inspector | 10 Aktivitäten · 9 Trainings · 1 Spiel |

This is semantically incorrect and erodes trust in operational summaries.

---

## World-class target

Introduce one **canonical activity-cluster aggregation / presentation model** shared by:

- Kalender cluster cards
- Simultaneous-activity inspector
- Conflict inspector
- Other Planner summaries where applicable

The aggregation must expose at least:

- `totalActivityCount`
- `countByActivityType`
- `conflictCount`
- Facility / resource summary where needed

### Presentation rules

**Homogeneous cluster** — if every activity has the same type:

> 7 Trainings  
> ⚠ 7 Konflikte

**Mixed cluster** — never label the entire cluster as one activity type:

> 10 Aktivitäten  
> ● 9 Trainings · ● 1 Spiel  
> ⚠ 8 Konflikte

Use canonical activity identity semantics:

- Training = blue
- Spiel = red
- Turnier = orange
- Veranstaltung = canonical event identity color

Another example:

> 6 Aktivitäten  
> 3 Trainings · 2 Spiele · 1 Turnier

Cards remain compact; do not show every activity title on the aggregate card. Opening the cluster exposes the detailed inspector.

---

## Critical architecture principle

The card and inspector must consume the **same canonical aggregation truth**.

Do not independently calculate one summary for the card and another for the inspector. That pattern causes «10 Trainings» vs «9 Trainings + 1 Spiel» drift.

---

## Suggested future package outcomes

- Canonical `ActivityClusterSummary`
- Shared `countByActivityType`
- Homogeneous / mixed presentation rules
- Compact responsive composition
- Accessibility labels
- Regression tests for mixed clusters
- No semantic mislabelling

---

## Sequence position

Independent follow-up discovered during **08-04** Human UAT. Remains **after** the canonical **08-05…08-08** sequence unless the master roadmap is explicitly reordered. Related to but distinct from **08-06** (list / search / bulk operational UX).
