# MATCH-SQUAD-PLAYER-AVAILABILITY-01 — Architecture & Foundation Diagnosis

| Field | Value |
|-------|-------|
| **Package** | Match Squad & Player Availability |
| **Canonical key** | `MATCH_SQUAD_PLAYER_AVAILABILITY` |
| **Mode** | Architecture + diagnosis only (no 01A implementation in this run) |
| **Branch** | `cursor/match-squad-player-availability-01-foundation` |
| **Base** | `origin/STAGE` @ `6ffee0a42965872cca447777ff5f55f027c8b380` |
| **STAGE deploy SHA (2026-10-10)** | `6ffee0a42965872cca447777ff5f55f027c8b380` (matches repo; prior lag resolved) |

---

## 1. Product vision

Match-centric workflow for club trainers:

```text
MATCH → canonical TeamSeason → Match Squad (selected / not selected)
  → explicit cross-team availability (never automatic from “not selected”)
  → conditions → discovery in target-match context → request
  → home-team (Stammtrainer) approval → player/guardian confirmation where required
  → assignment → final squad → communication (domain state ≠ delivery)
```

**Obsolete terminology:** “Weekend Squad & Player Exchange” — the product is **not** weekend-specific. Matches may occur on any weekday, evening, tournament day, or rescheduled slot.

**Core invariants:**

1. **Match-centric** — no floating club-wide player marketplace as primary UX.
2. **Stammtrainer control** — another team cannot take a player without an approved lifecycle.
3. **Explicit release** — `NOT_SELECTED ≠ AVAILABLE_TO_OTHER_TEAMS`.
4. **No silent double-booking** — overlapping activities must be detectable (reuse planner/time overlap where possible).

---

## 2. Repository diagnosis — match domain

### Canonical match model

| Question | Answer |
|----------|--------|
| **MATCH_MODEL** | There is **no** separate `Match` Prisma model. A match is `Event` with `type = MATCH` (`lib/matchcenter/match-lifecycle-service.ts`). |
| **MATCH_ID** | `Event.id` (cuid). |
| **TENANT_LINK** | `Event.tenantId` (required for tenant-scoped operations). |
| **SEASON_LINK** | `Event.seasonId` (nullable after season delete — SetNull). |
| **TEAM_LINK** | `Event.teamId` — primary owning team for many flows; nullable for legacy/import. |
| **TEAMSEASON_LINK** | `Event.teamSeasonId` — **authoritative when set** for tournaments; for MATCH often **null** on SFV rows; resolved via `teamId + seasonId` (`lib/weekplanner/match-team-season-resolution.ts`, `lib/planning/load-match-planning-participants.ts`). |
| **HOME_AWAY_MODEL** | `Event.homeAway`; sides resolved via `MatchExternalMapping` (SFV) or manual opponent (`opponentExternalClubId` / `opponentName`). |
| **START_END** | `Event.startAt`, `Event.endAt`, optional `operationalEndAtOverride` (SCE-owned for ops). |
| **STATUS** | `Event.status` (`EventStatus`) + sporting lifecycle via `lib/sporting-data/lifecycle` and matchcenter presenters. |
| **CANCELLATION** | Status lifecycle (`CANCELLED`, `POSTPONED`, etc.); separate from permanent delete (`matches.delete`). |
| **SOURCE** | `Event.source` (`EventSource`: SFV, MANUAL, imports, …). |
| **SFV_SYNC** | `MatchExternalMapping` 1:1 with `Event`; identity `(tenantId, provider, externalMatchId)`; sync does not require mutating SCE squad fields on `Event`. |
| **MANUAL_MATCH_SUPPORT** | Yes — manual create orchestration in `lib/matchcenter/create-match-orchestration.ts`. |
| **VENUE** | `Event.location`, pitch/dressing codes, `MatchExternalMapping.providerVenueName`, facility allocations. |
| **COMPETITION** | `Event.competitionLabel`, mapping league/division fields. |
| **ACTIVITY_PRESENTATION** | `lib/sporting-activity-presentation/`, matchcenter view-models, Activity Detail consume path. |
| **COMMUNICATION_CONTEXT** | SCE-COLLAB-01B match adapters; `PlatformCommunication` linked via `RequestLinkedEvent`; audience via Spielbetrieb / COMM-10 participation presets. |

