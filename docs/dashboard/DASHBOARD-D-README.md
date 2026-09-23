# DASHBOARD-D — Personal Workspace Discovery

**Programme:** DASHBOARD-D (discovery / architecture only)  
**Branch:** `cursor/dashboard-d-personal-workspace-discovery`  
**Base SHA:** `a49190300247ca766160ab402c8b6dc96596b4be` (STAGE)

## Product principle

**Dashboard = Mein Verein aus meiner Perspektive**

The dashboard must become a personalized operational layer across SCE modules—not a miniature copy of every module, and not a club-wide operations board shown to whoever is logged in.

## Deliverables

| Document | Purpose |
|----------|---------|
| [DASHBOARD-D-BENCHMARK.md](./DASHBOARD-D-BENCHMARK.md) | World-class interaction benchmark |
| [DASHBOARD-D-CONTRACT-MAP.md](./DASHBOARD-D-CONTRACT-MAP.md) | Domain contracts, gaps, current component inventory |
| [DASHBOARD-D-RELEVANCE-MATRIX.md](./DASHBOARD-D-RELEVANCE-MATRIX.md) | Source × relevance × auth × zero-disclosure |
| [DASHBOARD-D-UX-BLUEPRINT.md](./DASHBOARD-D-UX-BLUEPRINT.md) | Hierarchy, wireframes, responsive, a11y |
| [DASHBOARD-D-QUICK-ACCESS-SPEC.md](./DASHBOARD-D-QUICK-ACCESS-SPEC.md) | Schnellzugriff registry & personalization |
| [DASHBOARD-D-PERSONAL-PROGRAMME-SPEC.md](./DASHBOARD-D-PERSONAL-PROGRAMME-SPEC.md) | Mein Programm aggregation |
| [DASHBOARD-D-ATTENTION-SPEC.md](./DASHBOARD-D-ATTENTION-SPEC.md) | Benötigt meine Aufmerksamkeit |
| [DASHBOARD-D-IMPLEMENTATION-PLAN.md](./DASHBOARD-D-IMPLEMENTATION-PLAN.md) | DASHBOARD-01…07 roadmap |

## Discovery verdicts (summary)

See final report in PR description. Condensed:

- **A** Personal context: **partially ready** — `Person.userId`, team sporting relations, `PersonAssignment`, org memberships exist; no unified `PersonalContext` resolver yet; programme ignores `PersonAssignment` today.
- **B** Programme aggregation: **feasible** via extending `lib/personal-agenda` + domain projection adapters; must not duplicate match/training business logic.
- **C** Calendar reuse: **yes** — generalize month grid from Matchcenter + existing `PersonalKalenderMonthView`.
- **D** Tasks: **yes** — consume `lib/personal-actions` / `listMyTasks`.
- **E** Registration attention: **not personal today** — tenant-wide counts; needs assignee/responsibility scoping.
- **F** Other attention: tasks/participation/requirements via personal-actions; meetings overdue actions partially ready.
- **G** Quick access registry: **partial** — `NAV_SECTIONS` is canonical for nav; dashboard has separate `QUICK_ACTION_CATALOG`.
- **H** DB persistence for pins: **recommended** per-user-per-tenant; no model yet (reuse pattern like `UserNotificationPreference`).
- **I** Schema later: **likely** one preference table or JSON on membership; hero prefs already on `User`.
- **J** Removable after replacement: KPI strip, Heute im Verein prominence, large hero, global attention counts, creation-only Schnellaktionen strip.
- **K** Top risks: team-scoped event query without resource visibility; club-wide today feed; attention by permission not relationship.
- **L** Sequence: validate in DASHBOARD-01…07 as documented in implementation plan.

**Status:** DASHBOARD-D PASS — architecture defined, ready for DASHBOARD-01.
