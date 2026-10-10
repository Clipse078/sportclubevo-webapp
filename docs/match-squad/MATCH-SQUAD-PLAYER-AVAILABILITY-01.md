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

Match-centric workflow for club trainers (canonical slice order **01A → 01F** — detail in **§28**):

```text
Saison-Kader + availability + trainer Match selection → Match Aufgebot (01A)
  → availability collection UX (01B)
  → proactive trainer Player Release & Development Assignment (01C)
  → target-match discovery / request / approval (01D)
  → assignment + communication (01E)
  → operational intelligence + club UAT (01F)
```

Release is **never** derived from Match Squad non-selection. Availability alone never creates release.

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
- **CROSS_TEAM:** Deny by default until **01C** (release) and **01D** (target-team use); no trainer may release or assign another team’s players without explicit domain records.
- **ADMIN:** Club admin / `teams.manage` may override per product — document in 01A tests.

**NEW_PERMISSION_REQUIRED:** **Not for 01A** if squad edit is gated by existing `teams.manage` + server-side teamSeason ownership checks + optional trainer allocation (mirror `team-document-auth` / comm scope). Revisit **`match.squad.manage`** only if product requires delegating squad edit without `teams.manage`.

---

## 7. Conflict diagnosis

| Engine | Scope | Reusable for player double-booking? |
|--------|-------|-------------------------------------|
| **Weekplanner / facility** | `lib/weekplanner/conflict-detection.ts`, `lib/planning-hub/conflict-attention.ts` | **Partial** — resource occupancy (pitch/dressing), not person calendar |
| **Personal programme** | `lib/personal-agenda/` | Loads activities for a user; **no** person-person overlap engine found |
| **Participation/attendance** | Per-event records | Can **detect** same person on two events only if queried — no central service |

**Recommendation:** For **01D / 01F**, introduce **person-time overlap queries** (matches + tournaments + training sessions + accepted borrow assignments) reusing **time window** helpers from publishing/planner (`getEffectiveEndAt`, operational intervals). Classify HARD vs WARNING; training overlap should not hard-block release without product rule. **01C** defines release conditions; overlap evaluation consumes release + schedule context (§28).

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

**Superseded for product architecture by §28 (2026-10-10).** The early sketch below mixed release with source-match windows and assigned the wrong slices; keep only as historical diagnosis context.

<details>
<summary>Historical sketch (pre-01C architecture lock — do not implement verbatim)</summary>

- Early text placed **release** in 01B and tied windows to **source match** operational intervals.
- Early text implied release candidates from **remaining** (not-selected) roster rows.
- **01B** is **availability collection only** (`ParticipationResponse` UX — §28).
- **01C** is **Player Release & Development Assignment** (proactive, target-specific rules — §28).
- **01D** owns cross-team **request / approval** aggregates (names TBD in 01D diagnosis).

</details>

**Current direction:** five independent sporting signals (§28); **no boolean** `released = true`; **multiple target-specific rules** per player; **`maxMinutes` first-class** when implemented.

---

## 10. Guardian & confirmation

| Scenario | Foundation today |
|----------|------------------|
| Adult with User | Personal participation actions; COMM-03 self-delivery |
| Junior with User | Same + safeguarding policies |
| Junior with guardian User(s) | `GuardianRelationship` + guardian expansion |
| No digital recipient | Domain state still valid; UI shows **manual follow-up** (pattern from Probetraining / comm fail-closed) |

**01B** extends player/guardian availability UX; **01A** must not block squad editing when `Person.userId` is null. (Slice **01D** is cross-team request/approval — not guardian RSVP — per §28.)

---

## 11. UX architecture (target)

| Area | Recommendation |
|------|----------------|
| **PRIMARY_ENTRY** | **Match-first:** `/dashboard/matchcenter/[matchId]` (Spiele) → section **Matchkader / Aufgebot**; secondary: Team cockpit → Spiele → deep link to match. |
| **MATCH_SQUAD_LAYOUT** | Reuse Activity Detail / planning editor visual language (dark SCE, compact cards) — align with `MatchcenterDetail` + planning sections already on match page. |
| **OWN_ROSTER** | Selected vs remaining from **same** ACTIVE roster list. |
| **RELEASE_ACTION** | **Superseded UX note:** release is **not** tied to “remaining / not selected” rows. Primary trainer action **01C:** **«Für andere Teams freigeben»** from player/squad context (proactive **Spielerfreigabe**). |
| **CROSS_TEAM_DISCOVERY** | Inside **target match** squad prep ( **01D** ): e.g. suitable **released** players — not a standalone marketplace home. **01B** must not expose cross-team discovery. |
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

