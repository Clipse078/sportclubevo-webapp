# SCE-CD-04R5 — Vereinsentwicklung completion matrix

**Branch:** `cursor/sce-strategy-backlog-sprints-01`  
**Scope:** Diagnosis + PKG-01 navigation closure (no Organigramm / PR #980; no remote migration apply).

Product label **Strategiekonzeption & Dokumentation** denotes the composed workflow *Ziele & Kennzahlen → Vorhaben → Umsetzungsphasen* plus **Prüfung & Freigabe** on existing governance surfaces — not a single “strategy document” module.

## Completion matrix (workflow order)

| Step | Product surface | Route(s) | Data | PKG-01 state |
|------|-----------------|----------|------|--------------|
| 1 | Vereinsentwicklung **Übersicht** | `/vereinsleitung/club-entwicklung` | Live aggregates | **Navigation improved** — shortcuts to Strategie, Vorhaben & Prioritäten, Umsetzungsplanung, Vorhaben-Hub |
| 2 | **Pläne & Ziele** (authoring) | `/vereinsleitung/targets`, detail, composer | `Target`, `TargetMetric`, datapoints | **Working** — create, edit, persist, revisit |
| 3 | **Strategie** (authoring + progress) | `/vereinsleitung/strategie` | `ClubStrategy`, focus links, doc refs + rollup query | **PKG-05 working** — club-wide Ausgangslage/Ausrichtung, Schwerpunkte→Ziele, Workspace-Unterlagen, progress panel below |
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
| Strategic **direction** (objectives) | `Target` + **PKG-05 `ClubStrategy`** (Ausgangslage, Ausrichtung, Periode) | No SWOT/OKR modules; no AI authoring |
| **Rationale** | Club strategy text + `linkedMeetingRefs` / `linkedDecisionRefs` on `ClubStrategy` | Association editor on Strategie (Sitzungen & Beschlüsse); save does not imply approval |
| **Kennzahlen** | `TargetMetric` on Ziel detail | Unchanged — Strategie rollup only |
| **Supporting documents** | **PKG-05** `ClubStrategyDocumentReference` (Leitbild / vereinbart / supporting) with workspace visibility | **Prozesse & Richtlinien** (CD-PROCESS) still demo-only — out of PKG-05 scope |
| **Revisit / edit** | Draft-friendly saves, `contentRevision` audit on narrative fields | No “agreed” label on save alone |

**Conclusion (PKG-05):** `/vereinsleitung/strategie` is now **authoring + progress**: club narrative, Schwerpunkte by reference to Ziele, workspace doc links, then existing Zielerreichung/Umsetzungsfortschritt cards. **Prozesse** persistence remains deferred (CD-PROCESS).

### PKG-05 residual gaps

| Gap | Notes |
|-----|--------|
| Meeting/decision association editor | Shipped (`StrategyAssociationLinkEditor`); requires migration on STAGE for persistence |
| PO UAT | Manual acceptance on preview/stage (PKG-03 track) |
| Preview DB migration | `20261115150000_sce_cd_05_club_strategy_authoring` required on env before persistence works |

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
| 4 | `20261115150000_sce_cd_05_club_strategy_authoring` | Yes (finished 2026-11-15T16:21:42.561Z) | Yes |

`pendingMigrationsBeforeApply`: empty for CD-04 + PKG-05 club-strategy set on canonical STAGE (re-verified read-only for PKG-06 handoff). **cd04SchemaReady / cd04R2SchemaReady / clubStrategySchemaReady:** YES.  
**Deploy permission:** not exercised in this package (PKG-00 track for pipeline only).

## Remaining packages (workflow order)

| Order | ID | Focus | Blocker |
|-------|-----|--------|---------|
| — | PKG-00 | Pipeline migration apply on non-STAGE envs | Ops |
| ✓ | **PKG-01** | Navigation & workflow comprehension | — |
| ✓ | **PKG-02** | CD-WORK Vorhaben lens (replace hub) | — |
| 3 | **PKG-03** | Authenticated PO UAT + optional `linkedInitiativeRefs` backfill | Migrations on preview tenant data |
| 4 | **PKG-04** | Subtask-in-sprint policy (only if product requires) | Explicit requirement |
| ✓ | **PKG-05** | Club strategy authoring on Strategie route | STAGE migration applied (see PKG-05 handoff) |
| ✓ | **PKG-06** | Vorhaben inline create + Rückblick / board quick links | PR #985 open for PO review — `docs/planning/SCE-CD-04R6-PKG-06-VORHABEN-CREATE-RUECKBICK.md` |