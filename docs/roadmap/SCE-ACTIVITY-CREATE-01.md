# SCE-ACTIVITY-CREATE-01 — Unified Activity Creation Experience (programme)

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-ACTIVITY-CREATE-01` |
| **Programme** | Post [`SCE-CLUB-EVENT-AUDIENCE-01`](./SCE-CLUB-EVENT-AUDIENCE-01.md) |
| **Status** | **IN_PROGRESS** — 01A **CLOSED**; 01B **CLOSED** (PR **#839**); **01C** **CLOSED** (PR **#840**); **01D** **CLOSED** (PR **#841**); **01E** **CLOSED** (PR **#842**); **01F** **CLOSED** (PR **#843**, PO UAT **PASS**); **01G** **CLOSED** (PR **#844**, PO UAT **PASS**) |
| **First slice** | [`SCE-ACTIVITY-CREATE-01A`](./SCE-ACTIVITY-CREATE-01A.md) — **CLOSED** (PR **#838**, ADR-11 **ACCEPTED**) |
| **Foundation slice** | **SCE-ACTIVITY-CREATE-01B** — Activity Composer Foundation + R1/R2/R3 — **CLOSED** (PR **#839**, PO visual UAT **PASS**) |
| **Reference slice** | **SCE-ACTIVITY-CREATE-01C** — Club Event Reference Adoption — **CLOSED** (PR **#840**) |
| **Training slice** | [`SCE-ACTIVITY-CREATE-01D`](./SCE-ACTIVITY-CREATE-01D.md) — Training Adoption — **CLOSED** (PR **#841**) |
| **Match slice** | [`SCE-ACTIVITY-CREATE-01E`](./SCE-ACTIVITY-CREATE-01E.md) — Match Adoption — **CLOSED** (PR **#842**) |
| **Tournament slice** | [`SCE-ACTIVITY-CREATE-01F`](./SCE-ACTIVITY-CREATE-01F.md) — Tournament Adoption — **CLOSED** (PR **#843**) |
| **Integration slice** | [`SCE-ACTIVITY-CREATE-01G`](./SCE-ACTIVITY-CREATE-01G.md) — Global **`+ Erstellen`** entry (**CLOSED**) |
| **Next slice after 01G** | **SCE-ACTIVITY-CREATE-01H** — Core planning surfaces adoption (**IN_PROGRESS** — see [`SCE-ACTIVITY-CREATE-01H.md`](./SCE-ACTIVITY-CREATE-01H.md)) |

## Objective (approved direction — do not implement in Audience-01 closure)

Research and, **only if an architecture / feasibility gate passes**, establish one world-class creation UX family for:

- **TRAINING**
- **MATCH**
- **TOURNAMENT**
- **CLUB_EVENT**

## Target concept (research)

**`SceActivityComposer`** — shared creation shell and contracts, not duplicate per-domain forms.

| Capability | Intent |
|------------|--------|
| Contextual creation | Launch from planning surfaces with restored context after success |
| Desktop | Large focused overlay / composer where appropriate |
| Narrow / mobile | Full-screen adaptive composer |
| Fallback | Canonical full-page `/new` routes |
| Workflow | Domain-specific tab configuration on **Universal Context Tabs** |
| Actions | Persistent shell actions (save/create/cancel) |
| Validation | Cross-tab validation + dirty guard |
| Focus | Accessibility-first focus management |
| Anti-pattern | **No** nested-dialog creation stacks |

## Sequence (committed after Audience-01 merge)

```text
SCE-CLUB-EVENT-AUDIENCE-01 — CLOSED
  → SCE-ACTIVITY-CREATE-01A — Research & Architecture — CLOSED (CONDITIONAL_PASS_ACCEPTED)
  → SCE-ACTIVITY-CREATE-01B — Composer foundation + R1/R2/R3 — CLOSED
  → SCE-ACTIVITY-CREATE-01C — Club Event reference adoption — CLOSED (PR #840)
  → SCE-ACTIVITY-CREATE-01D — Training adoption — CLOSED (PR #841)
  → SCE-ACTIVITY-CREATE-01E — Match adoption — CLOSED (PR #842)
  → SCE-ACTIVITY-CREATE-01F — Tournament adoption — CLOSED (PR #843)
  → SCE-ACTIVITY-CREATE-01G — Global create integration — CLOSED (PR #844)
  → SCE-ACTIVITY-CREATE-01H — Core planning surfaces adoption — IN_PROGRESS
  → … (01I–01N per SCE-UI-ROLLOUT-01)
```

## Architecture gate (01A closure)

| Field | Value |
|-------|-------|
| **Decision** | Option C — adaptive `SceActivityComposer` + `/new` fallback |
| **Gate** | **CONDITIONAL_PASS_ACCEPTED** |
| **Condition** | Composer-safe child interactions — **delivered in 01C-R1** (embedded audience selector) |

## Out of scope for 01A (unchanged for 01B+ discipline)

- Implementing domain create migrations before the matching adoption package (01C–01F)
- Generic Activity persistence/API or parallel domain modal implementations
- PROD deploy unless explicitly scheduled

---

## SCE-ACTIVITY-CREATE-01B closure (PR **#839**)

| Field | Value |
|-------|-------|
| **Status** | **CLOSED** |
| **Sub-packages** | **01B-R1** workspace geometry · **01B-R2** draft/action contract · **01B-R3** governance/validation foundation |
| **PO visual UAT** | **PASS** (preview routes — PO-owned; no Cursor manual UAT) |
| **Schema / migration** | **NONE** — foundation contracts + preview harness only |
| **Production `/new` routes** | **Unmigrated** — guardrail tests enforce |
| **Autosave** | **Not introduced** — explicit draft/commit only |
| **Next package** | **SCE-ACTIVITY-CREATE-01C** — Club Event Reference Adoption |

Deliverables: `SceActivityComposer` (overlay / page / fullscreen), `SceActivityCreateDefinition`, context tabs + dirty guard integration, policy-aware footer, `lib/sce/activity-governance/` contracts, `/sce-preview/activity-composer` harness.

---

## SCE-ACTIVITY-CREATE-01C boundary (locked at 01B closure)

**Reference domain:** Club Event — first production vertical slice on the canonical Composer.

| Must deliver (01C) | Must not (01C) |
|--------------------|----------------|
| Real Club Event create via `SceActivityComposer` (overlay/page/fullscreen as applicable) | Generic Activity DB entity |
| Canonical tabs: Übersicht · Gültigkeit · Termin · Ressourcen · Publikation | Generic `POST /api/activity` |
| Existing audience architecture; **Composer-safe** audience selection (no stacked Sheet/modal) | Four parallel domain governance systems |
| Recurrence, resources/conflicts, publication settings | |
| Real draft persistence + governance persistence + effective publication authority | |
| RPERM / permission integration; Club Admin governance config for usable feature | |
| Usable validator review/decision path; revision/audit persistence; material-change handling | |

**Deferred unless 01C gate requires earlier:** broad canonical **Freigaben** inbox (may remain **01H** / later planning-surface package if 01C ships a minimal validator path).

**Then:** 01D Training · 01E Match · 01F Tournament adoption/refinement · 01G planning-surface integration · **01H** core planning surfaces · 01I–01N per [`SCE-UI-ROLLOUT-01`](./SCE-UI-ROLLOUT-01.md).

---

## SCE-ACTIVITY-CREATE-01C-R1 (PR **#840**)

| Delivered in R1 | Notes |
|-----------------|-------|
| Composer-safe org audience selector | `SceListSelectorPanel` **embedded** host; no nested Sheet inside `SceActivityComposer` |
| Sole workflow shell | Tab bodies on `SceActivityComposer` only; legacy `ClubEventCreateWorkflowShell` deprecated |
| Validator pool admin UX | `Freigabeberechtigte Personen` multi-select + zero-validator guard |
| Draft resume | Management draft list → `/new?draftId=` + GET draft API |
| Contextual create proof | Veranstaltungen management **+ Veranstaltung** opens overlay composer (page mode unchanged at `/new`) |
| **01G boundary** | Full planning-hub contextual integration remains **01G**; overlay proof uses Veranstaltungen management only |

## SCE-ACTIVITY-CREATE-01C-R7 — FINAL PERSON WORKSPACE UX POLISH GATE (PR **#840**)

| Topic | Contract |
|-------|----------|
| **Person Quick View** (Personen & Zugänge drawer) | Fast inspection: tabs **Übersicht · Rollen · Zugriff** — no Veranstaltungs-Freigaben governance editor |
| **Person Detail Workspace** | Canonical admin: **Übersicht · Rollen & Funktionen · Bereiche & Zuständigkeiten · Veranstaltungs-Freigaben · Zugriff** at `/dashboard/admin/users/{userId}?tab=…` |
| **Übersicht** | Administrative summary (Konto, Rollen, Bereiche, Veranstaltungs-Freigaben when linked, Zugriff) with deep links — not a duplicate of the header |
| **Governance deep link** | `?returnContext=club-event-governance&tab=veranstaltungs-freigaben` |
| **Effektiver Zugriff** | Own tab **Zugriff**; progressive disclosure; provenance labels when resolver data supports it |
| **Governance copy** | Distinguish form/domain validation from human Freigabe; zero-validator blocking preserved |
| **Closure** | **01C CLOSED** — PO R7 UAT **PASS** (see closure section below) |

---

## SCE-ACTIVITY-CREATE-01C closure (PR **#840**)

| Field | Value |
|-------|-------|
| **Status** | **CLOSED** |
| **Branch** | `cursor/sce-activity-create-01c-club-event-reference-adoption` |
| **PR** | **#840** → `STAGE` |
| **Feature HEAD (pre-merge)** | `af0453679a76c71632d3b242acd98339b6dd4b40` |
| **STAGE baseline (merge-base)** | `1d63101e2492cf6586ebdf976d4c3b45460944dc` |
| **STAGE drift at closure** | **None** — `origin/STAGE` unchanged from baseline |
| **Reference implementation** | **Yes** — subsequent activity-creation adoption packages (01D–01G) follow this vertical slice |
| **01D / 01H** | **NOT_STARTED** |

### PO UAT (owner-owned — Cursor did not perform manual visual UAT)

| Gate | Result |
|------|--------|
| **R3_DRAFT_UAT** | **PASS** |
| **R4_ACCESS_UAT** | **PASS** |
| **R5_GOVERNANCE_DISCOVERABILITY** | **PASS** |
| **R6_PERSON_WORKSPACE** | **PASS** |
| **R7_FINAL_VISUAL_UAT** | **PASS** |
| **SCE-ACTIVITY-CREATE-01C** | **APPROVED_FOR_CLOSURE** |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |

### Architecture delivered

| Area | Contract |
|------|----------|
| **Composer** | Club Event create/edit/resume on canonical **`SceActivityComposer`** (overlay from Veranstaltungen management + full-page `/dashboard/veranstaltungen/new`); shared tab bodies and footer actions |
| **Tabs** | Übersicht · Gültigkeit · Termin · Ressourcen · Publikation |
| **Draft lifecycle** | `ClubEventComposerDraft` persistence, draft list discovery, resume via `/new?draftId=` + GET draft API; tenant/creator scoping; non-published drafts excluded from public/programme surfaces |
| **Audience** | Existing organisational audience model; **Composer-safe** embedded selector (no nested Sheet/modal focus traps inside composer) |
| **Governance persistence** | Separates **creation authority**, **publication authority** (single-choice), **approval authority** (optional; central validator pool multi-select); `DIRECT_PUBLISH` default; zero-validator guard when approval required |
| **Approval workflow** | DRAFT → SUBMITTED_FOR_APPROVAL → APPROVE / REQUEST_CHANGES / REJECT → PUBLISHED; server-side authorization (`activities.club_event.approve`, validator pool, no self-approval, tenant-scoped revisions) |
| **Governance administration** | Veranstaltungen → Freigaben → Freigaben verwalten (People & Access governance context); Person Workspace **Veranstaltungs-Freigaben** tab when applicable; coherent `returnContext` back-navigation |
| **Person Workspace** | Übersicht · Rollen & Funktionen · Bereiche & Zuständigkeiten · Veranstaltungs-Freigaben (when linked) · Zugriff; Quick View remains lighter (no governance editor duplication) |
| **Approval inbox** | `/dashboard/veranstaltungen/freigaben` validator workspace |
| **Visibility** | Only **PUBLISHED** Club Events enter published-facing queries; DRAFT / SUBMITTED_FOR_APPROVAL / CHANGES_REQUESTED / REJECTED excluded via `clubEventPublishedVisibilityWhere` |

### Migrations (01C — do not rewrite)

| Migration | Purpose |
|-----------|---------|
| `20261013143000_sce_activity_create_01c_club_event` | Composer drafts, governance policy/revision/validator pool, approve permission seed |
| `20261013210000_sce_club_admin_club_event_approve_backfill` | Backfill `activities.club_event.approve` onto canonical Club Admin roles (permission availability — **not** automatic validator pool membership) |

Predecessor audience/recurrence migrations from **SCE-CLUB-EVENT-AUDIENCE-01** remain authoritative: `20261013103000_sce_club_event_audience_01`, `20261013120000_sce_club_event_audience_01_r1`.

### Design system & Toggle First

| Check | Result |
|-------|--------|
| **SCE_DESIGN_SYSTEM_COMPLIANCE** | **PASS** |
| **BINARY_CONTROL_COMPLIANCE** | **PASS** |
| **NEW_BINARY_CHECKBOXES** | **0** |
| **CANONICAL_TOGGLES_USED** | `SwitchToggle` |
| **MULTI_SELECTION_PATTERN** | `SceChipMultiSelectorField` (validator pool, audience targets) |

### Legacy / compatibility

| Item | Disposition |
|------|-------------|
| `ClubEventCreateWorkflowShell` | **Retained** — `@deprecated`; not used by production create path (Composer tabs only) |
| Other domains `/new` | **Unmigrated** — guardrails from 01B still apply until 01D–01F |

### Automated validation (closure)

Vitest: **26** files · **209** tests (01C R1–R7, governance, Freigaben routes, draft resume, audience, person workspace, context-tabs, visibility/policy) — **0 failures**. Prisma validate **PASS**. Production build **PASS** (TypeScript check requires elevated Node heap in CI-like environments).

---

## SCE-ACTIVITY-CREATE-01D closure (PR **#841**)

Full record: [`SCE-ACTIVITY-CREATE-01D.md`](./SCE-ACTIVITY-CREATE-01D.md).

| Field | Value |
|-------|-------|
| **Status** | **CLOSED / MERGED** |
| **Branch** | `cursor/sce-activity-create-01d-training-adoption` |
| **PR** | **#841** → `STAGE` — **MERGED** |
| **Merge commit** | `62d96645d8abc923067a512871b69ebc8dbb971a` |
| **Canonical STAGE HEAD (post-merge)** | `62d96645d8abc923067a512871b69ebc8dbb971a` |
| **Feature HEAD (pre-merge)** | `99bbda0191d5a34cc9770ef434499fbf5a949f29` |
| **STAGE baseline (merge-base)** | `08539acd58d74738a5e84a21076ca400fc116b96` |
| **STAGE drift at closure** | **None** |
| **01E / 01H** | **NOT_STARTED** |

### PO UAT

| Gate | Result |
|------|--------|
| **01D-R2 visual PO UAT** | **PASS** |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |

### Architecture delivered (frozen)

| Area | Contract |
|------|----------|
| **Composer** | Training create on **`SceActivityComposer`** — Wochenplaner overlay, management overlay, full-page **`/dashboard/training/new`** (same `TrainingCreateForm`) |
| **Tabs** | Übersicht · Team · Termin · Wiederholung · Ressourcen — **no Publikation**; legacy `tab=publikation` → Übersicht |
| **Modal-first** | Contextual create uses overlay where supported; `/new` fallback uses same components |
| **Recurrence** | R1 domain semantics preserved (single vs recurring window, weekday times) |
| **Resources** | Shared `PlanningResourceAssignmentKindIcon` / `FacilityResourceIdentity` with text labels |
| **Draft lifecycle** | `TrainingComposerDraft`, API, management list, resume via `draftId` |
| **Governance** | Training-specific validator pool, `DIRECT_PUBLISH` default, no self-approval, separate from operational series status |
| **Visibility** | `trainingSeriesPublishedVisibilityWhere()` — non-published composer states excluded from published surfaces |

### Migrations (01D)

`20261013180000_sce_activity_create_01d_training` — see package doc §I.

### Automated validation (closure)

Vitest: **15** files · **137** tests (01D + 01C sentinels + Composer guardrails + Wochenplaner menu) — **0 failures**. Prisma validate/generate **PASS**. Production build **PASS**.

### Next

**SCE-ACTIVITY-CREATE-01E** — Match Adoption (inherit Composer, modal-first, shared resource icons, governance, Toggle First).

---

## SCE-ACTIVITY-CREATE-01G closure (PR **#844**)

Full record: [`SCE-ACTIVITY-CREATE-01G.md`](./SCE-ACTIVITY-CREATE-01G.md).

| Field | Value |
| --- | --- |
| **Status** | **CLOSED / ACCEPTED** |
| **Branch** | `cursor/sce-activity-create-01g-global-create-integration` |
| **PR** | **#844** → `STAGE` |
| **Feature HEAD (approved implementation)** | `9e41e6c8d2a1b2c863026f8c142b9dc6b598efd8` |
| **STAGE baseline (pre-merge)** | `603eff2e6888c8103625a6db3c9eccb57ca84347` |
| **Merge commit** | _(post-merge — see STAGE HEAD below)_ |
| **Canonical STAGE HEAD (post-merge)** | _(post-merge)_ |

### Product rule (frozen)

One global **`+ Erstellen`** trigger; same menu, permissions, and Composer family on all eligible planning surfaces. Page context drives origin only — cross-domain create (e.g. Matchcenter → Turnier) is supported.

### PO UAT

| Gate | Result |
| --- | --- |
| **01G PO UAT** | **PASS** |
| **MANUAL_UAT_BY_CURSOR** | **SKIPPED_PO_OWNED** |
| **SCREENSHOTS_BY_CURSOR** | **SKIPPED_PO_OWNED** |

### Architecture delivered (frozen)

| Area | Contract |
| --- | --- |
| **Global trigger** | `SceActivityCreateMenu` + `buildSceActivityCreateMenuProps` |
| **Surfaces** | Wochenplaner, Trainings, Matchcenter, Tournamentcenter, Veranstaltungen, Planning Hub re-export |
| **Permissions** | `TRAININGS_MANAGE` / `EVENTS_MANAGE` mapping; page-independent resolver |
| **Composers** | Four families unchanged — overlay contextual create; `/new` fallbacks retained |
| **Legacy parallel CTAs** | **0** on eligible surfaces; deprecated `*ComposerCreateTrigger` re-exports only |

### Migrations (01G)

**NONE**

### Automated validation (closure)

Vitest: **24** files · **290** tests (01A–01G activity-create regression + `SceActivityCreateMenu` component tests) — **0 failures**. Prisma validate **PASS**. Production build **PASS** (`NODE_OPTIONS='--max-old-space-size=8192' npm run build`).

### Design system & Toggle First

**SCE_DESIGN_SYSTEM_COMPLIANCE = PASS** · **PARALLEL_LEGACY_PATTERN = NO** (eligible surfaces) · **BINARY_CONTROL_COMPLIANCE = PASS** · **NEW_BINARY_CHECKBOXES = 0**

### Next

**SCE-ACTIVITY-CREATE-01H** — Core Planning Surfaces Adoption (**NOT_STARTED**). **SCE-TOURNAMENT-PLANNER-01** — **PLANNED — NOT STARTED**.
