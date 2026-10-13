# SCE-ACTIVITY-CREATE-01 — Unified Activity Creation Experience (programme)

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-ACTIVITY-CREATE-01` |
| **Programme** | Post [`SCE-CLUB-EVENT-AUDIENCE-01`](./SCE-CLUB-EVENT-AUDIENCE-01.md) |
| **Status** | **IN_PROGRESS** — 01A research complete pending PO architecture review |
| **First slice** | [`SCE-ACTIVITY-CREATE-01A`](./SCE-ACTIVITY-CREATE-01A.md) — **IMPLEMENTED_PENDING_ARCHITECTURE_REVIEW** |

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
  → SCE-ACTIVITY-CREATE-01A — Research & Architecture (IMPLEMENTED_PENDING_ARCHITECTURE_REVIEW)
  → (gate) SCE-ACTIVITY-CREATE-01B+ — Composer foundation & domain adoption
  → SCE-UI-ROLLOUT-01H — Core planning surfaces adoption
  → … (01I–01N per SCE-UI-ROLLOUT-01)
```

## Out of scope until gate passes

- Implementing `SceActivityComposer` in research-only packages
- Replacing working domain create flows without adoption plan
- PROD deploy unless explicitly scheduled