**Authority split:**

| Layer | Externally authoritative (SFV) | SCE-owned (safe for squad attach) |
|-------|-------------------------------|-----------------------------------|
| Kickoff, opponent IDs, provider state, scores | Yes (via sync) | Do not require writes to attach squad |
| Pitch/dressing/meeting time, participation deadlines, visibility flags | Mixed — some synced | Operational overrides allowed where documented |
| **Match squad / selection / release / borrow** | N/A | **Must be SCE-owned aggregates** keyed by `Event.id` + `teamSeasonId` |

**Reschedule identity:** Same `Event.id` is retained across reschedule mutations; SFV mapping stays on the row. Squad state should remain on stable `eventId` unless product defines explicit “new fixture” semantics for provider re-import (tombstone + new row is a separate delete path).

---

## 3. People / roster diagnosis

Canonical chain (from SCE-PEOPLE-TEAM-ONBOARDING-01 — **preserve**):

```text
Team → active TeamSeason → ACTIVE PlayerSquadMember → Person → User (optional)
```

| Topic | Finding |
|-------|---------|
| **CANONICAL_PLAYER_MEMBERSHIP** | `PlayerSquadMember` on `TeamSeason`; statuses `PlayerSquadStatus` (ACTIVE, INACTIVE, INJURED, ABSENT, …). |
| **TRAINER_MEMBERSHIP** | `TrainerTeamMember` on `TeamSeason`; used for trainer auth patterns (e.g. team comm send). |
| **PersonAssignment_ROLE** | Operational **relationship** only — **not** Kader membership; must not backfill squad candidates. |
| **USER_LINK** | `Person.userId` optional; squad management must not require User. |
| **GUARDIAN_LINK** | `GuardianRelationship` (Person↔Person); COMM-03 / COMM-18 expansion via `loadGuardianRecipientsForSubjects`. |

**Eligible squad candidates (01A hypothesis — verified with gaps):**

- **Should be:** ACTIVE (and product may include INJURED/ABSENT for “on roster but not selected” — align with `ACTIVE_PLAYER_STATUSES` in `team-communication-authorization-scope.ts`: ACTIVE, INJURED, ABSENT).
- **Today in participation reads:** `getParticipationForEvent` and `participation-audience-resolution.loadEligiblePersonIds` load **all** `PlayerSquadMember` rows for `teamSeasonId` **without** `status` filter — **inconsistency** vs onboarding/COMM-03 intent. **01A must define and test explicit ACTIVE policy.**

**TeamSeason resolution for a match:**

1. Prefer `Event.teamSeasonId` when set.
2. Else resolve `Event.teamId` + `Event.seasonId` → `TeamSeason.id` (same as weekplanner + match detail participants section).

**Multi-team note:** One MATCH Event has one primary `teamId` in many UIs; away/home club context comes from mapping. Match Squad for **our** team is scoped to **one** canonical `teamSeasonId` per club side, not both teams in a fixture.

---

## 4. Existing squad / Aufgebot capability

