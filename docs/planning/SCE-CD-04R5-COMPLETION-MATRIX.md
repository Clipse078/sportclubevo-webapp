# SCE-CD-04R5 — Vereinsentwicklung completion matrix

**Branch:** `cursor/sce-strategy-backlog-sprints-01`  
**Scope:** Diagnosis + PKG-01 navigation closure (no Organigramm / PR #980; no remote migration apply).

Product label **Strategiekonzeption & Dokumentation** denotes the composed workflow *Ziele & Kennzahlen → Vorhaben → Umsetzungsphasen* plus **Prüfung & Freigabe** on existing governance surfaces — not a single “strategy document” module.

## Completion matrix (workflow order)

| Step | Product surface | Route(s) | Data | PKG-01 state |
|------|-----------------|----------|------|--------------|
| 1 | Vereinsentwicklung **Übersicht** | `/vereinsleitung/club-entwicklung` | Live aggregates | **Navigation improved** — shortcuts to Strategie, Vorhaben & Prioritäten, Umsetzungsplanung, Vorhaben-Hub |
| 2 | **Pläne & Ziele** (authoring) | `/vereinsleitung/targets`, detail, composer | `Target`, `TargetMetric`, datapoints | **Working** — create, edit, persist, revisit |
| 3 | **Strategie** (progress lens) | `/vereinsleitung/strategie` | Rollup query | **Read-only overview** — links to Zieldetails and filtered Backlog; not strategy authoring |
| 4 | **Vorhaben & Prioritäten** | `/vereinsleitung/initiativen/backlog` | `Initiative` backlog fields | **Working** — `?targetId=` filter from Strategie |
| 5 | **Vorhaben** list/detail | `/vereinsleitung/initiativen/*` | Initiatives, milestones, target links | **Working** |
| 6 | **Vorhaben & Aufgaben** workspace | `/vereinsleitung/vorhaben` | Initiatives + linked root `Task` rows | **Working (PKG-02)** — filtered CD-WORK lens; API `GET /api/club-development/vorhaben-workspace`; tests in `vorhaben-workspace.test.ts` (manual PO UAT: PKG-03) |
| 7 | **Umsetzungsplanung** | `/vereinsleitung/sprints/*` | `DevelopmentSprint` | **Working** (requires migrations on DB) |
| 8 | **Aufgaben** | `/dashboard/aufgaben`, task workspace | `Task` | **Working** — primary initiative + sprint associations |
| 9 | **Prozesse & Richtlinien** | `/vereinsleitung/prozesse` | Demo only | **Not started** (CD-PROCESS) |
| 10 | **Prüfung & Freigabe** | Governance cards, target/initiative stages | Existing governance | **Working** on entity surfaces |

## Strategiekonzeption & Dokumentation — gap (authoring vs overview)

| Capability | Supported today | Gap |
|------------|-----------------|-----|
| Strategic **direction** (objectives) | `Target` title, description, category, scope via targets UI | No club-wide “strategy narrative” artifact separate from targets |
| **Rationale** | Target/initiative text fields; meeting decisions | No dedicated persisted strategy rationale document |
| **Kennzahlen** | `TargetMetric` + datapoints on target detail | Kennzahlen remain on Ziel — Strategie page is rollup only |
| **Supporting documents** | Workspace documents on other domains; **Prozesse** demo | **Prozesse & Richtlinien** not persisted — documentation slice of label is open |
| **Revisit / edit** | Full target & initiative lifecycles | Strategie route is read-only progress; edit via Pläne & Ziele or Vorhaben |

**Conclusion:** Users can create, persist, edit and revisit **Ziele** and **Vorhaben** (including Einordnung, Erwartetes Ergebnis, Kennzahlen on targets). The **Strategie** screen is an **authoring-adjacent progress overview**, not a substitute for Strategiekonzeption authoring. Persisted **Richtlinien/Prozesse** documentation is the main missing slice of “Dokumentation”.

### Next package for missing functionality

**PKG-05 — Strategiekonzeption authoring slice (proposed)**  
Minimal scope aligned with CD-00 (documentation-first Prozesse later; no new framework):

1. Extend **Target** detail with an optional **Strategische Begründung** (`rationale` or reuse description with labeled section) surfaced on Strategie cards (read-only mirror).
2. Optional **Workspace document link** section on target detail (“Strategische Unterlagen”) using existing document links — no new blob store.
3. Empty states on `/vereinsleitung/strategie` that point to **Pläne & Ziele** for authoring, not implying completion.

Defer full **CD-PROCESS** until Prozesse persistence programme; do not block PKG-02/03 on PKG-05.

## Aufgaben & Unteraufgaben policy (Umsetzungsphasen)

| Question | Decision (existing code + PKG-04 deferral) |
|----------|------------------------------------------|
| What is scheduled into **Umsetzungsphasen**? | **Root tasks only** — `searchClubDevelopmentTaskCandidates` defaults `rootsOnly: true` (`parentTaskId: null`). Sprint bulk panel uses this picker. |
| **Unteraufgaben** | Managed **under the parent task** in Aufgaben workspace (`parentTaskId`, max depth 1). Not independently planned into sprints unless PKG-04 explicitly adds `rootsOnly: false` with product sign-off. |
| Independent subtask assignment to phases | **Not intended** without PKG-04 requirement |

## STAGE migration readiness (read-only, separate from deploy permission)

Verified via designated scripts against canonical STAGE fingerprint `acd3b37682911890` (no credentials logged; no `migrate deploy`).

| Migration | Name | STAGE applied | Schema ready |
|-----------|------|---------------|--------------|
| 1 | `20261113183000_sce_cd_04_strategy_sprints` | Yes | Yes |
| 2 | `20261114103000_sce_cd_04_task_primary_initiative` | Yes | Yes |
| 3 | `20261114180000_sce_cd_04r2_sprint_lifecycle_history` | Yes (finished 2026-11-14T16:18:00Z) | Yes |

`pendingMigrationsBeforeApply`: empty for CD-04 set. **cd04SchemaReady / cd04R2SchemaReady:** YES.  
**Deploy permission:** not exercised in this package (PKG-00 track for pipeline only).

## Remaining packages (workflow order)

| Order | ID | Focus | Blocker |
|-------|-----|--------|---------|
| — | PKG-00 | Pipeline migration apply on non-STAGE envs | Ops |
| ✓ | **PKG-01** | Navigation & workflow comprehension | — |
| ✓ | **PKG-02** | CD-WORK Vorhaben lens (replace hub) | — |
| 3 | **PKG-03** | Authenticated PO UAT + optional `linkedInitiativeRefs` backfill | Migrations on preview tenant data |
| 4 | **PKG-04** | Subtask-in-sprint policy (only if product requires) | Explicit requirement |
| 5 | **PKG-05** | Strategiekonzeption authoring slice (rationale + doc links) | Optional parallel to PKG-02 |