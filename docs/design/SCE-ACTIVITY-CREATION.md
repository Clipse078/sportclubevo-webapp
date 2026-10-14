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

**Container geometry (01B-R1 — shared workflow, mode-specific layout):**

| Mode | Height / scroll | Footer |
|------|-----------------|--------|
| **Overlay** (desktop) | Stable bounded workspace: `--sce-activity-composer-overlay-workspace-height` (~72.5dvh, capped by `--sce-dialog-max-height` and minimum token). Header + tabs + footer fixed; **content region** `flex: 1`, `min-height: 0`, internal scroll (`.sce-scroll-region-dark`). | Persistent inside panel |
| **Fullscreen** (≤768px overlay host) | Viewport-filling (`100dvh`); same internal scroll contract as overlay | Persistent |
| **Page** (`/new`, preview page-mode) | **Content-aware** — panel grows with tab content; no overlay min-height. Normal document scroll; **no** nested internal scroll container | Follows content (border/spacing separation) |

**Principle:** *Shared workflow does not require identical container geometry.*

- Width: bounded by `--sce-dialog-workspace-max-width` (~1160px cap), centered in `--sce-content-viewport-width`
- Underlying planner: `data-sce-modal-background` + de-emphasis (not a second theme)
- Dark internal scroll: reusable `.sce-scroll-region-dark` in `app/globals.css` (sidebar/explorer language)

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
| `validateDraft` → tab error map + field errors | **Commit validation** — full create requirements (Club Event: `computeClubEventCreateTabErrors`) |
| `draftPersistence.validateDraftForSave` | **Draft validation** — minimum safe persistence only (optional capability) |
| `draftPersistence.saveDraft` | Explicit draft persistence adapter — **01C+** supplies real domain storage |
| `firstInvalidTab` | Ordered tab walk |
| `submitDraft` | Domain adapter → create/commit APIs |
| Success `outcome` | `DRAFT_SAVED` \| `PUBLISHED` \| `SUBMITTED_FOR_APPROVAL` (`CREATED` = legacy alias for `PUBLISHED`) |
| `effectiveGovernance` | Host-resolved create + publication authority — Composer does not reconstruct role logic |
| Cancel / dirty | `SceContextDirtyGuardProvider` — dirty = local ≠ last persisted baseline |
| Container hint | `overlay` \| `page` \| `fullscreen` — selected by host, not domain |
| **`guidedWorkflow` (01E-R1 / R6)** | `finalReviewTab`, `validateStep`, `resolveStepValid` — footer «Zurück» / «Weiter», progress UI over Context Tabs; **freely navigable, clearly guided** (not a locked wizard); domain primary action only on final **Übersicht** review; **reviewed-step UI state** is composer-session only (see **GUIDED STEP STATE SEMANTICS** below) |
| **SCE Activity Date & Time (01E-R2 / 01F-R1)** | Shared `SceActivityDateInput` / `SceActivityTimeInput` / `SceActivityDateTimeInput` — display **DD.MM.YYYY** + **HH:MM**; fast keyboard entry via compact digits (**DDMMYYYY**, optional **DDMMYY** → 20YY) and time (**HMM** / **HHMM**) normalized on blur/Enter before validation; optional SCE calendar popover; domain drafts still store tenant-local wall-clock via existing boundaries (`parseTenantLocalDateTimeInput`); **no** browser-native combined datetime control in canonical composers |
| **SCE Club & Team Selector (01E-R3 / R5)** | Canonical `SceClubTeamSelectorDialog` — browse-first club grid from Vereine/Club Directory data; elevated subordinate dialog in Match composer for «Team ändern» (`TEAM_ONLY`) / «Gegner ändern» (`CLUB_ONLY`, commits on club pick); persist `opponentExternalClubId` in drafts, resolve crests/names at render time; **no** opponent ExternalTeam requirement |
| **Resource assignment default (01E-R5)** | **OPTIONAL** during activity creation unless a domain documents an explicit business requirement; Match HOME may commit with zero pitch/dressing-room assignments |
| **TOURNAMENT_EXTERNAL_CLUB_SELECTION** | **CLUB_ONLY** — `SceClubTeamSelectorDialog` in `TournamentParticipantAddWorkflow` (**01F**) |