| Layer | Exists? | Detail |
|-------|---------|--------|
| **MODEL** | **No** `MatchSquad`, `MatchSquadMember`, or match-day selection entity. |
| **Participation (RSVP)** | **Yes** — `ParticipationResponse` per `(personId, eventId)` for MATCH/TOURNAMENT. |
| **Attendance (post-event)** | **Yes** — `AttendanceRecord` per `(personId, eventId)`. |
| **SERVICE** | `lib/participation/participation-service.ts` — RSVP writes; roster check on write. |
| **API** | Team cockpit attendance/participation routes; `matchcenter/[matchId]/participation-request`; personal-actions participation submit. |
| **UI** | Matchcenter detail: read-only participant list from **full season squad** + RSVP status (`PlanningParticipantsList`). Team cockpit: **Teilnahmen**, **Anwesenheit** — not match-day subset selection. |
| **PERSISTENCE for “selected for this match”** | **Absent** — documented in `docs/communication/SCE-DOMAIN-CONSUMERS-01.md` (MISSING: MATCH-SPECIFIC AUFGEBOT / SELECTION). |
| **REUSABLE** | Roster queries, participation/attendance patterns, audit (`logAction`), teamSeason resolution, sporting activity presentation. |
| **GAP** | Explicit **match squad membership** (selected / draft / published) distinct from RSVP and distinct from season `PlayerSquadMember`. |

**Do not repurpose `ParticipationResponse` as selection:** RSVP is player/guardian intent (YES/NO/MAYBE/OPEN), not trainer nomination. Collapsing them would break COMM-10 semantics and personal “Mein Programm” participation actions.

---

## 5. Communication & collaboration

| Component | Role for future squad package |
|-----------|------------------------------|
| **COMM-03** | Recipient resolution pipeline; roster-based subject lists must remain explicit; no PersonAssignment fallback. |
| **COMM-10** | Event participation presets (NOT_RESPONDED, etc.) on **full squad** — migrate/wrap via Spielbetrieb DomainAudience (`lib/spielbetrieb/`). |
| **COLLAB_01 (A–D)** | **CLOSED** — contextual prepare/publish after activity mutations; match/tournament/training/club-event adapters. |
| **REUSABLE_FOR_SQUAD** | Post-save “squad published / changed” should use same **prepare → review → send** seam, not a second messaging engine. |
| **DOMAIN_VS_DELIVERY** | `ParticipationResponse` / future `MatchSquadMember` / `PlayerRelease` state must commit in domain services; comm failure must not roll back domain; sending must not be source of truth for approval. |

Deferred roadmap name **TRAINER-SPIELERBOERSE-01** is a **consumer** of collaboration seams; product term is now **Match Squad & Player Availability** (`MATCH_SQUAD_PLAYER_AVAILABILITY`).

---

## 6. Permission diagnosis

| Action | Current mapping | Gap |
|--------|-----------------|-----|
| View team cockpit / squad list | `teams.view` (tenant) | OK |
| Manage roster (season) | `teams.manage`, `people.manage` for person ops | OK for Kader, not match squad |
| Edit match (ops fields) | `events.manage`, planning allocation perms | OK |
| Team comm send | `communication.team.send` **or** active `TrainerTeamMember` on current season **or** `teams.manage` | Pattern for **trainer-on-team** vs **coordinator** |
| Match squad edit (proposed) | **No dedicated key** | Likely **`teams.manage` + trainer allocation** for own team, or new fine-grained key later |

**Rules to enforce in 01A:**

- **OWN_TEAM:** Mutations must validate `teamSeasonId` belongs to match’s resolved own-team season and `tenantId`.
- **CROSS_TEAM:** Deny by default until 01C; no trainer may release another team’s players.
- **ADMIN:** Club admin / `teams.manage` may override per product — document in 01A tests.

**NEW_PERMISSION_REQUIRED:** **Not for 01A** if squad edit is gated by existing `teams.manage` + server-side teamSeason ownership checks + optional trainer allocation (mirror `team-document-auth` / comm scope). Revisit **`match.squad.manage`** only if product requires delegating squad edit without `teams.manage`.

---

## 7. Conflict diagnosis

| Engine | Scope | Reusable for player double-booking? |
|--------|-------|-------------------------------------|
| **Weekplanner / facility** | `lib/weekplanner/conflict-detection.ts`, `lib/planning-hub/conflict-attention.ts` | **Partial** — resource occupancy (pitch/dressing), not person calendar |
| **Personal programme** | `lib/personal-agenda/` | Loads activities for a user; **no** person-person overlap engine found |
| **Participation/attendance** | Per-event records | Can **detect** same person on two events only if queried — no central service |

