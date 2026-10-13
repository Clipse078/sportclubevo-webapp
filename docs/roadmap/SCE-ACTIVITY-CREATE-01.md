# SCE-ACTIVITY-CREATE-01 — Unified Activity Creation Experience (programme)

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-ACTIVITY-CREATE-01` |
| **Programme** | Post [`SCE-CLUB-EVENT-AUDIENCE-01`](./SCE-CLUB-EVENT-AUDIENCE-01.md) |
| **Status** | **IN_PROGRESS** — 01A **CLOSED**; **01B** next (foundation) |
| **First slice** | [`SCE-ACTIVITY-CREATE-01A`](./SCE-ACTIVITY-CREATE-01A.md) — **CLOSED** (PR **#838**, ADR-11 **ACCEPTED**) |
| **Next slice** | **SCE-ACTIVITY-CREATE-01B** — Activity Composer Foundation (**NOT_STARTED**) |

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
  → SCE-ACTIVITY-CREATE-01B — Composer foundation — NOT_STARTED
  → SCE-ACTIVITY-CREATE-01C–01G — Domain adoption & planning integration — NOT_STARTED
  → SCE-UI-ROLLOUT-01H — Core planning surfaces adoption
  → … (01I–01N per SCE-UI-ROLLOUT-01)
```

## Architecture gate (01A closure)

| Field | Value |
|-------|-------|
| **Decision** | Option C — adaptive `SceActivityComposer` + `/new` fallback |
| **Gate** | **CONDITIONAL_PASS_ACCEPTED** |
| **Condition** | Composer-safe child interactions (Club Event audience selector in **01C**) |

## Out of scope for 01A (unchanged for 01B+ discipline)

- Implementing domain create migrations before the matching adoption package (01C–01F)
- Generic Activity persistence/API or parallel domain modal implementations
- PROD deploy unless explicitly scheduled