## 14. Package breakdown (canonical — locked §28)

| Slice | Product | Status (STAGE) |
|-------|---------|----------------|
| **01A** | Match Squad Foundation — Saison-Kader + existing availability + trainer Match selection | **CLOSED** (§27) |
| **01B** | Availability Collection & Player/Guardian UX — “Can / will the player participate?” | **NOT STARTED** |
| **01C** | Player Release & Development Assignment — “Where, when, under which conditions outside Stammteam?” | **NOT STARTED** (architecture locked §28) |
| **01D** | Cross-Team Discovery, Request & Approval — “May target team use released player for this Match?” | **NOT STARTED** |
| **01E** | Assignment & Communication — operational assignment + inform audiences | **NOT STARTED** |
| **01F** | Operational Intelligence & Club UAT | **NOT STARTED** |

Then: **Sponsor Commercial Workflows** → **Mobile App** (club roadmap).

**Consolidation:** 01E should reuse SCE Collaboration **CHANGE → IMPACT → AUDIENCE → INFORM**; communication is never canonical assignment. 01F may use `lib/domain-attention/` patterns.

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

**Status:** `CLOSED` (01A foundation + R1 availability adapter)  
**Branch / PR:** merged via #819 → `STAGE`

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

**Derived states (not persisted):** e.g. `UNKNOWN + selected`, `UNAVAILABLE + selected` → `availabilityConflict`; `AVAILABLE + selected` → operational ready candidate. `NOT_SELECTED + AVAILABLE` ≠ cross-team release — explicit **01C** release required (§28).

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

**Superseded table — see §14 and §28 for canonical slice names and boundaries.**

| Slice | Scope |
|-------|--------|
| **01A** | Match squad + availability-aware foundation (adapter, combined trainer workspace, counts, conflict flags; no release) |
| **01B** | Availability collection & player/guardian UX (requests, deadlines, reminders, offline trainer capture) — **no release** |
| **01C** | Player Release & Development Assignment (**Spielerfreigabe**) — proactive, target-specific conditions |
| **01D** | Cross-team discovery, request & approval (match-contextual) |
| **01E** | Assignment & communication |
| **01F** | Operational intelligence + club-scale UAT |

### Tests added (R1)

- `lib/match-squad/__tests__/availability-adapter.test.ts`
- `lib/match-squad/__tests__/match-squad-combined-states.test.ts` — six combinations + cross-signal invariants

---

## 22. Implementation — MATCH_SQUAD_PLAYER_AVAILABILITY-01A

**Status:** `CLOSED`  
**Parent:** `MATCH_SQUAD_PLAYER_AVAILABILITY` → `IN_PROGRESS` (01A slice closed; module continues in 01B+)

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

**PASS** — see §23–§27 (R2 JSON fix through R5 integrated workspace).

---

## 23. 01A Human UAT R2 (MATCH_SQUAD_PLAYER_AVAILABILITY-01A-R2)

**Status:** `IN_PROGRESS` — blocker remediated on STAGE; full UAT matrix pending credentials-led browser pass.

### Original UAT blocker

- **Symptom:** Matchcenter **Aufgebot** showed raw `Unexpected end of JSON input` instead of squad workspace.
- **Client request:** `GET /api/matchcenter/[matchId]/match-squad` on PR #819 Vercel preview (shared STAGE DB).

### Proven root cause

| Item | Finding |
|------|---------|
| **Category** | STAGE schema lag — migration not applied before preview UAT |
| **Migration** | `20261010153000_match_squad_player_availability_01a` was **pending** on STAGE (`prisma migrate status`) |
| **Runtime failure** | Prisma `P2021` (table `MatchSquad` missing) during `buildMatchSquadViewModel` |
| **API behavior (before fix)** | Unhandled exception → empty/non-JSON 500 response |
| **Client behavior (before fix)** | Blind `response.json()` surfaced parser message to users |

### Remediation

1. **STAGE migration (canonical):**  
   `APP_ENV=stage NODE_ENV=production APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled`  
   → applied `20261010153000_match_squad_player_availability_01a` (no manual DDL).
2. **API hardening:** `mapError` always returns JSON; `P2021` → `503` + `SCHEMA_NOT_READY`; unexpected → `500` + `INTERNAL`.
3. **Client hardening:** safe body parse (`text` → JSON), German actionable errors, **Erneut versuchen** retry.
4. **Tests:** empty squad (no `MatchSquad` row), missing participation → `UNKNOWN`, route JSON contract tests.