**Recommendation:** For 01C+, introduce **person-time overlap queries** (matches + tournaments + training sessions + accepted borrow assignments) reusing **time window** helpers from publishing/planner (`getEffectiveEndAt`, operational intervals). Classify HARD vs WARNING; training overlap should not hard-block release without product rule.

---

## 8. Domain model options

### Option A — Dedicated Match Squad aggregate (recommended)

`MatchSquad` (header: tenantId, eventId, teamSeasonId, status DRAFT|PUBLISHED|CLOSED)  
`MatchSquadMember` (squadId, personId, selectionRole?, sortOrder?, addedBy, timestamps)

**Pros:** Clear product fit; independent of RSVP; audit-friendly; SFV-safe.  
**Cons:** New schema; must sync lifecycle with match cancel/delete.

### Option B — Extend participation as “nominated”

Add e.g. `nominated: boolean` on `ParticipationResponse`.

**Pros:** No new table.  
**Cons:** Conflates trainer selection with player/parent RSVP; breaks COMM-10 “eligible population” semantics; poor guardian/mobile story.

### Option C — Reuse AttendanceRecord

**Rejected** — post-event attendance, wrong lifecycle and meaning.

### **SELECTED: Option A** for match-day selection; keep `ParticipationResponse` for RSVP after squad is published (optional product link in 01E).

---

## 9. Player availability / release model (later slices)

Conceptual aggregates ( **not implemented** — schema in 01B–01C):

- **PlayerRelease** — home `teamSeasonId`, `personId`, `sourceEventId`, window, conditions (JSON or normalized later), status AVAILABLE|WITHDRAWN|EXPIRED|…
- **PlayerRequest** — `releaseId`, requesting `teamSeasonId`, `targetEventId`, status REQUESTED|APPROVED|REJECTED|CANCELLED|…
- **Assignment** — links approved request to target match squad member row

**Multiple concurrent requests (design):**

- Allow **multiple** `PlayerRequest` in REQUESTED for same release.
- **Reservation** occurs at **HOME_TEAM_APPROVED** (or ASSIGNMENT) — not at REQUESTED.
- Stammtrainer (or delegate) selects winning request; others → REJECTED or EXPIRED via transaction.
- **No last-write-wins** on approval; use row-level status + unique partial index on `(releaseId) WHERE status IN ('APPROVED','ASSIGNED')` when product picks single-assign semantics.

**Availability window (product decision):** Default candidate for V1: **source match operational interval** (start → effective end) with explicit “whole day” override in 01B UI — do not guess in 01A.

---

## 10. Guardian & confirmation

| Scenario | Foundation today |
|----------|------------------|
| Adult with User | Personal participation actions; COMM-03 self-delivery |
| Junior with User | Same + safeguarding policies |
| Junior with guardian User(s) | `GuardianRelationship` + guardian expansion |
| No digital recipient | Domain state still valid; UI shows **manual follow-up** (pattern from Probetraining / comm fail-closed) |

**01D** implements accept/decline; **01A** must not block squad editing when `Person.userId` is null.

---

## 11. UX architecture (target)

| Area | Recommendation |
|------|----------------|
| **PRIMARY_ENTRY** | **Match-first:** `/dashboard/matchcenter/[matchId]` (Spiele) → section **Matchkader / Aufgebot**; secondary: Team cockpit → Spiele → deep link to match. |
| **MATCH_SQUAD_LAYOUT** | Reuse Activity Detail / planning editor visual language (dark SCE, compact cards) — align with `MatchcenterDetail` + planning sections already on match page. |
| **OWN_ROSTER** | Selected vs remaining from **same** ACTIVE roster list. |
| **RELEASE_ACTION** | On **remaining** players only — explicit “Für andere Teams verfügbar machen” (01B). |
| **CROSS_TEAM_DISCOVERY** | Inside **target match** squad prep: “Verfügbare Spieler aus anderen Teams” (01C) — not a standalone marketplace home. |
| **MOBILE_COMPATIBILITY** | All mutations via API/services (`lib/match-squad/` future); personal programme already projects MATCH events. |

