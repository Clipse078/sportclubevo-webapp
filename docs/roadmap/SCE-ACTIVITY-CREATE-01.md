# SCE-ACTIVITY-CREATE-01 — Unified Activity Creation Experience (programme)

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-ACTIVITY-CREATE-01` |
| **Programme** | Post [`SCE-CLUB-EVENT-AUDIENCE-01`](./SCE-CLUB-EVENT-AUDIENCE-01.md) |
| **Status** | **IN_PROGRESS** — 01A **CLOSED**; 01B **CLOSED** (PR **#839**); **01C** **CLOSED** (PR **#840**, PO final visual UAT **PASS**) |
| **First slice** | [`SCE-ACTIVITY-CREATE-01A`](./SCE-ACTIVITY-CREATE-01A.md) — **CLOSED** (PR **#838**, ADR-11 **ACCEPTED**) |
| **Foundation slice** | **SCE-ACTIVITY-CREATE-01B** — Activity Composer Foundation + R1/R2/R3 — **CLOSED** (PR **#839**, PO visual UAT **PASS**) |
| **Reference slice** | **SCE-ACTIVITY-CREATE-01C** — Club Event Reference Adoption — **CLOSED** (PR **#840**) |
| **Next slice** | **SCE-ACTIVITY-CREATE-01D** — Training domain adoption (**NOT_STARTED**) |

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
  → SCE-ACTIVITY-CREATE-01D–01G — Domain adoption & planning integration — NOT_STARTED
  → SCE-UI-ROLLOUT-01H — Core planning surfaces adoption
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
