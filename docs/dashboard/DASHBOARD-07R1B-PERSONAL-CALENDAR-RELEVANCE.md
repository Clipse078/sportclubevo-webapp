# DASHBOARD-07R1B — Personal Calendar Relevance

**Branch:** `cursor/dashboard-d-personal-workspace-discovery`  
**Base:** `STAGE`  
**PR:** #706  

---

## Human acceptance defect

Authenticated review on the reference tenant showed:

- **Mein Programm:** correctly listed the personally relevant F2 **Blitzturnier** on **27 Sep 2026 09:30**.
- **Mein Kalender:** displayed numerous **club-wide** matches/tournaments **without** a personal relationship to the actor.

That violates the dashboard contract: *Mein Verein aus meiner Perspektive.*

---

## Root cause

| Layer | Finding |
|-------|---------|
| Programme loader | Single `loadPersonalProgramme()` feeds both surfaces (`getPersonalCommandCenterData`). |
| PersonalContext | Relevance is relationship-based; permissions are not relevance. |
| Team-event adapter | Candidate scope used **teamId IN personal teams** only. For multi-season / multi-team memberships this could still surface **authorized** rows outside the actor's **active trainer/player teamSeason scope** when `teamSeasonId` on events did not align with personal sporting membership rows. |
| Calendar dataset | **Same** `PersonalProgrammeItem[]` as programme — no second loader. |
| Feed vs calendar window | Programme feed applies the **14-day forward window**; calendar projects the **merged month ∪ feed query range**, so unrelated rows outside the feed window appeared **only on the calendar**, masking the defect during feed-only checks. |

**Exact cause:** Personal calendar markers are projections of `PersonalProgrammeItem[]`. Unrelated club events were present in that array because the team-event programme adapter did not enforce **teamSeason-aligned personal sporting scope** at the canonical projection boundary (relevance before authorization before DTO mapping).

---

## Canonical rule

**Relationship establishes relevance.**  
**Domain authorization establishes visibility.**

Club Admin, `MATCHES_VIEW`, `TOURNAMENTS_VIEW`, `EVENTS_VIEW`, and tenant membership **do not** expand personal calendar/programme relevance.

---

## Fix (projection boundary)

1. **`PersonalTeamRelationship.teamSeasonIds`** — collected from active `TrainerTeamMember` / `PlayerSquadMember` rows in `resolvePersonalContext`.
2. **`isPersonalTeamEventRowRelevant()`** — teamId must be personally relevant; when `event.teamSeasonId` is set it must match a personal teamSeason scope.
3. **`loadTeamEventProgrammeItems()`** — query scope uses personal teamIds **and** teamSeason OR-branch; post-filter uses the same relevance helper.
4. **`personal-programme-universe.ts`** — parity helpers: calendar activity ids/day keys ⊆ programme universe.

No client-side team filter. No club-wide toggle. No FCA hard-coding.

---

## Programme / calendar parity

For one loaded `PersonalProgrammeItem[]`:

- Calendar activity ids ⊆ programme item ids.
- Calendar occupied day keys ⊆ programme day keys (tenant-local).
- No calendar-only event discovery.

Mein Programm may show a **shorter forward window** than the month grid; both originate from the same personal universe.

---

## Zero-disclosure matrix

Covered in `lib/personal-agenda/__tests__/dashboard-07r1b-personal-calendar-relevance.test.ts` (cases A–L + Sep 27 palette).

---

## Reference acceptance case (FCA actor)

| Field | Value |
|-------|--------|
| Relationship | Junioren F2 trainer |
| Local date/time | 2026-09-27 09:30 Europe/Zurich |
| Item | TOURNAMENT — Blitzturnier |
| Calendar | Orange (`tournament-orange`) marker on 27 Sep |

---

## Status

**DASHBOARD-07R1B** — engineering remediation complete; **DASHBOARD-07R2** human visual acceptance pending.