---

## 12. Data integrity (lifecycle)

| Event | Proposed behavior |
|-------|-------------------|
| Match cancelled | Squad read-only or CLOSED; release/requests EXPIRED |
| Match deleted | Cascade or soft-close squad; tombstone aware for SFV |
| Rescheduled | Keep squad on same `eventId` |
| Player removed from Kader | Remove from draft squad; flag published squads |
| TeamSeason deactivated | Block new edits; historical read |
| Duplicate squad add | Unique `(squadId, personId)` |
| Wrong tenant/season | Reject in service layer |

---

## 13. Schema decision (01A only)

| Item | Value |
|------|-------|
| **SCHEMA_GAP** | **Confirmed** — no match selection persistence |
| **MIGRATION_REQUIRED_FOR_01A** | **Yes** — minimal Option A tables only |
| **PROPOSED_ENTITIES** | `MatchSquad`, `MatchSquadMember` |
| **PROPOSED_CONSTRAINTS** | `@@unique([tenantId, eventId, teamSeasonId])` on squad header; `@@unique([matchSquadId, personId])` on members; FK to `Event`, `TeamSeason`, `Person` with tenant checks |
| **AUDIT_FIELDS** | created/updated by user; use `logAction` on mutations |
| **MIGRATION_CREATED_IN_01** | **No** — this run stops at architecture |

---

## 14. Package breakdown (superseded by §21 R1 table)

See **§21 R1** for the current 01A–01F split.

**Consolidation:** 01E may merge with COLLAB if “squad published” uses existing prepare/publish; 01F depends on domain attention patterns (`lib/domain-attention/`).

---

## 15. First vertical slice — 01A

| Field | Value |
|-------|-------|
| **USER_VALUE** | Trainer can build and save a **match-specific** player list from the season Kader. |
| **IN_SCOPE** | Resolve `teamSeasonId`; list ACTIVE roster; toggle selected; persist; reload; tenant + team auth |
| **OUT_OF_SCOPE** | Release, request, guardian, comm, reminders, mobile UI |
| **DEPENDENCIES** | Existing Event MATCH, PlayerSquadMember, teamSeason resolution |
| **SCHEMA_IMPACT** | `MatchSquad` + `MatchSquadMember` migration in 01A implementation run |
| **PERMISSION_IMPACT** | Server checks only; no new permission seed in 01A unless product insists |
| **COMM_IMPACT** | None |

---

## 16. Automated test plan (01A+)

### Squad candidate resolution

- ACTIVE included; INACTIVE excluded (once policy fixed)
- Wrong TeamSeason / team / tenant excluded
- PersonAssignment-only excluded
- Idempotent membership

### Squad persistence

- Add/remove/reload; concurrent update strategy (optimistic version or row lock)

### Authorization

- `sce-people-team-onboarding-01a-roster-service.test.ts` patterns for roster
- Team cockpit / API tenant isolation sentinels
- Unrelated trainer denied

### Regression sentinels (keep green)

- `lib/matchcenter/__tests__/*`
- `lib/collaboration/__tests__/sce-collab-01*.test.ts`
- `lib/participation/__tests__/participation-audience-resolution.test.ts`
- `lib/spielbetrieb/__tests__/sce-spielbetrieb-audience-01.test.ts`
- `lib/communication/__tests__/sce-comm-03-recipient-resolution.test.ts`
- `lib/weekplanner/__tests__/match-team-season-resolution.test.ts`
- `lib/teams/__tests__/sce-people-team-onboarding-01*.test.ts`
- Planner 08-08C conflict integrity tests

