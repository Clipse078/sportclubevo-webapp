# SCE-CD-04R5-PKG-01 — Strategiekonzeption workflow closure

**Programme:** Vereinsentwicklung (SCE-CD-04 completion)  
**Status:** Ready for review (spec only; no migrations; no Organigramm scope)  
**Base branch:** `cursor/sce-strategy-backlog-sprints-01`  
**Dependency note:** Preserves open PR **#980** (Organigramm) unmerged — no cherry-pick/merge from that line.

## Intent

Close the **navigation and comprehension gap** between implemented capabilities (Strategie, Vorhaben & Prioritäten, Umsetzungsplanung, Aufgabenboard, Rückblick) without new schema or CD-WORK lens rebuild. Product label **Strategiekonzeption & Dokumentation** maps to the composed flow: *Ziele & Kennzahlen → Vorhaben → Umsetzungsphasen*, with **Prüfung & Freigabe** on existing governance surfaces.

## Scope (in)

1. **Übersicht** (`ClubDevelopmentOverview`): add module shortcuts + deep links for:
   - `/vereinsleitung/strategie` (Strategiekonzeption / Ziele & Kennzahlen rollup)
   - `/vereinsleitung/initiativen/backlog` (Vorhaben & Prioritäten)
   - `/vereinsleitung/sprints` (Umsetzungsplanung)
2. **Strategie** (`StrategyOverviewPanel`): per target, link to target detail **and** filtered backlog when `linkedInitiativeCount > 0` (query param or documented anchor; no new API).
3. **Vorhaben & Aufgaben** (`/vereinsleitung/vorhaben`): replace “In Arbeit” stub with a **routing hub** (cards only) pointing to Vorhaben-Liste, Vorhaben & Prioritäten, Aufgaben-Inbox, Umsetzungsplanung — still not full CD-WORK lens (deferred PKG-02).
4. **Documentation:** one paragraph in this file’s “Verified” section after implementation; optional one-line refresh in `docs/roadmap/SCE-CD-00-ARCHITECTURE-BASELINE.md` B.6 only (hub no longer “demo”).
5. **Tests:** extend `components/admin/club-development/__tests__/ClubDevelopmentOverview.test.tsx` and/or `sce-cd-04r4-readability-navigation.test.ts` for new hrefs and German labels from `product-copy.ts`.

## Scope (out)

- CD-WORK unified lens, sprint subtask picker (`rootsOnly: false`), JSON→`InitiativeTargetLink` backfill job
- Remote DB migrations (PKG-00 deployment track)
- Meetings, Prozesse persistence, Organigramm (#980)
- PO UAT in browser (PKG-03 checklist)

## Acceptance scenario (end-to-end, post PKG-00 migrations on preview)

Actor: VL member with `targets.view`, `initiatives.manage`, `tasks.manage`.

1. Open **Vereinsentwicklung → Übersicht** — see shortcuts to Strategie, Vorhaben & Prioritäten, Umsetzungsplanung (in addition to Ziele/Sitzungen).
2. Open **Strategie** — create or open a Ziel with Kennzahlen; note Outcome- vs Umsetzungs-Fortschritt.
3. From Strategie or Ziel-Detail, reach **Vorhaben & Prioritäten**; create Vorhaben with **Einordnung** and **Erwartetes Ergebnis**; link Ziel on Vorhaben-Detail (**Kennzahlen** section on Ziel remains source of truth).
4. Create **Umsetzungsphase** (geplant), plan Aufgaben via bulk panel (**Aufgabenboard** tab after start).
5. Close phase with **Rückblick**; move unfinished Aufgaben into **künftige Umsetzungsphase** via close workflow.
6. Open linked Aufgabe workspace — see **Primäres Vorhaben**, **Zugeordnete Umsetzungsphase**, **Zurück zur Umsetzungsphase**.

**Verified user behavior** requires authenticated preview after migrations — not claimed until PKG-03 UAT.

## Implementation evidence targets

| Artifact | Path |
|----------|------|
| Overview | `components/admin/club-development/ClubDevelopmentOverview.tsx` |
| Strategie panel | `components/admin/club-development/StrategyOverviewPanel.tsx` |
| Vorhaben hub | `app/(admin)/vereinsleitung/vorhaben/page.tsx` |
| Copy | `lib/club-development/product-copy.ts` |
| Nav (unchanged labels) | `lib/nav/nav-config.ts` |

## Risks

- Duplicated nav labels (“Vorhaben & Aufgaben” vs “Vorhaben & Prioritäten”) until PKG-02; hub copy must explain distinction.
- Strategy backlog filter without API may need `?targetId=` on backlog page — if missing, add read-only filter in PKG-01 (small).

## PKG ordering (remainder)

| Order | ID | Focus |
|-------|-----|--------|
| 0 | PKG-00 | Apply SCE-CD-04 migrations 1–3 on STAGE/preview |
| 1 | **PKG-01** | This package — workflow navigation & Strategiekonzeption lens |
| 2 | PKG-02 | CD-WORK Vorhaben lens (replace hub with real filtered workspace) |
| 3 | PKG-03 | Authenticated PO UAT script + `linkedInitiativeRefs` backfill optional job |
| 4 | PKG-04 | Sprint planning includes subtasks policy + tests |