# SCE Activity Creation — Design & Architecture Contracts (01A)

> **Status:** **FOUNDATION_IMPLEMENTED** (`SCE-ACTIVITY-CREATE-01B` — composer shell + contracts; domain adoption **01C+** not shipped)  
> **Programme:** [`SCE-ACTIVITY-CREATE-01`](../roadmap/SCE-ACTIVITY-CREATE-01.md)  
> **Product principle:** *One creation language, domain-specific workflows.*

This document defines the **target** contracts for unified activity creation. It distinguishes what exists on STAGE today from what implementation packages (01B+) must build.

---

## Classification legend

| Tag | Meaning |
|-----|---------|
| **EXISTING** | On STAGE; reuse as-is |
| **REUSABLE** | On STAGE; adapt/wrap for composer |
| **NEW_REQUIRED** | Not implemented; 01C+ domain adoption |
| **APPROVED** | Locked at 01A closure |
| **FOUNDATION_IMPLEMENTED** | Shipped in 01B (composer foundation only) |

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

## 2. Composer shell (**FOUNDATION_IMPLEMENTED** — 01B)

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

## 3. Creation contract (**FOUNDATION_IMPLEMENTED** — 01B)

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

**FOUNDATION_IMPLEMENTED (01B) for composer close/backdrop/Escape:**

**Still NOT YET IMPLEMENTED (domain adoption / 01G):**

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

**Design System rule (ADR-11 / 01A closure):** A modal **Activity Composer must not launch another independent modal, dialog, sheet, or drawer** over itself for normal creation interactions.

Prefer, in order:

1. Inline controls
2. Combobox / searchable selection
3. Popover (where accessibility and space permit)
4. Expandable region
5. Composer-owned embedded panel / side region

If none is suitable because the interaction is genuinely too complex, use the **canonical full-page `/new` creation mode** — not stacked dialogs.

**First application:** Club Event organisational audience selector (`SceChipMultiSelectorField` → Sheet today) — **01C** must refactor before overlay adoption is complete.

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

## 11. Context continuity (**MANDATORY** — implementation requirement)

Creation must preserve the user's planning context wherever technically possible. **Do not require DB persistence** for transient UI context.

| Origin | Expectation |
|--------|-------------|
| Wochenplaner week | Return to same week after create |
| Veranstaltungen filters / month | Same filters / month |
| Matchcenter / Tournamentcenter | Same operational context |
| Future Team Programme (**01I**) | Team + season prefilled; return to same programme surface |

Continuity includes where appropriate: search params, filters, selected date/week/month, scroll context, origin token, cache refresh (`router.refresh()` / targeted invalidation), restrained success feedback, optional highlight of the new activity row.

---

## 12. Success & context restoration (**NEW_REQUIRED**)

| Step | Behaviour |
|------|-----------|
| Submit success | Keep draft on failure; close on success |
| Cache | `router.refresh()` + targeted invalidation (domain-specific today) |
| Return | Restore filter/month/week/search/scroll via **`SceActivityCreateOriginContext`** (proposed) |
| Feedback | Restrained toast; optional highlight new row in list |

**EXISTING** post-create today mostly **navigates to edit/detail** (context loss) — composer adoption must change default when launched from planning.

---

## 13. Responsive container strategy (**APPROVED**)

| Viewport | Composer presentation |
|----------|-------------------------|
| **Desktop** | Large contextual Composer overlay |
| **Tablet** | Bounded adaptive overlay where space permits |
| **Narrow / mobile** | Fullscreen Composer — **same** draft and components |
| **Direct `/new` route** | Full-page Composer rendering via existing record/editor shells |

There must **not** be separate mobile-only create forms.

---

## 14. Full-page fallback (**EXISTING** routes)

| Domain | Route |
|--------|-------|
| Club Event | `/dashboard/veranstaltungen/new` |
| Training | `/dashboard/training/new` |
| Match | `/dashboard/matchcenter/new` |
| Tournament | `/dashboard/tournamentcenter/new` |

Same domain workflow component tree; **page shell** replaces composer chrome (`PlanningEditorShell`, `TrainingRecordWorkspaceShell`, etc.).

---

## 15. External UX principles (PO research → SCE mapping)

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

## 16. Automated test targets (future 01B+)

See [`SCE-ACTIVITY-CREATE-01A.md`](../roadmap/SCE-ACTIVITY-CREATE-01A.md) §29.

---

## References

- [`SCE-DESIGN-SYSTEM.md`](./SCE-DESIGN-SYSTEM.md) — Club Event create/edit (shipped) + proposed Activity Creation section
- [`SCE-CONTEXT-TABS-STANDARD.md`](./SCE-CONTEXT-TABS-STANDARD.md)
- [`SCE-UI-ROLLOUT-ADRS.md`](./SCE-UI-ROLLOUT-ADRS.md) — **ADR-11**
- Audit detail: [`SCE-ACTIVITY-CREATE-01A.md`](../roadmap/SCE-ACTIVITY-CREATE-01A.md)