### Future availability (specify now, implement later)

- Not-selected ≠ released
- Request requires active release
- Multiple requests + single approval
- Time overlap detection

---

## 17. Product decisions resolved from code

| # | Question | Answer from repository |
|---|----------|------------------------|
| 1 | Match linked to one canonical TeamSeason? | **One own-team** `teamSeasonId` resolved per club side; not both teams in one squad row. |
| 2 | Squad persistence exists? | **No** — only season roster + RSVP. |
| 3 | Authorized trainer? | Active `TrainerTeamMember` on current season for comm; cockpit uses `teams.manage` broadly — **01A should align with trainer allocation + teamSeason ownership**. |
| 4 | Multiple trainers same squad? | No locking today — 01A should allow concurrent editors with clear conflict policy. |
| 5 | Publication state? | **Not implemented** — recommend DRAFT vs PUBLISHED on `MatchSquad` (01A can start with DRAFT-only). |
| 6 | SFV reschedule same identity? | **Same Event.id** on reschedule. |
| 7 | Tournaments same aggregate? | **Possible** — same pattern keyed by TOURNAMENT `Event` + `teamSeasonId` (01A scope: MATCH only). |
| 8 | Multiple match requests same player? | **Design yes** at REQUESTED; single winner at approval — **product confirm**. |
| 9 | Block other requests when? | Recommend at **APPROVED**, not REQUESTED. |
| 10 | Guardian confirmation mandatory? | **Configurable later** — participation already supports guardian response paths. |
| 11 | No digital recipient? | Comm fail-closed patterns exist; domain proceeds with manual flag. |
| 12 | Availability window default? | **Needs PO** — recommend match operational interval as default. |
| 13 | Conflict engine? | **Facility planner only** today; person overlap **new query layer** for 01C+. |
| 14 | Permission for squad? | **`teams.manage` + trainer-on-team** unless new key added. |
| 15 | Best UI location? | **Matchcenter match detail** — extend existing participants section. |

### Blocking product decisions for 01A

1. **Roster status filter:** ACTIVE only vs ACTIVE+INJURED+ABSENT for selectable pool.
2. **Draft-only vs publish flag in 01A** (recommend draft-only MVP).

---

## 18. Human UAT plan (01A+)

1. Pick STAGE team with ACTIVE `PlayerSquadMember` rows (supported UI onboarding — no SQL).
2. Open match for that team in Matchcenter.
3. Select subset of Kader; save; reload; verify persistence.
4. Verify unrelated team trainer cannot mutate (if test accounts available).
5. Verify SFV match: squad saves without modifying provider fields.

---

## 19. Roadmap / terminology updates

- Canonical key: **`MATCH_SQUAD_PLAYER_AVAILABILITY`**
- **`TRAINER-SPIELERBOERSE-01`** → treat as legacy label; same capability under new name.
- Only historical reference to “weekend exchange” found: `docs/people/SCE-PEOPLE-TEAM-ONBOARDING-01.md` — updated to match-centric wording in this PR.

---

## 20. Next implementation prompt (01A — do not start in -01 run)

Implement **`MATCH_SQUAD_PLAYER_AVAILABILITY-01A`** on branch from STAGE:

1. Prisma migration: `MatchSquad`, `MatchSquadMember` with constraints above.
2. `lib/match-squad/` — resolve candidates (ACTIVE policy), get/upsert squad, authorize via tenant + teamSeason + trainer/manage rules.
3. API routes under matchcenter or teams scoped by `matchId` + `teamSeasonId`.
4. Minimal UI on match detail: selected vs available roster toggles.
5. Tests per §16; no COMM/SFV/release scope.

**Merge:** not until Human UAT on STAGE after review of this document.

---

## 21. R1 — Availability × Trainer Selection (foundation correction)

**Status:** `IMPLEMENTED` / `HUMAN_UAT_PENDING` (trainer combined view; availability creation UI unchanged)  
**Branch / PR:** `cursor/match-squad-player-availability-01a-match-squad-foundation-b3de` / #819

