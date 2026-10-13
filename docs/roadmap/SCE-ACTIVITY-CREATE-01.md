# SCE-ACTIVITY-CREATE-01 — Unified Activity Creation Experience (programme)

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-ACTIVITY-CREATE-01` |
| **Programme** | Post [`SCE-CLUB-EVENT-AUDIENCE-01`](./SCE-CLUB-EVENT-AUDIENCE-01.md) |
| **Status** | **IN_PROGRESS** — 01A **CLOSED**; 01B **CLOSED** (PR **#839**); **01C** **IMPLEMENTED_PENDING_PO_UAT** (PR **#840**, R1 completion) |
| **First slice** | [`SCE-ACTIVITY-CREATE-01A`](./SCE-ACTIVITY-CREATE-01A.md) — **CLOSED** (PR **#838**, ADR-11 **ACCEPTED**) |
| **Foundation slice** | **SCE-ACTIVITY-CREATE-01B** — Activity Composer Foundation + R1/R2/R3 — **CLOSED** (PR **#839**, PO visual UAT **PASS**) |
| **Next slice** | **SCE-ACTIVITY-CREATE-01C** — Club Event Reference Adoption (**IMPLEMENTED_PENDING_PO_UAT**) |

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
  → SCE-ACTIVITY-CREATE-01C — Club Event reference adoption — IMPLEMENTED_PENDING_PO_UAT
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