### Match context (repro match — FC Allschwil STAGE)

| Field | Example value |
|-------|----------------|
| `eventId` | `cmrzhj0mx005q04kwtr9etuk6` |
| `event.type` | `MATCH` |
| `tenantId` | `cmomwboak0000tsf3zzivrs46` (`fc-allschwil`) |
| `teamId` | `cmrkh1mb1000i04jurtajh262` |
| `seasonId` | `cmso85qmu000004l5d3q0xbi4` |
| Resolved `teamSeasonId` | `cmsoczv2t000504juhvod5hi9` (ACTIVE) |
| `Event.teamSeasonId` | `null` (resolved via team+season) |
| Post-fix GET | Valid JSON; empty squad state when no roster rows on resolved TeamSeason |

Additional STAGE future match with roster for functional UAT: `cmrzhj5a5006m04kwbsu1l3fd` (Senioren 40+ Meister).

### TEST_DATA_LEDGER (R2)

| Created | None (migration-only remediation; no fictional players added in R2) |
| **PRE_EXISTING_DATA_DELETED** | No |
| **RETAINED_FOR_LATER_MODULE_UAT** | N/A |
| **FINAL_MODULE_CLEANUP_REQUIRED** | `TEST_DATA_REMAINING = 0` at module close (unchanged policy) |

### Regression / build (R2 gate)

Recorded in agent final report after test battery + `NODE_OPTIONS=--max-old-space-size=8192 npm run build`.

### 01A closure (superseded by §27)

R2 blocker remediated; final closure in §27.

---

## 24. 01A Human UAT R3 (MATCH_SQUAD_PLAYER_AVAILABILITY-01A-UAT-R3)

**Status:** `IN_PROGRESS` — R2 JSON blocker **PASS** (product owner); R3 empty-roster copy fixed; populated matrix exercised on STAGE data + SCE test roster.

### UAT R2 (recorded)

| Item | Result |
|------|--------|
| Original match `cmrzhj0mx005q04kwtr9etuk6` | Aufgebot loads; no JSON parse error |
| Empty squad counts | Kader 0 / Verfügbar 0 / … / Aufgeboten 0 |
| **UAT-R2 JSON BLOCKER** | **PASS** |

### UAT R3-01 — zero roster wording

| Before | After (rosterTotal = 0) |
|--------|-------------------------|
| «Alle aktiven Kaderspieler sind aufgeboten.» | «Für dieses Team sind aktuell keine Kaderspieler im Saison-Kader erfasst.» |

When `rosterTotal > 0` and `remaining.length === 0`: «Alle Kaderspieler sind aufgeboten.» (no «aktive» qualifier).

Regression: `lib/match-squad/__tests__/remaining-empty-copy.test.ts`.

### Populated UAT match (STAGE)

| Field | Value |
|-------|-------|
| `eventId` | `cmrzhj3je006a04kwhbepxvdz` |
| Team | FC Allschwil Junioren B1 |
| `teamSeasonId` | `cmsoczv2t000504juhvod5hi9` |
| Match start | 2026-10-17T13:00:00Z |
| Structural roster | 6 (5 ACTIVE, 1 INJURED, 1 ABSENT) — SCE Testspieler 01–06 |
| Pre-existing FCA roster elsewhere | Senioren 40+ only (1 ACTIVE); no natural ≥5 roster without test data |

**Test data:** fictional players authorized — see `docs/match-squad/MATCH-SQUAD-PLAYER-AVAILABILITY-TEST-DATA.md`; seeded via `scripts/match-squad-01a-uat-seed-test-data.ts` (`addPlayerToTeamSeason`, `respondToParticipation`).

### Availability distribution (initial seed)

| AVAILABLE | UNAVAILABLE | UNKNOWN | Total |
|-----------|-------------|---------|-------|
| 2 | 1 | 3 | 6 |

Reconciles with structural Kader count.

### Domain verification (STAGE, service layer)

- Roster filter: ACTIVE + INJURED + ABSENT; INACTIVE/ARCHIVED excluded (`currentSeasonRosterPlayerSquadMemberWhere`).
- UNAVAILABLE unselected: `canSelect === false` (Testspieler 03).
- Selected + response flipped to NO: `availabilityConflict === true`, selection retained (Testspieler 02 scenario).
- Remove selection: participation NO unchanged.
- No `PlayerRelease` model in schema (01A guard N/A at persistence).

### Human browser UAT (agent)