### Canonical formula (locked)

```text
ROSTER ELIGIBILITY × MATCH AVAILABILITY × TRAINER SELECTION = OPERATIONAL MATCH-SQUAD STATE
```

| Signal | Canonical persistence | Owner |
|--------|----------------------|--------|
| Roster eligibility | `PlayerSquadMember` on resolved `TeamSeason` (`ACTIVE` \| `INJURED` \| `ABSENT` = current Kader) | Season roster |
| Match availability | `ParticipationResponse` per `(personId, eventId)` for `eventKind = MATCH` | Player / guardian (`PLAYER` / `PARENT`); trainer offline via existing team API (`TRAINER` + `teams.manage`) |
| Trainer selection | `MatchSquadMember` on `MatchSquad` | Authorized trainer / team management |

**No cross-signal mutation:** availability writes never create/delete squad members; squad mutations never fabricate participation responses.

**Derived states (not persisted):** e.g. `UNKNOWN + selected`, `UNAVAILABLE + selected` → `availabilityConflict`; `AVAILABLE + selected` → operational ready candidate. `NOT_SELECTED + AVAILABLE` ≠ cross-team release (01C).

### ParticipationResponse diagnosis (R1)

| Question | Answer |
|----------|--------|
| Event + person scoped? | **Yes** — `@@unique([personId, eventId])` for MATCH/TOURNAMENT/CLUB_EVENT |
| One canonical response per player/event? | **Yes** |
| Guardian on behalf of junior? | **Yes** — `assertActorCanRespondForPerson` + `responseSource: PARENT` |
| Audit / provenance? | **Yes** — `respondedByUserId`, `responseSource`, `respondedAt`, `note` |
| Match-specific? | **Yes** — same model for TRAINING / MATCH / TOURNAMENT / CLUB_EVENT via `eventKind` |
| Safe as match availability? | **Yes (Option C)** — persistence unchanged; `lib/match-squad/availability-adapter.ts` maps `OPEN`/`MAYBE` → `UNKNOWN`, `YES` → `AVAILABLE`, `NO` → `UNAVAILABLE` |

### Availability architecture decision

- **Selected:** **Option C** — reuse `ParticipationResponse` persistence + match-squad domain adapter/read model.
- **No** `MatchSquadMember.available` / duplicated availability column.

### PlayerSquadMember status semantics (R1)

| Status | Structurally in Kader? | Team comm / participation audience? | Match squad candidate? | Default availability implication |
|--------|------------------------|-------------------------------------|------------------------|----------------------------------|
| ACTIVE | Yes | Yes | Yes | None (use participation) |
| INJURED | Yes | Yes | Yes | None — injury may end before match |
| ABSENT | Yes | Yes | Yes | None — operational absence ≠ match RSVP |
| INACTIVE | No | No | No | N/A |
| ARCHIVED | No | No | No | N/A |

**COMM-03 / participation audience (R1):** refined from pre-01A “all statuses” and incorrect 01A “ACTIVE-only” to **`ACTIVE` + `INJURED` + `ABSENT`** via `currentSeasonRosterPlayerSquadMemberWhere` — aligns with `team-communication-authorization-scope` without excluding injured/absent Kader members.

### Package breakdown (01A–01F)

| Slice | Scope |
|-------|--------|
| **01A** | Match squad + availability-aware foundation (adapter, combined trainer workspace, counts, conflict flags; no release) |
| **01B** | Availability collection & player/guardian UX (requests, deadlines, notes) |
| **01C** | Explicit cross-team release |
| **01D** | Cross-team discovery / request / approval |
| **01E** | Assignment + communication |
| **01F** | Operational intelligence + club-scale UAT |

### Tests added (R1)

- `lib/match-squad/__tests__/availability-adapter.test.ts`
- `lib/match-squad/__tests__/match-squad-combined-states.test.ts` — six combinations + cross-signal invariants

