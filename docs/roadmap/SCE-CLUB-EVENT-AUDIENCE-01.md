# SCE-CLUB-EVENT-AUDIENCE-01 — Club Event Audience & Team Scope

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-CLUB-EVENT-AUDIENCE-01` |
| **Programme** | [`SCE-UI-ROLLOUT-01+`](./SCE-UI-ROLLOUT-01.md) |
| **Status** | **NOT_STARTED** |
| **Predecessor** | [`SCE-UI-ROLLOUT-01G`](./SCE-UI-ROLLOUT-01G.md) **CLOSED** |
| **Successor** | [`SCE-UI-ROLLOUT-01H`](./SCE-UI-ROLLOUT-01.md) — Core planning surface adoption |
| **Architecture input** | [`SCE-UI-ROLLOUT-01G-R1-TEAM-AUDIENCE-ARCHITECTURE.md`](./SCE-UI-ROLLOUT-01G-R1-TEAM-AUDIENCE-ARCHITECTURE.md) |

## Objective

Deliver the **authoritative Club Event audience / team scope** model so create/edit, API, permissions, programme eligibility, and **`resolveSceClubEventPresentation`** consume one contract — without conflating scope with publication, attendance, or organiser.

## Scope model (canonical)

| Mode | Meaning |
|------|---------|
| `CLUB_WIDE` | Event concerns the whole club |
| `SELECTED_TEAMS` | Event concerns **1..N** selected teams |

**Target persistence (N:M):**

```text
ClubEvent (Event.type = OTHER)
  ↕
ClubEventTeam (proposed join)
  ↕
Team
```

## Separation of concerns (non-negotiable)

| Concern | Role | Must not substitute for audience |
|---------|------|----------------------------------|
| **AUDIENCE** | Who the event concerns («Gültig für») | — |
| **PUBLICATION** | Where the event may appear (website, infoboard, …) | Not scope |
| **ATTENDANCE** | RSVP / participation responses | Not scope |
| **ORGANISER** | Who hosts / organises (`organizerName`, branding) | Not scope |

## Legacy compatibility

- `Event.teamId` remains **compatibility-only** until migration completes; it is **not** the long-term multi-team audience model.
- Migration strategy must preserve existing behaviour during transition and wire **`SceClubEventPresentationModel.audience`** from authoritative scope data only.

## Target create/edit UX

**Gültig für**

- `( ) Gesamter Verein` → `CLUB_WIDE`
- `( ) Ausgewählte Teams` → `SELECTED_TEAMS`

When **Ausgewählte Teams:**

- **Teams** — multi-select (1..N); use SCE multi-selection patterns — **not** independent per-team binary toggles.

Mode selection is a **single-choice scope control**. Team selection is a **multi-selection control**.

## Vertical slice (future implementation)

Architecture-level deliverables for this package:

- [ ] Scope enum + validation (`CLUB_WIDE` \| `SELECTED_TEAMS`)
- [ ] N:M persistence (`ClubEventTeam` or equivalent)
- [ ] Create/edit support on Veranstaltungen planning surfaces
- [ ] API / DTO exposure and permission checks
- [ ] Adapter wiring into `resolveSceClubEventPresentation` / `SceClubEventAudienceLine`
- [ ] Programme eligibility contract (team programme, Mein Programm, Dashboard, Wochenplaner, notifications) based on **resolved audience membership**, not publication flags alone
- [ ] Legacy `Event.teamId` compatibility and migration plan
- [ ] Automated guardrails (no publication ↔ audience conflation in presentation builders)

## Out of scope

- Broad **01H** planning-surface card adoption (starts after this package)
- Match / Training / Tournament audience models
- PROD deploy unless explicitly scheduled

## Design system

Audience lines follow [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md) Club Event family: audience is distinct from organiser, schedule, location, lifecycle status, and publication metadata.

## Toggle First

Scope mode uses **single-choice** controls; team pickers use **multi-select** — not new binary-setting checkboxes per team.