Vercel preview deployment protection blocked unattended browser pass; manual checklist artifacts under `/opt/cursor/artifacts/` (see agent UAT package). Product owner Human UAT R2 on preview remains authoritative for JSON fix.

### Conflict UX (R3)

Selected + unavailable: secondary line uses **«Nicht verfügbar – Aufgebot prüfen»** with warning emphasis (not grey-only technical text).

### 01A status (superseded by §27)

R3 findings remediated; final closure recorded in §27 after R5 PO pass.

---

## 25. 01A Human UAT R4 (MATCH_SQUAD_PLAYER_AVAILABILITY-01A-UAT-R4)

**Status:** `IN_PROGRESS` — unified Match availability presentation (terminology + semantic badges).

### UAT R4-01 — terminology fragmentation

| Context | Before (mixed) | After (Match-only) |
|---------|----------------|-------------------|
| Teilnehmer (MATCH) | Dabei / Abwesend / … | Verfügbar / Nicht verfügbar / Unsicher / Offen |
| Aufgebot | Rückmeldung offen / … | Same shared badges as Teilnehmer |
| Summary | Dense «Kader: 6 · Verfügbar: …» line | Wrapped semantic status chips |

### Canonical presentation mapping (persistence unchanged)

| `ParticipationResponse` | Match label | Tone |
|-------------------------|-------------|------|
| `YES` | Verfügbar | positive / success |
| `NO` | Nicht verfügbar | danger |
| `MAYBE` | Unsicher | warning |
| `OPEN` / missing row | Offen | muted / neutral |

**Shared helper:** `lib/match-squad/match-availability-presentation.ts`  
**UI badge:** `components/admin/matchcenter/MatchAvailabilityStatusBadge.tsx`

### Domain vs presentation

- **Persistence:** unchanged (`ParticipationResponse` only).
- **Selection semantics:** unchanged (`mapParticipationStatusToMatchAvailability` still maps `OPEN` + `MAYBE` → `UNKNOWN` for operability).
- **Presentation:** `MAYBE` and `OPEN` remain distinct in labels, tones, and summary counts (`maybe`, `open`).
- **Counts invariant:** `available + unavailable + maybe + open === rosterTotal` (per roster row; stale selected non-roster handled separately).

### Conflict UX (R4)

| State | Treatment |
|-------|-----------|
| `NO` + selected | Status badge «Nicht verfügbar» + strong «Aufgebot prüfen» chip |
| `MAYBE` + selected | «Unsicher» warning badge only — **not** a hard unavailable conflict |

### Duplication note (Teilnehmer vs Aufgebot) — superseded by R5

R4 left both sections visible; Human UAT R5 confirmed duplicate roster UX. **Product decision (R5):** for MATCH with integrated Match Squad workspace, **Aufgebot is the primary player-preparation surface**; the detailed Teilnehmer player roster is **not rendered** (Match-only; TRAINING / TOURNAMENT / CLUB_EVENT unchanged).

Gate: `lib/match-squad/integrated-workspace.ts` (`resolveIntegratedMatchSquadWorkspace` + `shouldRenderMatchTeilnehmerDetailedPlayerRoster`). Matchcenter detail page composes Aufgebot when the gate passes; otherwise legacy Teilnehmer list remains.

### UAT R5 loading (Teilnehmer vs Aufgebot)

Teilnehmer is server-rendered; Aufgebot loads via client `GET /api/matchcenter/[matchId]/match-squad`. A brief «Aufgebot wird geladen…» while Teilnehmer was already visible was **transient timing** in R4 screenshots, not a stuck state. Client provides **Erneut versuchen** on failure (R2).

### Tests

- `lib/match-squad/__tests__/match-availability-presentation.test.ts`
- `lib/match-squad/__tests__/match-squad-counts.test.ts`
- Extended `match-squad-service` / `match-squad-combined-states` for MAYBE presentation

---

## 26. 01A Human UAT R5 (MATCH_SQUAD_PLAYER_AVAILABILITY-01A-UAT-R5)

**Status:** `PASS` — Product Owner visual verification on STAGE preview (populated match).

| Item | Result |
|------|--------|
| R4 badge visual PASS | **PASS** — retained |
| Duplicate Teilnehmer + Aufgebot roster | **PASS** — Aufgebot primary; duplicate detailed Teilnehmer roster removed |
| Match-only consolidation | **PASS** — `shouldRenderMatchTeilnehmerDetailedPlayerRoster` |
| Summary chips | **PASS** — clear, compact |
| Aufgeboten / Weitere Kaderspieler split | **PASS** |
| Selection actions | **PASS** — Aufbieten / Entfernen; unavailable not misleading |
| Loading / retry | **PASS** — transient fetch; Erneut versuchen on error (R2) |