---

## 22. Implementation — MATCH_SQUAD_PLAYER_AVAILABILITY-01A

**Status:** `IMPLEMENTED` / `HUMAN_UAT_PENDING`  
**Parent:** `MATCH_SQUAD_PLAYER_AVAILABILITY` → `IN_PROGRESS`

### Identity decision

| Field | Value |
|-------|-------|
| `CAN_ONE_EVENT_HAVE_MULTIPLE_OWN_TEAMSEASONS` | **No** — one club-owned side / one resolved `TeamSeason` per MATCH Event in product scope. |
| `BUSINESS_IDENTITY` | `(tenantId, eventId)` — one `MatchSquad` per tenant + match. |
| `TEAMSEASON_ROLE` | Validated roster context column (`MatchSquad.teamSeasonId` must equal resolved match TeamSeason). |
| `UNIQUE_CONSTRAINT` | `@@unique([tenantId, eventId])` |

### Schema (01A)

- `MatchSquad`: `id`, `tenantId`, `eventId`, `teamSeasonId`, `createdAt`, `updatedAt` (optimistic concurrency via `updatedAt`).
- `MatchSquadMember`: `id`, `matchSquadId`, `personId`, `createdAt`.
- Uniqueness: one person at most once per squad (`@@unique([matchSquadId, personId])`).
- No publication / availability / release columns (DRAFT-only; no status field).

### Candidate invariant

- Source: current season Kader — `PlayerSquadMember.status ∈ { ACTIVE, INJURED, ABSENT }` on resolved `TeamSeason`.
- `PersonAssignment` excluded; INACTIVE/ARCHIVED / wrong tenant / wrong TeamSeason rejected at mutation.

### Authorization

- Read: `events.view` or squad edit paths.
- Write: `events.manage`, `teams.manage`, club admin, platform superadmin, or **ACTIVE** `TrainerTeamMember` on the resolved `TeamSeason`.
- No new permission seed.

### Concurrency

- Client sends `expectedVersion` (ISO `MatchSquad.updatedAt`).
- Stale write → HTTP 409 with canonical latest squad payload.

### Cancelled match

- Squad rows retained; UI/API read-only while event status is `CANCELLED` / `CANCELED`.
- Reactivated sporting status → editable again under normal auth.

### Stale roster member

- Selected person no longer ACTIVE in `PlayerSquadMember`: shown as **«Nicht mehr im aktiven Kader»**, cannot be newly selected; trainer may remove; rows not silently deleted.

### API

- `GET /api/matchcenter/[matchId]/match-squad` — context, candidates, selected/remaining, version, editability.
- `PUT` — `{ selectedPersonIds, expectedVersion? }`; server validates roster + tenant.

### UX

- Entry: `/dashboard/matchcenter/[matchId]` → section **Aufgebot**.
- Desktop + responsive card rows; **Aufbieten** / **Entfernen**; no cross-team availability controls.

### Participation roster filter (R1)

- Shared `lib/teams/player-squad-structural-filter.ts` — `currentSeasonRosterPlayerSquadMemberWhere` for participation audience + squad candidates.
- Regression: `lib/participation/__tests__/participation-roster-active-filter.test.ts`.

### Availability overlay (R1)

- Read model enriches each candidate with `availability`, `selected`, `availabilityConflict`, `canSelect`, `canRemove`, derived `counts`.
- UX: Matchcenter **Aufgebot** section shows availability labels; **Aufbieten** disabled for `UNAVAILABLE` (no trainer override in 01A).

### Tests (01A)

- `lib/match-squad/__tests__/match-squad-service.test.ts`
- `lib/match-squad/__tests__/match-squad-auth.test.ts`
- Invariant: `remainingRosterIsNotCrossTeamAvailability()` assertion in service tests.

### Human UAT

Pending on STAGE preview — see §18 / product UAT plan (01A scope only).
