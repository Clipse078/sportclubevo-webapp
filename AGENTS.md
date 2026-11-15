<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Club Development contextual create (SCE)

- Contextual create/link on **Ziel** and **Strategie** parent surfaces must use **inline collapsible cards** (`SceClubDevelopmentContextualCreateCollapsibleShell`), not `Dialog` / `SceClubDevelopmentComposerShell` overlays.
- Enforced via `SCE-DS-GOV-CONTEXTUAL-CREATE-001` and `lib/club-development/sce-contextual-create-governance.ts`.
- List-workspace modal composers (`CreateTargetComposerDialog`, `/initiativen/new`) are unchanged until a separate migration.

## Vereinsentwicklung workspace IA (PKG-05)

- Main nav: **Übersicht**, **Strategie & Ziele** (`/vereinsleitung/strategie-und-ziele?ansicht=`), **Vorhaben & Umsetzung** (`/vereinsleitung/vorhaben-und-umsetzung?ansicht=`), **Sitzungen**. **Prozesse & Richtlinien** stays reachable at `/vereinsleitung/prozesse` but is not in the menu.
- Legacy list routes (`/strategie`, `/targets`, `/vorhaben`, backlog, `/sprints`, `/initiativen`) redirect into consolidated workspaces; detail URLs unchanged.
- Local view switches use `ansicht` query params and dirty-state discard via `VereinsentwicklungWorkspaceViewNav`.

## Vereinsentwicklung visual standard (ClubDevelopmentOverview)

- **Reference route:** `/vereinsleitung/club-entwicklung` (`ClubDevelopmentOverview`). Reuse `SceClubDevelopmentSectionShell`, `SceClubDevelopmentEmptyState`, and `sce-club-development-surface-styles.ts` — do not add a parallel card system.
- **Vorhaben & Umsetzung:** one page subtitle (`CD_VORHABEN_UMSETZUNG_WORKSPACE_COPY.pageSubtitle`); no duplicate intros or shortcut cards inside local views; **Vorhaben** = full-width expandable cards; **Aufgaben** = cross-Vorhaben task list; **Prioritäten** via `VorhabenPrioritaetenControl` on the Vorhaben view only.
- **Copy:** club language only on user-facing surfaces (Sitzungen, Vorhaben, Kennzahlen); no redundant **Verfügbar** badges on working destinations.
- **Governance:** `SCE-DS-GOV-CD-VISUAL-001` + `lib/club-development/sce-vereinsentwicklung-visual-governance.ts`.
- **Remaining adoption:** see `docs/design/SCE-VEREINSENTWICKLUNG-VISUAL-ADOPTION.md` (do not whole-app rewrite outside Vereinsentwicklung without an explicit package).

## Verein (Club) L2 navigation order

PO order for Club domain secondary nav (desktop panel + mobile explorer): **Vereinsentwicklung → Organisation → Personen & Teams → Mitgliedschaft → Vereinsbetrieb → Aufgaben → Finanzen → Sponsoring → Dokumente**. Canonical source: `CLUB_TARGET_L2_GROUPS` / `CLUB_VEREIN_L2_LABEL_ORDER` in `lib/nav/nav-ia-v2/target-ia-matrix.ts`. Vereinsentwicklung children stay: Übersicht → Strategie & Ziele → Vorhaben & Umsetzung → Sitzungen (`nav-config.ts`).