**UAT match:** `eventId` `cmrzhj3je006a04kwhbepxvdz` (FC Allschwil Junioren B1).

### Tests (R5)

- `lib/match-squad/__tests__/integrated-workspace.test.ts`
- Unchanged R4 match-squad presentation / combined-state tests

---

## 27. 01A closure (MATCH_SQUAD_PLAYER_AVAILABILITY-01A)

| Field | Value |
|-------|-------|
| **01A status** | **CLOSED** |
| **Architecture #818** | **CLOSED / MERGED** (`2026-10-10`) |
| **Implementation PR** | **#819** → merged to `STAGE` |
| **Human UAT R5** | **PASS** (Product Owner) |
| **Human UAT R2–R4** | **PASS** (recorded in §23–§25) |
| **Regression battery** | **PASS** (closure run — see agent report) |
| **Build** | **PASS** — `NODE_OPTIONS=--max-old-space-size=8192 npm run build` |
| **Test data** | Intentionally retained for 01B–01F — `01A_TEST_DATA_CLEANUP = DEFERRED_INTENTIONALLY` (ledger: `MATCH-SQUAD-PLAYER-AVAILABILITY-TEST-DATA.md`) |
| **01B** | **IN PROGRESS** (branch `cursor/match-squad-player-availability-01b-availability-collection`) |
| **01C implementation** | **NOT STARTED** (architecture locked §28) |

### Canonical 01A product model (locked)

```text
Saison-Kader (PlayerSquadMember)
  + existing player/guardian availability (ParticipationResponse)
  + trainer Match selection (MatchSquadMember)
  = operational Match Aufgebot (read model)
```

**Domain ownership:** no persistence conflation — availability writes do not mutate squad rows; squad writes do not fabricate participation responses.

### UX result (MATCH)

- **Aufgebot** is the single integrated detailed player-preparation workspace.
- No duplicate detailed Teilnehmer player roster when integrated squad workspace resolves.
- Non-MATCH participant behaviour unchanged.

### Roadmap handoff

**01C release architecture:** **LOCKED** in **§28** (2026-10-10) — documentation-only package on branch `cursor/match-squad-player-availability-01c-release-architecture`. **01B** may start only with §28 **01B boundary** guardrails respected.

### Deferred scope (later packages)

See **§14** / **§28** — **01B–01F**; no release implementation in 01A scope.

---

## 28. Player Release & Development Assignment — Architecture Decision

| Field | Value |
|-------|-------|
| **Date** | 2026-10-10 |
| **Status** | **LOCKED** (product architecture — no implementation in this package) |
| **Package** | `MATCH_SQUAD_PLAYER_AVAILABILITY-01C` (diagnosis/implementation **NOT STARTED**) |
| **Product name** | **Player Release & Development Assignment** |
| **Working German concept** | **Spielerfreigabe** |
| **Primary trainer action** | **Für andere Teams freigeben** |
| **Useful detail terms** | Freigabebedingungen, Max. Einsatzzeit, Gültigkeit, Grund |
| **Do not use as primary product concept** | Spielerbörse, Transfer, Leihe, Überschüssige Spieler |

### Decision

**Player release** is an **explicit, proactive sporting decision** by the **Stammtrainer** (or future authorized sporting role). It defines **where**, **when**, and **under which conditions** a player may participate **outside** their Stammteam.

Release is **not** derived from Match Squad omission.

| Invariant | Rule |
|-----------|------|
| `NOT_SELECTED` | **≠** `RELEASED` |
| `SELECTED` | **≠** `NOT_RELEASABLE` — selection and release may **coexist** |
| `AVAILABLE` (participation) | **≠** `RELEASED` |
| `RELEASED` | **≠** `ASSIGNED` to target Match Squad |
| `RELEASE` | **≠** sporting **eligibility** (association/age/registration) |
| Valid release | **≠** conflict-free or operationally feasible (evaluated later) |

### Five independent sporting signals