#### GUIDED STEP STATE SEMANTICS (01E-R6 — canonical)

Step completion represents **reviewed and valid**, not merely currently valid.

| State | Meaning | Visual |
|-------|---------|--------|
| **UNVISITED** | Not yet reviewed by the user | Neutral empty circle — **no checkmark** |
| **CURRENT** | Active step (`aria-current="step"`) | Orange activity indicator |
| **COMPLETED** | User reviewed/visited **and** step is valid | Checkmark |
| **ERROR** | Validation meaningfully triggered **and** step invalid | Error indicator (not color-only) |

**Principles:** **OPTIONAL ≠ COMPLETED** · **VALID ≠ COMPLETED** · untouched optional steps with valid defaults remain **UNVISITED** until reviewed.

Domain `resolveStepValid` supplies validity only; `SceActivityComposer` tracks **reviewed** steps in UI session (not DB). Draft restore does not auto-complete every technically valid optional step. Tournament (**01F**) uses this shared model — **no** parallel wizard stepper.

**Lifecycle (01B-R3 — canonical):**

```text
START
  → COMPOSE
  → optional SAVE DRAFT / RESUME
  → COMMIT VALIDATION
  → governance decision (effective publication authority)
       ├ DIRECT_PUBLISH → PUBLISHED
       └ APPROVAL_REQUIRED → PENDING_APPROVAL
            ├ APPROVE → PUBLISHED
            ├ REQUEST_CHANGES → edit / resubmit (revision-bound)
            └ REJECT → REJECTED
```

**Terminology:** **Form/commit validation** (technical/domain) is separate from **governance approval / Freigabe** (club policy). Never use generic «validation» for both. **Approval is not a Composer content tab.**

**Governance foundation (01B-R3 — contracts only):** optional approval **OFF by default**; **creator-specific** and **activity-type-specific**; Club Admin configuration and production persistence ship with **01C** (reference adoption) and later vertical slices — not in 01B. **Freigaben** inbox UI may follow **01H** unless 01C requires a minimal validator path earlier.

**Product principle:** *Saving preserves work. Submitting commits the activity. Publication follows the creator's effective governance policy.*

**Governance defaults (01B-R3 — APPROVED):** Optional approval; **OFF by default**; creator-specific publication authority; activity-type validator pools; create permission ≠ publish authority; saving a draft **never** triggers approval.

**No server autosave in 01B** — explicit user-triggered draft/create only; recovery/autosave is a separate evaluation (resources, conflicts, publication, audit).

Domain components remain authoritative (`VeranstaltungCreateForm` panels, future tabbed Training/Match/Tournament bodies). **Shared workflow does not imply identical domain persistence models** (01C+).

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

## 5. Form validation vs governance approval (**FOUNDATION_IMPLEMENTED** — 01B-R3 contracts)

| Layer | When | Owner |
|-------|------|--------|
| **Draft validation** | Save draft | `validateDraftForSave` — minimum safe persistence |
| **Commit validation** | Primary commit | `validateDraft` — full domain requirements before any governance transition |
| **Governance approval** | After successful commit when `APPROVAL_REQUIRED` | Validator pool + revision-bound decisions — **not** a Composer content tab |

Module: `lib/sce/activity-governance/` — policy resolver, invariants, revision/audit/notification contracts. **No production schema** in 01B-R3.

---

## 6. Validation tabs & Club Event pattern (**REUSABLE**)

