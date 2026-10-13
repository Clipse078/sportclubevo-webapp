# SCE Activity Creation — Design & Architecture Contracts (01A)

> **Status:** **PROPOSED** (research package `SCE-ACTIVITY-CREATE-01A` — not shipped)  
> **Programme:** [`SCE-ACTIVITY-CREATE-01`](../roadmap/SCE-ACTIVITY-CREATE-01.md)  
> **Product principle:** *One creation language, domain-specific workflows.*

This document defines the **target** contracts for unified activity creation. It distinguishes what exists on STAGE today from what implementation packages (01B+) must build.

---

## Classification legend

| Tag | Meaning |
|-----|---------|
| **EXISTING** | On STAGE; reuse as-is |
| **REUSABLE** | On STAGE; adapt/wrap for composer |
| **NEW_REQUIRED** | Not implemented; 01B+ scope |
| **PROPOSED** | Architecture decision pending PO review |

---

## 1. Composer trigger (**NEW_REQUIRED**)

| Contract | Detail |
|----------|--------|
| Visibility | Gated by domain **create/manage** permissions — never view-only |
| Placement | Planning surfaces (Veranstaltungen, Trainings, Matchcenter, Tournamentcenter, Wochenplaner, Team Programme future) |
| Behaviour | Opens **`SceActivityComposer`** in **overlay** mode when launched from in-context planning; does not navigate away until user chooses full-page fallback |
| Label | Domain-specific CTA (e.g. «Veranstaltung erstellen», «Training erstellen») — not generic «Erstellen» |

**EXISTING** entry today: navigation `Link` to `/dashboard/*/new` from management workspaces and `PlanningHubCreateMenu`.

---

## 2. Composer shell (**NEW_REQUIRED**)

| Responsibility | Owner |
|----------------|--------|
| Activity semantic identity header (VERANSTALTUNG / TRAINING / SPIEL / TURNIER + restrained accent) | Shell |
| Close affordance (X), backdrop, Escape | Shell |
| Focus trap, initial focus, focus restore | Shell (`SceModalOverlay` + `useSceModalDialog` pattern) |
| Body scroll lock on underlying planning surface | Shell (`applySceModalOpenSideEffects`) |
| Sticky header / tab row / persistent action footer | Shell |
| Responsive mode: overlay → full-screen composer | Shell |
| Domain fields, validation, submit | Domain workflow via **creation contract** |

**REUSABLE primitives:**

- `components/ui/SceModalOverlay.tsx` — portal, sidebar-aware viewport, elevated stack layer
- `lib/shell/responsive-layout.ts` — `SCE_DIALOG_WORKSPACE_PANEL`, `SCE_DIALOG_VARIANT_FORM`, `max-h-[var(--sce-dialog-max-height)]`
- `components/ui/Dialog.tsx` — focus trap reference (composer may be a sibling variant, not necessarily `Dialog` size presets)

**PROPOSED sizing strategy (evidence-based):**

- Width: bounded by `--sce-dialog-workspace-max-width` / form variant (~960px cap), centered in `--sce-content-viewport-width`
- Height: `max-h-[var(--sce-dialog-max-height)]`; internal body scroll
- Underlying planner: `data-sce-modal-background` + de-emphasis (not a second theme)

---

## 3. Creation contract (**NEW_REQUIRED**)

Conceptual type (orchestration only — **not** a generic field renderer):

```typescript
// Illustrative — implementation in 01B
SceActivityCreateDefinition<TDraft, TResult, TTabId extends ContextTabId>
```

| Responsibility | Notes |
|----------------|--------|
| `activityKind` | TRAINING \| MATCH \| TOURNAMENT \| CLUB_EVENT |
| Semantic title / description | i18n keys |
| Tab config factory | `build*CreateTabNavigationConfig({ tabErrors })` |
| Initial draft | Server-hydrated props → client state |
| `validateDraft` → tab error map + field errors | Club Event pattern: `computeClubEventCreateTabErrors` |
| `firstInvalidTab` | Ordered tab walk |
| `submit` | Domain adapter → existing APIs |
| Success | Close composer, restore origin, toast, optional highlight |
| Cancel / dirty | `SceContextDirtyGuardProvider` |
| Container hint | `overlay` \| `page` \| `fullscreen` — selected by host, not domain |

Domain components remain authoritative (`VeranstaltungCreateForm` panels, future tabbed Training/Match/Tournament bodies).

---

## 4. Contextual tabs (**REUSABLE**)

| Primitive | Status |
|-----------|--------|
| `SceContextTabs` | **EXISTING** |
| `SceContextTabsBoundary` | **EXISTING** |
| `SceContextTabProvider` / `useContextDetailTab` | **EXISTING** — URL `?tab=` via `router.push` |
| `SceContextTabPanel` | **EXISTING** |
| `SceContextDirtyGuardProvider` | **EXISTING** — tab change + `window.confirm` |

**PROPOSED overlay adaptation:** For composer overlay, tab changes should use **in-memory or shallow history** (`replaceState` on a synthetic path or composer-local provider) to avoid polluting the underlying planning URL. Full-page `/new` keeps canonical `?tab=` on pathname (Club Event today).

---

## 5. Validation (**REUSABLE** pattern from Club Event)

| Rule | Source |
|------|--------|
| Free tab navigation — not a forced wizard | Club Event + PO direction |
| Submit validates full draft | `VeranstaltungCreateForm` |
| First invalid tab activated | `firstInvalidClubEventCreateTab` |
| Restrained tab invalid marker (`•`) | `buildClubEventCreateTabNavigationConfig` |
| Field-level errors unchanged | Domain components |