| Signal | Question | Canonical source (today / future) | Slice |
|--------|----------|-----------------------------------|-------|
| **A. Saison-Kader** | Who belongs structurally to this TeamSeason? | `PlayerSquadMember` | 01A |
| **B. Player/guardian availability** | Can/will this player participate in this concrete activity? | `ParticipationResponse` | **01B** |
| **C. Trainer Match selection** | Has the trainer selected this player for this Match? | `MatchSquad` / `MatchSquadMember` | **01A** (closed) |
| **D. Player release** | Where, when, under which conditions may they play outside Stammteam? | **New 01C domain** (TBD in 01C diagnosis) | **01C** |
| **E. Target-team request / assignment** | May the target team use the released player for this concrete Match? | **New 01D domain** (TBD) | **01D** |

No signal may silently create another. Release does **not** create `ParticipationResponse`, `MatchSquadMember`, or target assignment.

### Compact architecture model

```text
SAISON-KADER — "Who belongs to the team?"
        |
        +-------------------------+
        |                         |
        v                         v
PLAYER AVAILABILITY          TRAINER SELECTION
"Can I play?"                "Do I select you?"
01B                          01A
        |                         |
        +------------+------------+
                     |
                     v
             MATCH AUFGEBOT


Separately:

STAMMTRAINER RELEASE — "Where/how else may you play?"
01C
        |
        v
TARGET MATCH DISCOVERY / REQUEST — "Can I use you here?"
01D
        |
        v
ASSIGNMENT — 01E
        |
        v
COMMUNICATION (downstream; not source of truth)
```

### Reject boolean release models

Do **not** model future release as single flags such as `released = true`, `availableToOtherTeams = true`, or `borrowable = true`. A player may have **different conditions per target team** (e.g. F2 released max 45 min, E1 max 60 min, D9 not released). Final persistence shape is for **01C diagnosis** — not decided here.

### Maximum playing time (first-class)

**Max. Einsatzzeit** must eventually be **machine-readable** (e.g. `maxMinutes = 45`), not free-text only, to support future comparison of allowed vs planned vs actual minutes. **Actual minute tracking is not part of this package** and may not exist today; architecture must remain **compatible** without inventing that domain.

### Two equally legitimate purposes

1. **Squad support** — e.g. F2 short-handed; F1 player explicitly released for F2; target team may request (01D).
2. **Player development** — e.g. **Spielpraxis**, rhythm, goalkeeper practice, controlled return-to-play, permitted age-group experience. Release is **not** only an emergency shortage feature.

### FM-style inspiration (SCE translation only)

Concept: a first-team manager deliberately makes a player available to another squad for **controlled playing time** with **target-specific rules**. SCE applies this to amateur/youth clubs via **trainer-controlled, target-specific release conditions** — without copying third-party terminology, UI, or proprietary data models.

### Proactive release example

| Field | Example |
|-------|---------|
| Player | Alexander |
| Stammteam | F1 |
| Release | F2 · max 45 minutes · valid Saturday · reason: Spielpraxis |
| Simultaneous state | May be **selected for F1 Match** **and** **released for F2** — **not mutually exclusive** |
| Feasibility | Future SCE evaluates schedule overlap, travel, etc. — **not** a domain invariant that selection invalidates release |

### Intended 01C workflow (conceptual)

Stammtrainer opens player/squad context → **Für andere Teams freigeben** → define target(s) + **Freigabebedingungen** → release becomes explicit sporting state → may later be **consumed by 01D**. No automatic target assignment; no automatic `MatchSquadMember`; no automatic `ParticipationResponse`.

### Future release capabilities (01C diagnosis checklist)

Evaluate whether the domain can represent at least: player; source TeamSeason (Stammteam); target TeamSeason(s) or scope; valid-from / valid-until; **maximum playing minutes**; position/role condition; time-of-day or activity condition; match-specific vs period-based scope; trainer note; sporting reason; status; createdBy / updatedBy; audit provenance; revoke/expire semantics. Not every condition requires its own column — diagnosis decides shape.

### 01B architecture guard (implementation protection)

| 01B purpose | Availability collection & player/guardian UX — “Can / will the player participate?” |
| Persistence | Continue building on **`ParticipationResponse`** unless 01B diagnosis proves a concrete gap |
| In scope (examples) | Availability request, response, outstanding response, deadline, reminder/follow-up, player/guardian UX, authorized trainer recording offline response |
| **01B must NOT** | Create `PlayerRelease`; expose players to other teams because they are available; interpret non-selection as release; create cross-team discovery; create borrowing requests; equate `available + not selected` with release |

### 01D direction (refined)

**Cross-Team Discovery, Request & Approval** — primary UX **match-contextual** (not generic marketplace). Consumes Saison-Kader, availability, Match Squad state, **explicit releases**, target Match context. Example: F2 Match with 6 usable players → SCE may surface “2 suitable released players” with release + availability + eligibility + conflict hints → **[Anfragen]** — **no automatic assignment**. Approval policy (pre-approved release rules vs per-request approval) is an **01D diagnosis question**.

