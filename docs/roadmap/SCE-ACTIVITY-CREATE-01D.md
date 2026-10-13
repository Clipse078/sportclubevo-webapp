# SCE-ACTIVITY-CREATE-01D — Training Adoption

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-ACTIVITY-CREATE-01D` |
| **Status** | **CLOSED / MERGED** |
| **Branch** | `cursor/sce-activity-create-01d-training-adoption` |
| **PR** | **#841** → `STAGE` — **MERGED** |
| **Merge commit** | `62d96645d8abc923067a512871b69ebc8dbb971a` |
| **Canonical STAGE HEAD (post-merge)** | `62d96645d8abc923067a512871b69ebc8dbb971a` |
| **Feature HEAD (pre-merge)** | `99bbda0191d5a34cc9770ef434499fbf5a949f29` |
| **STAGE baseline (merge-base)** | `08539acd58d74738a5e84a21076ca400fc116b96` |
| **STAGE drift at closure** | **None** — `origin/STAGE` unchanged from 01D baseline |
| **Next package** | **SCE-ACTIVITY-CREATE-01E** — Match Adoption (**NOT_STARTED**) |

## Sub-packages

| Slice | Focus |
|-------|--------|
| **01D** | Training on `SceActivityComposer`; draft persistence; governance; `/dashboard/training/new` page mode; management overlay |
| **01D-R1** | PO UAT corrections — five tabs (no Publikation); recurrence/toggle semantics; page heading deduplication |
| **01D-R2** | Wochenplaner contextual overlay; shared resource kind icons; planner revalidate on success |

---

## PO UAT (owner-owned)

| Gate | Result |
|------|--------|
| **01D-R1 visual PO UAT** | **PASS** (prior closure iteration) |
| **01D-R2 visual PO UAT** | **PASS** |
| **SCE-ACTIVITY-CREATE-01D** | **APPROVED_FOR_CLOSURE** |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |

---

## A. Creation experience (frozen)

| Path | Contract |
|------|----------|
| **Wochenplaner** | **+ Erstellen → Training** → `TrainingCreateForm` / **`SceActivityComposer`** overlay; planner remains visible as context |
| **Training management** | Contextual create → same overlay workflow (`TrainingComposerCreateTrigger`) |
| **Fallback** | **`/dashboard/training/new`** → same `TrainingCreateForm` / **`SceActivityComposer`** in **page** mode (`TrainingRecordWorkspaceShell`) |

**No parallel production Training-create implementation.** Legacy `TrainingSeriesCreateForm` is **@deprecated** and not wired to production create entry points.

**Modal-first principle (for 01E+):** contextual creation uses the Composer overlay where the invoking surface supports it; `/new` remains the accessible full-page fallback using the **same** workflow/components — not separate modal vs page implementations.

---

## B. Final Training tabs

Canonical create tabs:

1. **Übersicht**
2. **Team**
3. **Termin**
4. **Wiederholung**
5. **Ressourcen**

There is **no Publikation** tab unless a future package introduces genuine user-controlled publication settings.

Unknown/legacy `tab=publikation` resolves safely to **Übersicht** (`normalizeTrainingCreateTabParam`).

---

## C. Recurrence (domain semantics — unchanged in closure)

| Mode | Behaviour |
|------|-----------|
| **Recurrence OFF** | One Training occurrence; date label **Datum**; weekday editor hidden; occurrence uses selected calendar date + Termin start/end |
| **Recurrence ON** | **Startdatum** + required inclusive **Enddatum**; weekday multi-selection; per-weekday times supported; first generated occurrence = first matching selected weekday on or after Startdatum; end date = inclusive last possible calendar date |

Binary recurrence control: **`SwitchToggle`** (Toggle First).

Weekday selection uses explicit multi-selection / `aria-pressed` semantics — not binary checkboxes.

---

## D. Resource visual language (R2 — canonical direction)

Resource assignment distinguishes kinds while **retaining text labels**.

| Kind | Icon language |
|------|----------------|
| **Spielfeld / Halle** | Shared `PlanningResourceAssignmentKindIcon` / `FacilityResourceIdentity` (`FULL_PITCH` glyph for pitch/hall assignment rows) |
| **Garderobe** | `DRESSING_ROOM` semantic icon (`DoorOpen` family) |

Reuse: `FacilityResourceIdentity`, `PlanningResourceSemanticIconTile`, `PlanningResourceAssignmentKindIcon`, canonical resource metadata.

**Do not** introduce activity-specific duplicate resource icon mappings. Intended for later **Match**, **Tournament**, and **Club Event** composer adoption.

---

## E. Training governance

Separate from operational **TrainingSeriesStatus** / session status.

| Area | Contract |
|------|----------|
| **Create authority** | Existing training permissions + team writability |
| **Publication authority** | `DIRECT_PUBLISH` default; optional `APPROVAL_REQUIRED` per creator policy |
| **Validator pool** | Training-specific multi-select; zero-validator guard when approval required |
| **Self-approval** | **Blocked** |
| **Workflow** | Draft lifecycle + revisions; **Freigeben** / **Änderungen anfordern** / **Ablehnen** |
| **Permission** | `activities.training.approve` seeded in 01D migration |

Person workspace: training governance section alongside existing Club Event governance patterns.

---

## F. Visibility

Non-published Composer states must not leak into programme/planning/public surfaces.

Published Training series visibility: `trainingSeriesPublishedVisibilityWhere()` — **`planningStage` in `APPROVED`** (canonical 01D predicate).

---

## G. Context continuity (Wochenplaner)

| Event | Contract |
|-------|----------|
| **Open** | Menu closes; overlay opens; origin `PLANNING_SURFACE` (pathname, search params, selected week) |
| **Cancel** | Overlay closes; **no navigation**; focus returns to Training menu trigger |
| **Success** | Overlay closes; `router.refresh()` + POST `/api/planning-hub/planner-revalidate`; **`successBehavior="stay"`** — user remains on planner |
| **Fallback page** | `/dashboard/training/new` independent of overlay |

Validated via architecture tests (`PlanningHubCreateMenu`, `sce-activity-create-01d-r2`); no Cursor manual browser UAT.

---

## H. Draft lifecycle

| Item | Contract |
|------|----------|
| **Persistence** | `TrainingComposerDraft` + dedicated API (`/api/training/composer/drafts`) |
| **Resume** | `/dashboard/training/new?draftId=` + GET draft |
| **Discovery** | Training management draft list |
| **Governance revisions** | `SceActivityGovernanceRevision.trainingDraftId` |

---

## I. Migrations (01D — do not rewrite)

| Migration | Purpose |
|-----------|---------|
| `20261013180000_sce_activity_create_01d_training` | `TrainingComposerDraft`, governance revision link, `activities.training.approve`, default TRAINING governance type config + Club Admin backfill |

**PROD:** untouched by this closure package.

---

## J. Design system & Toggle First

| Check | Result |
|-------|--------|
| **SCE_DESIGN_SYSTEM_COMPLIANCE** | **PASS** |
| **CANONICAL_COMPONENTS** | `SceActivityComposer`, Universal Context Tabs, `SwitchToggle`, shared planning resource identity icons |
| **NEW_PRIMITIVES** | **0** (extends existing shared icon mapping only) |
| **PARALLEL_PATTERN_INTRODUCED** | **NO** |
| **BINARY_CONTROL_COMPLIANCE** | **PASS** |
| **NEW_BINARY_CHECKBOXES** | **0** |
| **CANONICAL_TOGGLES_USED** | `SwitchToggle` |
| **MULTI_SELECTION_PATTERN** | Weekday recurrence multi-select (not binary checkbox) |

---

## K. Legacy / parallel implementation

| Item | Disposition |
|------|-------------|
| `TrainingCreateForm` | **Canonical** production create workflow |
| `TrainingSeriesCreateForm` | **Retained** — `@deprecated`; tests + type exports only |
| `TrainingSeriesForm` / record workspace | **Retained** — edit/record flows |
| `/api/training-series` | **Retained** — domain/edit/API consumers |
| Generic Activity API | **Not introduced** |

---

## L. Automated validation (closure)

| Item | Result |
|------|--------|
| **Vitest (closure suite)** | **15** files · **137** tests — **0 failures** (01D base + R1 + R2, 01C R1–R7 + base, Composer guardrails, planning sentinels, `PlanningHubCreateMenu`) |
| **01D-only tests** | **3** files · **33** tests |
| **Prisma validate** | **PASS** |
| **Prisma generate** | **PASS** |
| **Production build** | **PASS** (`NODE_OPTIONS=--max-old-space-size=8192`) |

---

## M. Handoff — NEXT: 01E Match Adoption

01E must inherit (do **not** implement in 01D closure):

- `SceActivityComposer`
- Modal-first contextual creation + same page-fallback principle
- Canonical context tabs (domain-specific)
- Shared resource icon language
- Governance architecture
- Toggle First
- **No** parallel Match create architecture

**01H:** **NOT_STARTED**