| Rule | Source |
|------|--------|
| Free tab navigation — not a forced wizard | Club Event + PO direction |
| **Draft save** uses `validateDraftForSave` only | 01B-R2 foundation — may allow incomplete data |
| **Create/commit** uses `validateDraft` (full draft) | `VeranstaltungCreateForm` |
| First invalid tab activated on commit failure | `firstInvalidClubEventCreateTab` |
| Restrained tab invalid marker (`•`) | `buildClubEventCreateTabNavigationConfig` |
| Field-level errors unchanged | Domain components |

Training/Match/Tournament today use **guided numbered sections** on one scroll surface — migration to tabs is **01C–01F** UX work, not a new validation engine.

---

## 7. Action footer (**FOUNDATION_IMPLEMENTED** — 01B-R2 + 01B-R3 policy-aware primary)

Canonical composer footer (left → right):

| Slot | Control | Visual |
|------|---------|--------|
| Left / quiet | **Abbrechen** | Ghost |
| Right / secondary | **Als Entwurf speichern** or **Änderungen speichern** | Secondary (never second primary) |
| Right / primary | Direct publish: domain label (`Training erstellen`, …) · Approval required: **Zur Freigabe einreichen** (or domain equivalent) | Primary |

- Save Draft is **not** hidden inside the primary dropdown; no wizard **Weiter/Zurück**.
- **Destructive draft deletion** is **not** a standard footer action — use a separate confirmed command (01C+).
- When `draftPersistence` is omitted, the secondary save action is hidden (commit-only definitions).

Legacy domain footers (pre-adoption):

| Domain | Current pattern |
|--------|-----------------|
| Club Event | `PlanningEditorActions` — Abbrechen / Veranstaltung erstellen |
| Training | Sticky footer in `TrainingSeriesCreateForm` |
| Match / Tournament | Inline footer buttons in guided surface |

---

## 8. Dirty guard (**REUSABLE** + **NEW_REQUIRED**)

**EXISTING:** Tab switch confirmation via `SceContextTabs` + dirty provider.

**FOUNDATION_IMPLEMENTED (01B / 01B-R2) for composer close/backdrop/Escape:**

| State | Close behaviour |
|-------|-----------------|
| Clean (never edited) | Close immediately |
| Dirty (local ≠ baseline) | Guarded close |
| Saved draft, unchanged | No unsaved-change warning |
| Saved draft, modified again | Guarded close |
| Failed draft save | Values retained, still dirty, guarded close |

**Persistence status (secondary header):** e.g. `ENTWURF · Gespeichert` / `ENTWURF · Nicht gespeicherte Änderungen` — only when semantically useful; not a banner.

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

## 16. Automated test targets (**FOUNDATION_IMPLEMENTED** — 01B)

| Area | Module tests |
|------|----------------|
| Composer shell / R1 geometry / guardrails | `lib/sce/activity-composer/__tests__/`, `components/sce/activity-composer/__tests__/` |
| R2 draft lifecycle | `composer-lifecycle-state.test.ts` |
| R3 governance contracts | `lib/sce/activity-governance/__tests__/sce-activity-governance-r3.test.ts` |
| 01A docs gate | `lib/planning/__tests__/sce-activity-create-01a-architecture-gate.test.ts` |

See [`SCE-ACTIVITY-CREATE-01A.md`](../roadmap/SCE-ACTIVITY-CREATE-01A.md) §29 for domain adoption coverage (01C+).

---

## References

- [`SCE-DESIGN-SYSTEM.md`](./SCE-DESIGN-SYSTEM.md) — Club Event create/edit (shipped) + proposed Activity Creation section
- [`SCE-CONTEXT-TABS-STANDARD.md`](./SCE-CONTEXT-TABS-STANDARD.md)
- [`SCE-UI-ROLLOUT-ADRS.md`](./SCE-UI-ROLLOUT-ADRS.md) — **ADR-11**
- Audit detail: [`SCE-ACTIVITY-CREATE-01A.md`](../roadmap/SCE-ACTIVITY-CREATE-01A.md)