### 01E direction (refined)

**Assignment & Communication** — once assignment is canonical: reflect in target Match Squad; source/target trainer visibility; player/guardian communication via existing Collaboration foundation (**CHANGE → IMPACT → AUDIENCE → INFORM**). WhatsApp-like messages, notifications, or RSVP must **never** be the canonical assignment record.

### 01F direction (refined)

**Operational Intelligence & Club UAT** — shortage detection; missing availability responses; suitable released-player recommendations; release expiry; overlapping assignments; release-condition violations; max-minute awareness; pending requests; approved borrowed players; incomplete squads; reminders; club overview. Insights such as “already played 40 of 45 allowed minutes” require **future actual-minute data** — document as future-compatible only.

### Sporting eligibility

**RELEASE ≠ ELIGIBILITY.** Trainers cannot override association/competition/age/registration rules by releasing. **01D** must validate against whatever eligibility data SCE has — rules are **not** invented in this architecture package.

### Conflict detection

**RELEASE ≠ CONFLICT-FREE.** Person-level evaluation may need own-team Match, other squads, training, approved borrow assignment, time overlap, travel buffer. Facility planner conflict engine alone is insufficient. Requirement for **01D / 01F** — **not implemented** here.

### Youth / guardian safeguard

Trainer release is **sporting authorization**, not player consent, guardian consent, or availability. For youth: **release + ParticipationResponse availability** remain separate; **01C must not impersonate** a guardian response.

### Authority model (defer)

**01C implementation** must diagnose existing roles, permissions, TeamSeason trainer membership, delegation, tenant admin **before** adding permissions. Do **not** invent `players.release` (or similar) in this documentation package.

### Release lifecycle (01C diagnosis questions)

Potential states: **ACTIVE**, **REVOKED**, **EXPIRED**. Open questions: edit active release? effect on approved assignment? revocation vs existing assignment? expiry vs history? TeamSeason/season rollover? Prefer **historical auditability** over destructive mutation. **No answers locked here.**

### Canonical example A — development (multi-target)

| | |
|-|-|
| **Player** | SCE Example Player |
| **Stammteam** | F1 |
| **Availability** | Verfügbar |
| **Release rules** | F2 · max 45 min · valid Saturday · Spielpraxis; E1 · max 60 min · valid Saturday · Entwicklung; D9 · not released |
| **Result** | Not auto-assigned; 01D path required. If availability becomes **Nicht verfügbar**, rules may remain stored but are **not operationally usable** |

### Canonical example B — own Match selected + release

| | |
|-|-|
| **F1 Match** | Player **selected** in Match Squad |
| **F2 release** | Active · max 45 minutes |
| **Validity** | **Valid at domain level**; feasibility depends on kickoff/duration/travel (e.g. 09:00 F1 + 13:00 F2 vs overlapping 13:00–15:00 slots) |

### Canonical example C — availability block

| | |
|-|-|
| **Release** | F2 · max 45 min · **ACTIVE** |
| **Availability (target Match)** | **Nicht verfügbar** |
| **Operational result** | **NOT USABLE** — release **not** auto-deleted |

### Obsolete assumptions corrected (documentation)

| Obsolete assumption | Correction |
|--------------------|------------|
| Unselected player = release candidate | **Rejected** — release is proactive |
| Surplus / remaining roster = released | **Rejected** |
| Release only after Aufgebot / only non-selected | **Rejected** |
| Available player auto visible to other teams | **Rejected** — explicit 01C + 01D |
| Cross-team release as boolean | **Rejected** — target-specific rules |
| Weekend-only workflow | **Rejected** (historical “weekend exchange” label superseded) |
| Availability equivalent to release | **Rejected** |
| Selection and release mutually exclusive | **Rejected** |

Historical UAT records (01A R2–R5) that describe what was tested at the time remain **accurate history**; architecture text above is **current** for 01B+.

---

## 29. 01B — Availability Collection & Player/Guardian UX (diagnosis + slice)

| Field | Value |
|-------|-------|
| **Package** | `MATCH_SQUAD_PLAYER_AVAILABILITY-01B` |
| **Branch** | `cursor/match-squad-player-availability-01b-availability-collection` |
| **Base** | `STAGE` @ `5de6fe1adf61830add419f15838f32477dbee0d2` |

### Diagnosis decisions

