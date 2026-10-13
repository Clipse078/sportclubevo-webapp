# SCE-UI-ROLLOUT-01G-R1 — Club Event team audience architecture

| Field | Value |
|-------|-------|
| **Parent** | [`SCE-UI-ROLLOUT-01G`](./SCE-UI-ROLLOUT-01G.md) |
| **Scope** | Domain analysis + presentation contract only (01G-R1) |

## CURRENT_EVENT_TEAM_MODEL

- `Event.teamId` — nullable, documented as **compatibility-only** for non-tournament events; not an authoritative multi-team audience.
- No `ClubEventTeam` (or equivalent) join table for event **scope**.
- `EventParticipationAudienceEntry` — N rows per event with `kind` ∈ `PERSON` | `TEAM` | `ORG_UNIT` | `ROLE`; models **participation invitees**, not «Gültig für» scope.

## CURRENT_TEAMID_SEMANTICS

- Legacy / compatibility pointer on `Event`; must not be used as the long-term «selected teams» model for club events.

## N_TO_M_ALREADY_SUPPORTED

- **For event scope:** **NO** — requires a dedicated audience/scope relation (or explicit scope enum + team join).
- **For participation:** **YES** — multiple `EventParticipationAudienceEntry` rows (including multiple `TEAM` entries).

## PUBLICATION_MODEL

- Boolean visibility flags on `Event` (`websiteVisible`, `infoboardVisible`, `homepageVisible`, `wochenplanVisible`, `trainingsplanVisible`, `teamPageVisible`) — **where** an event may appear; separate from scope and participation.

## ATTENDANCE_MODEL

- `ParticipationResponse` with club-event kind — RSVP / attendance state for invited persons; separate from scope.

## ORGANISER_MODEL

- `Event.organizerName` (+ tenant branding fallback in SCE adapters) — **who hosts/organises**; separate from scope and participation audience.

---

## TARGET SCOPE MODEL (canonical contract)

| Scope | Meaning | Presentation examples |
|-------|---------|------------------------|
| `CLUB_WIDE` | Whole club | `FC Allschwil / Gesamter Verein` |
| `SELECTED_TEAMS` | 1..N teams | `Junioren F2` · `Junioren F1 · Junioren F2 · Junioren E1` · compact `3 Teams` |

**Relationship (target persistence):**

```text
ClubEvent (Event.type=OTHER)
  ↕
ClubEventTeam (proposed)
  ↕
Team
```

Do **not** overload `teamId`, publication flags, organiser, or participation audience entries as scope.

## Presentation evolution (01G-R1)

- `SceClubEventPresentationModel.audience?: SceClubEventAudiencePresentation` — optional; populated only from authoritative scope data (none wired in R1).
- Helpers: `lib/sporting-activity-presentation/canonical/club-event-audience-presentation.ts`.

## TARGET create/edit UX (future)

**Gültig für**

- `[ Gesamter Verein ]` · `[ Ausgewählte Teams ]` (mode selector — not per-team toggles)
- When **Ausgewählte Teams:** multi-select team control (same pattern as other SCE multi-selects).

## PROGRAMME integration contract (future)

Eligibility for team programme, Mein Programm, Dashboard, Wochenplaner, mobile programme, and notifications must follow **resolved event audience membership**, not publication flags alone. `CLUB_WIDE` events may surface club-wide. Implementation belongs to **01H+**, not 01G-R1.

---

## FOLLOW-UP PACKAGE

| Item | Value |
|------|-------|
| **REQUIRED** | YES |
| **PACKAGE** | [`SCE-CLUB-EVENT-AUDIENCE-01`](./SCE-CLUB-EVENT-AUDIENCE-01.md) (schema + API + create/edit UX + adapter wiring into `resolveSceClubEventPresentation`) — **scheduled immediately after 01G closure** |
| **DB_CHANGE_REQUIRED** | YES — `ClubEventTeam` (or equivalent) + scope mode on club event |
| **WHY** | Existing schema conflates compatibility `teamId` and participation audience; PO requires distinct **event scope** with N teams |