Training/Match/Tournament today use **guided numbered sections** on one scroll surface — migration to tabs is **01C–01F** UX work, not a new validation engine.

---

## 6. Action footer (**REUSABLE** partial)

| Domain | Current pattern |
|--------|-----------------|
| Club Event | `PlanningEditorActions` — Abbrechen / Veranstaltung erstellen |
| Training | Sticky footer in `TrainingSeriesCreateForm` |
| Match / Tournament | Inline footer buttons in guided surface |

**PROPOSED:** Shell-owned footer slot; domain supplies primary label (preserve domain verbs).

---

## 7. Dirty guard (**REUSABLE** + **NEW_REQUIRED**)

**EXISTING:** Tab switch confirmation via `SceContextTabs` + dirty provider.

**NEW_REQUIRED for composer:**

- Close X, backdrop, Escape → same confirm message
- Optional: disable backdrop dismiss when dirty
- Browser `beforeunload` when dirty (page mode)
- Extend provider or thin composer wrapper — **no second dirty system**

---

## 8. Child selectors & nested overlays (**REUSABLE** with gate)

| Interaction | Current pattern | Composer-safe? |
|-------------|-----------------|----------------|
| TeamSeason picker | Inline combobox | Yes |
| Writable teams (Match) | `fetch` + native/select UI | Yes |
| External club | Inline search dropdown | Yes |
| Facility assignment | Inline pickers + availability fetch | Yes |
| Org audience targets | `SceChipMultiSelectorField` → **Sheet** (`SceListSelectorPanel`) | **Risk** — sheet over composer overlay |
| Tournament participants | Inline workflow | Yes (no modal in create path) |

**PROPOSED rule:** **No nested modal/dialog stacks.** Prefer inline discover, combobox, or **in-composer side panel** (single overlay host). Sheet-based selectors must be refactored to composer-safe pattern before Club Event overlay adoption (01C).

---

## 9. Toggle First (**EXISTING** target)

| Domain | Binary controls |
|--------|-----------------|
| Club Event | `SwitchThumb` (Ganztägig, Wiederholung); publication via canonical panels |
| Match / Tournament | `MatchPublicationToggles` / `TournamentPublicationToggles`; `HomeAwaySegmentedControl` |
| Training | Recurrence Ja/Nein via **radiogroup** (binary — align to `SceSegmentedControl` in adoption) |

**Target for composer adoption:** `BINARY_CONTROL_COMPLIANCE: PASS`, `NEW_BINARY_CHECKBOXES: 0`.

---

## 10. Semantic activity identity (**EXISTING** tokens)

Use `ActivityTypePill` vocabulary in composer header:

| Kind | Label | Accent |
|------|-------|--------|
| CLUB_EVENT | VERANSTALTUNG | club-event-violet |
| TRAINING | TRAINING | training-blue |
| MATCH | SPIEL | match-red |
| TOURNAMENT | TURNIER | tournament-orange |

Accent is **header/chip only** — shell stays premium dark SCE.

---

## 11. Success & context restoration (**NEW_REQUIRED**)

| Step | Behaviour |
|------|-----------|
| Submit success | Keep draft on failure; close on success |
| Cache | `router.refresh()` + targeted invalidation (domain-specific today) |
| Return | Restore filter/month/week/search/scroll via **`SceActivityCreateOriginContext`** (proposed) |
| Feedback | Restrained toast; optional highlight new row in list |

**EXISTING** post-create today mostly **navigates to edit/detail** (context loss) — composer adoption must change default when launched from planning.

---

## 12. Full-page fallback (**EXISTING** routes)

| Domain | Route |
|--------|-------|
| Club Event | `/dashboard/veranstaltungen/new` |
| Training | `/dashboard/training/new` |
| Match | `/dashboard/matchcenter/new` |
| Tournament | `/dashboard/tournamentcenter/new` |

Same domain workflow component tree; **page shell** replaces composer chrome (`PlanningEditorShell`, `TrainingRecordWorkspaceShell`, etc.).

---

## 13. External UX principles (PO research → SCE mapping)

| Principle | SCE mapping |
|-----------|-------------|
| Focused overlay for contextual tasks | `SceModalOverlay` + workspace dialog tokens |
| No tiny modal for long forms | Composer uses workspace/form max width + internal scroll |
| Stable header/footer | `SCE_DIALOG_HEADER` / `FOOTER` |
| No nested dialogs | Sheet selector gate; elevated layer only for deliberate stack |
| a11y / focus | Reuse modal lifecycle |
| Full-page escape | Keep `/new` routes |
| Mobile full-screen | Composer `mode=fullscreen` below breakpoint |

---

## 14. Automated test targets (future 01B+)

See [`SCE-ACTIVITY-CREATE-01A.md`](../roadmap/SCE-ACTIVITY-CREATE-01A.md) §29.

---

## References

- [`SCE-DESIGN-SYSTEM.md`](./SCE-DESIGN-SYSTEM.md) — Club Event create/edit (shipped) + proposed Activity Creation section
- [`SCE-CONTEXT-TABS-STANDARD.md`](./SCE-CONTEXT-TABS-STANDARD.md)
- [`SCE-UI-ROLLOUT-ADRS.md`](./SCE-UI-ROLLOUT-ADRS.md) — **ADR-11**
- Audit detail: [`SCE-ACTIVITY-CREATE-01A.md`](../roadmap/SCE-ACTIVITY-CREATE-01A.md)