| Question | Decision |
|----------|----------|
| `EXISTING_PARTICIPATION_RESPONSE_SUFFICIENT` | **YES** — canonical writes via `lib/participation/participation-service.ts` |
| `NEW_AVAILABILITY_TABLE_REQUIRED` | **NO** |
| `NEW_REQUEST_METADATA_REQUIRED` | **NO** — active request = `Event.participationResponseDueAt` (`isParticipationResponseRequested`) |
| `EXISTING_COMM_REMINDER_REUSABLE` | **YES** — SCE-SPIELBETRIEB-AUDIENCE-01 + `sendEventNoResponseSmartReminder` |
| `GUARDIAN_PROXY_REUSABLE` | **YES** — `assertActorCanRespondForPerson` + COMM-18 expansion |
| `TRAINER_OFFLINE_RESPONSE_REUSABLE` | **YES** — `responseSource = TRAINER` via matchcenter participation-response API |

### ParticipationResponse (confirmed)

| Topic | Finding |
|-------|---------|
| Statuses | `OPEN`, `YES`, `NO`, `MAYBE` |
| Unique keys | `(personId, eventId)` for MATCH; `(personId, trainingSessionId)` for TRAINING |
| Missing row vs OPEN | Both treated as outstanding (`NOT_RESPONDED` / `PENDING` = **OPEN only**; **MAYBE excluded**) |
| Provenance | `ParticipationResponseSource`: `PLAYER`, `PARENT`, `TRAINER`, `STAFF` |

### MAYBE reminder policy (01B)

Automatic/manual **NOT_RESPONDED** reminders target **OPEN / missing row only**. **MAYBE** is a response; trainers may follow up separately — not silently merged with Offen.

### Deadline model

Match-relative `participationResponseDueAt` on `Event` (timezone via tenant). No weekend assumptions. Expired deadline does **not** mutate player status.

### 01B implementation (vertical slice)

| Surface | Behaviour |
|---------|-----------|
| **Trainer / Aufgebot** | `MatchAvailabilityCollectionPanel` — Rückmeldung bis, Erinnerung (Offen only), provenance on rows, trainer «Rückmeldung eintragen / verwalten» proxy menu, Offen filter chip |
| **Player / guardian** | Match wording on activity detail + Meine Aufgaben inline (`Verfügbar` / `Nicht verfügbar` / `Unsicher`) when request active |
| **APIs** | Reuse `PATCH …/participation-request`; new `POST …/participation-response`, `POST …/participation-reminder`; squad GET includes `availabilityCollection` meta |

### 01C guardrail (01B)

No `PlayerRelease`, no cross-team visibility, no selection mutation from availability writes.

### Reschedule policy

Responses retained on stable `eventId` — **no silent reset** in 01B. Reconfirmation after material reschedule = future product policy.

### 01B Human UAT R1 — availability ownership & presentation (2026-10-10)

| Topic | Decision |
|-------|----------|
| **Finding** | Trainer row action «Verfügbarkeit» implied the trainer *owns* availability; UAT rejected trainer-as-primary-respondent UX. |
| **Canonical owner** | **Player** or **parent/guardian** answer «Can / will this player participate?» via `ParticipationResponse`. |
| **Trainer role** | **Consume** responses for Aufgebot; **optionally record offline/proxy** responses with `responseSource = TRAINER` (never masquerade as PLAYER/PARENT). |
| **DISPLAY STATE ≠ ACTOR** | Status badge shows canonical YES/NO/MAYBE/OPEN; trainer uses «Rückmeldung eintragen / verwalten» and «Rückmeldung zurücksetzen» (not «Offen» as a fourth affirmative choice). |
| **Provenance** | Visible from `responseSource`: PLAYER → «Vom Spieler», PARENT → «Von Eltern bestätigt», TRAINER → «Vom Trainer eingetragen», STAFF → staff label; OPEN/missing → no invented provenance. |
| **Existing responses without active request** | Legitimate (historical/offline); **KEINE ANFRAGE** does not delete or invalidate stored `ParticipationResponse`. |
| **01C boundary** | Unchanged — no release, borrowing, or cross-team discovery in this remediation. |

### Match lifecycle

| State | Request / remind | Respond |
|-------|------------------|---------|
| Upcoming SCHEDULED/LIVE | Allowed when due set | Allowed |
| CANCELLED / past | Blocked with actionable DE message | Read-only / blocked |
| SFV sync | Provider match facts only — does not overwrite club `ParticipationResponse` or deadline fields in this slice |
