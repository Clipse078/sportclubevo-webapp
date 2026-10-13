# SCE-UI-ROLLOUT-01+ — Unified Product Experience System

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-UI-ROLLOUT-01+` |
| **Status** | **IN_PROGRESS** — **01A–01G** closed; **SCE-CLUB-EVENT-AUDIENCE-01** next |
| **Predecessor** | `MATCH_SQUAD_PLAYER_AVAILABILITY-01F` **CLOSED** |
| **Not in scope for planning doc** | Implementation branches, component code, PROD deploy |

---

## 1. Programme objective (Product Owner)

> **One SCE. One navigation language. One activity language. One visual family.**

This programme expands beyond cosmetic workspace rollout. It unifies how users move through SCE and how activities are recognized everywhere in the webapp.

---

## 2. Foundation A — Unified SCE workspace / surface system

Based on [`SCE-UI-STANDARD-01`](../design/SCE-WORKSPACE-SURFACE-STANDARD.md) (foundation established; first adoption via `SCE-ACTIVITY-NAV-01`):

- Atmospheric SCE background
- Contextual page / activity header
- Navigation
- Dark workspace
- Functional sections / cards
- Fields / actions
- Consistent spacing, typography, icon semantics, action hierarchy
- Responsive behaviour
- Loading / empty / error states

**SCE-UI-STANDARD-01** is **FOUNDATION ESTABLISHED / INCORPORATED INTO SCE-UI-ROLLOUT-01+** — not a parallel independent rollout track.

---

## 3. Foundation B — Universal context tabs

The tab model from [`SCE-ACTIVITY-NAV-01`](../activity-navigation/SCE-ACTIVITY-NAV-01.md) (Training, Match, Tournament, Club Event) becomes the **canonical contextual-detail navigation pattern** for eligible SCE domains.

**Principle:**

```text
Identity / context header → contextual tabs → tab workspace
```

- Domain-specific information architecture remains allowed (not every object gets identical tab labels).
- Interaction model must become uniform: same visual tab family, active indicator, responsive behaviour, deep-link model, permission-aware visibility, dirty-state protection, keyboard/focus semantics, browser back/forward behaviour, inaccessible/invalid-tab fallback.
- Evolve and reuse the Activity Navigation architecture — **do not** replace with a competing tab framework.

---

## 4. Foundation C — Universal activity presentation

Training, Match, Tournament, and Club Event presentations must be **canonical and uniform** across the complete SCE webapp. The same underlying activity must not be independently formatted by Dashboard, Mein Programm, Team pages, Matchcenter, Tournamentcenter, Wochenplaner, Communication, notifications, etc.

**Target architecture:** canonical activity-presentation / view-model layer and shared activity-card family.

**Activity types:** Training · Match · Tournament · Club Event

**Density variants** (same semantic hierarchy): hero · standard · compact · micro

---

## 5. Canonical match card identity (Product Owner)

Everywhere SCE presents a football match as a card or equivalent activity identity:

```text
HOME CLUB NAME | HOME LOGO | VS | AWAY LOGO | AWAY CLUB NAME
```

- Home is **always** home; away is **always** away.
- **Do not** reorder based on tenant, FC Allschwil team membership, user context, or list context.

**Conceptual hierarchy:**

1. Competition / context  
2. Home club name · home logo · VS · away logo · away club name  
3. Date / time · venue / resource  
4. Status / relevant operational context  

Compact variants may compress layout but must preserve semantic order and identity.

---

## 6. Other canonical activity identities

### Training

Consistently expose: training/team identity, date/time, club/host, venue, resource (where applicable).

Preserve location hierarchy: **club/host → venue → resource** (e.g. `FC Allschwil · Im Brüel · KR2`).

### Tournament

Consistently expose: tournament identity, organising club, date/time, venue, Hauptteam / own-team context where appropriate. Organising club must not disappear depending on surface.

### Club Event

Consistently expose: event identity, organiser/club where appropriate, date/time, venue, semantic event status/context.

---

## 7. Package baseline (01A–01N)

Planning baseline only — **01A must gather repository evidence** before treating later boundaries as immutable.

| Package | Scope |
|---------|--------|
| **SCE-UI-ROLLOUT-01A** | Product-wide UI inventory + canonical UX architecture + component/view-model contracts — **[closure doc](./SCE-UI-ROLLOUT-01A.md)** |
| **SCE-UI-ROLLOUT-01B** | Universal Context Tabs architecture |
| **SCE-UI-ROLLOUT-01C** | Universal Activity Presentation Model |
| **SCE-UI-ROLLOUT-01D** | Canonical Match Card family |
| **SCE-UI-ROLLOUT-01E** | Canonical Training Card family |
| **SCE-UI-ROLLOUT-01F** | Canonical Tournament Card family |
| **SCE-UI-ROLLOUT-01G** | Canonical Club Event Card family |
| **SCE-CLUB-EVENT-AUDIENCE-01** | Club Event audience & team scope (`CLUB_WIDE` \| `SELECTED_TEAMS`, N:M teams) — **[contract doc](./SCE-CLUB-EVENT-AUDIENCE-01.md)** |
| **SCE-UI-ROLLOUT-01H** | Core planning surface adoption (Matchcenter / Trainings / Tournamentcenter / Veranstaltungen) — adopts audience-aware Club Event contract |
| **SCE-UI-ROLLOUT-01I** | Dashboard + Mein Programm adoption |
| **SCE-UI-ROLLOUT-01J** | Team / programme / calendar / related-activity adoption |
| **SCE-UI-ROLLOUT-01K** | Communication / notifications / cross-module activity references |
| **SCE-UI-ROLLOUT-01L** | Remaining eligible contextual-detail pages → Universal Context Tabs |
| **SCE-UI-ROLLOUT-01M** | Responsive/mobile-readiness + accessibility + visual-consistency audit |
| **SCE-UI-ROLLOUT-01N** | Product-wide integrity/UAT sweep + legacy presentation removal |

### Package rollout status

| Package | Status |
|---------|--------|
| **01A** | **CLOSED** |
| **01B** | **CLOSED** |
| **01C** | **CLOSED** |
| **01D** | **CLOSED** |
| **01E** | **CLOSED** |
| **01F** | **CLOSED** — [`SCE-UI-ROLLOUT-01F.md`](./SCE-UI-ROLLOUT-01F.md); PO visual UAT **PASS (R4)** |
| **01G** | **CLOSED** — [`SCE-UI-ROLLOUT-01G.md`](./SCE-UI-ROLLOUT-01G.md); PO visual UAT **PASS (01G-R1)** |
| **SCE-CLUB-EVENT-AUDIENCE-01** | **NOT STARTED** — [`SCE-CLUB-EVENT-AUDIENCE-01.md`](./SCE-CLUB-EVENT-AUDIENCE-01.md) |
| **01H** | **NOT STARTED** |
| **01I** | **NOT STARTED** |
| **01J** | **NOT STARTED** |
| **01K** | **NOT STARTED** |
| **01L** | **NOT STARTED** |
| **01M** | **NOT STARTED** |
| **01N** | **NOT STARTED** |

**Sponsor Commercial Workflows:** AFTER COMPLETE UI ROLLOUT  
**Mobile App:** AFTER SPONSOR

### Committed 01G+ sequence (post Club Event card closure)

```text
01G Club Event Card Family — CLOSED
  → SCE-CLUB-EVENT-AUDIENCE-01 — NEXT
  → 01H Core Planning Surfaces Adoption — NOT_STARTED
  → 01I Dashboard + Mein Programm
  → 01J Team/programme/calendar adoption
  → 01K Communication/activity references
  → 01L Remaining contextual pages
  → 01M Responsive/accessibility audit
  → 01N Product-wide integrity sweep
```

**01H+** must adopt the **audience-aware** Club Event contract from `SCE-CLUB-EVENT-AUDIENCE-01`, not the legacy single-team `Event.teamId` compatibility model.

---

## 8. Committed roadmap sequence (post Match Squad closure)

```text
MATCH_SQUAD_PLAYER_AVAILABILITY (01A–01F) — CLOSED
  → SCE-UI-ROLLOUT-01+ (this programme)
  → Sponsor Commercial Workflows
  → Mobile App
```

Backlog ideas remain backlog unless separately promoted.
