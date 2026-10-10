# SCE-PEOPLE-TEAM-ONBOARDING-01 — People & Team Operational Onboarding

## Status

| Field | Value |
|-------|-------|
| **Package** | SCE-PEOPLE-TEAM-ONBOARDING-01 |
| **Mode** | IN_PROGRESS (01B-R4 ready for Human UAT) |
| **Slice 01A** | IMPLEMENTED / AUTOMATED_VERIFIED |
| **Slice 01B** | IMPLEMENTED / AUTOMATED_VERIFIED / HUMAN_UAT_R1_PARTIAL_PASS / HUMAN_UAT_R2_SUPERSEDED_BY_R3 / HUMAN_UAT_R3_SUPERSEDED_BY_R4 / HUMAN_UAT_R4_PENDING |
| **Canonical STAGE baseline** | `e9a1e5fba2557b99dca1f1e360a68c83160737db` |
| **Feature branch** | `cursor/sce-people-team-onboarding-01` |
| **PR** | #814 (DRAFT) |
| **STAGE data mutated during discovery / 01A** | No |
| **Schema / migration / prod** | Untouched |

## Slice 01A — Canonical roster onboarding foundation (implemented)

### Canonical roster service

| Module | Role |
|--------|------|
| `lib/teams/roster-membership-service.ts` | Single mutation seam for `PlayerSquadMember` / `TrainerTeamMember` (add, reactivate, remove). Used by existing team roster APIs. |
| `lib/teams/resolve-current-team-season.ts` | Tenant-safe DB resolver for Team → canonical current `TeamSeason` (wraps `lib/teams/current-season.ts`). |
| `lib/people/trainer-roster-alignment-diagnostic.ts` | Read-only PersonAssignment vs `TrainerTeamMember` alignment (States A–D). |

### Membership lifecycle

- **Create:** Validates tenant, active `TeamSeason`, person capacity (`isPlayer` / `isTrainer`), jahrgang (players). Creates row when none exists.
- **Duplicate active row:** Service returns `ALREADY_ACTIVE` (no second row); API preserves public **409** semantics.
- **Reactivate:** Existing `INACTIVE` / `ARCHIVED` row is updated in place (no historical duplicate).
- **Remove:** Hard delete (unchanged product semantics); person and other seasons preserved.
- **Person without User:** Supported; roster APIs do not create `User`, `TenantMembership`, or `UserRole`.

### Current-season resolution

- Explicit season key wins; else `Season.isActive` via `pickCurrentTeamSeason`.
- No silent fallback to “latest” season.
- Actionable errors: missing current season, ambiguous multiple active global seasons, cross-tenant team masked as not found.

### Tenant isolation & authorization

- All service inputs scoped by `tenantId`; foreign person/team/membership IDs return non-enumerating not-found messages.
- Roster mutation authorization unchanged: **`teams.manage` only** at API layer. `TrainerTeamMember.roleLabel` is display metadata only (not authorization).

### PersonAssignment diagnostic (read-only)

| State | Meaning |
|-------|---------|
| **ALIGNED** | Active trainer-function assignment + active `TrainerTeamMember` for team |
| **ASSIGNMENT_ONLY** | Trainer assignment without current roster row (FCA F2 discovery state) |
| **ROSTER_ONLY** | Active roster without matching trainer assignment |
| **NEITHER** | No trainer evidence for team |

No automatic reconciliation in 01A; no STAGE data mutation.

### COMM-03 contract proof

- Automated contract tests in `lib/teams/__tests__/sce-people-team-onboarding-01a-comm03-contract.test.ts` assert structural `teamIds` audience uses active roster rows only (via existing `resolveTeamAudiencePersonIds`). **No COMM-03 production code changed.**

### Automated tests (01A)

- `lib/teams/__tests__/sce-people-team-onboarding-01a-roster-service.test.ts`
- `lib/teams/__tests__/sce-people-team-onboarding-01a-resolve-current-team-season.test.ts`
- `lib/people/__tests__/sce-people-team-onboarding-01a-trainer-alignment.test.ts`
- `lib/teams/__tests__/sce-people-team-onboarding-01a-comm03-contract.test.ts`
- Updated roster API security tests under `app/api/teams/__tests__/`

## Slice 01B — Team Cockpit onboarding UX (implemented)

### Entry points (Team Cockpit)

| Surface | Route / anchor | Component |
|---------|----------------|-----------|
| Spielerkader | `/dashboard/teams/[teamId]/kader` · `#spielerkader` | `TeamSquadManagementCard` via `TeamRosterOverviewCard` |
| Trainerteam | `/dashboard/teams/[teamId]/trainerteam` · `#trainerteam` | `TeamTrainerRosterSection` (assignment-only panel + `TeamTrainerManagementCard`) |

Current season is resolved once server-side (`currentTeamSeasonId` from `getTeamDetailData` / `pickCurrentTeamSeason`). Cards show **Kader · Saison YYYY/YYYY** / **Trainerteam · Saison YYYY/YYYY** without exposing `TeamSeason` ids in copy.

### Player flow

1. **Spieler hinzufügen** opens SCE `Sheet` (not inline persistence jargon).
2. `PeoplePicker` searches tenant People via `/api/people/search?mode=player&teamSeasonId=…` (roster context: non–player-capable persons remain visible; only **ACTIVE** squad rows excluded for reactivation).
3. On select, `/api/teams/.../roster-onboarding/person-context` loads membership hints, multi-team info, and capacity flags.
4. Confirm calls existing POST squad-members API (`teams.manage`). `router.refresh()` reconciles list/counts/empty state.
5. **Als Spieler aktivieren** (explicit) uses existing PUT `/api/people/[id]` when actor has `people.manage`; otherwise link to People & Access.
6. **Neue Person erfassen:** link to People & Access (no duplicate Person create form in Team Cockpit).

### Trainer flow

1. **Trainer hinzufügen** sheet + search (`mode=trainer` roster context).
2. Optional `roleLabel` retained (display only).
3. **Assignment-only (State B):** `listTrainerAssignmentOnlySuggestions` + `TeamTrainerAssignmentOnlyPanel` — copy *Als Trainer zugeordnet, aber noch nicht im Trainerteam dieser Saison* with **Zum Trainerteam hinzufügen** opening the add sheet (explicit confirm; no hidden PersonAssignment backfill).
4. **ROSTER_ONLY:** no warning (sporting roster remains canonical).

### Permissions & separation

| Action | Permission |
|--------|------------|
| View roster / person context | `teams.view` |
| Add/remove squad/trainer members | `teams.manage` |
| Enable `isPlayer` / `isTrainer` on Person | `people.manage` |

Roster membership does **not** create User, invitation, tenant access, guardian, or PersonAssignment.

### Error UX

Domain failures surface German actionable copy via `lib/teams/roster-onboarding-messages.ts` (duplicate active member, capacity, jahrgang, inactive TeamSeason, unauthorized). Foreign person/team ids remain non-enumerating 404.

### Automated tests (01B)

- `components/admin/teams/__tests__/sce-people-team-onboarding-01b-roster-ux.test.tsx`
- `lib/teams/__tests__/sce-people-team-onboarding-01b-roster-onboarding-messages.test.ts`
- `app/api/people/search/__tests__/sce-people-team-onboarding-01b-search.test.ts`
- `app/api/teams/__tests__/sce-people-team-onboarding-01b-person-context.test.ts`
- 01A regression suites unchanged green

### Slice 01B-R1 — Human UAT remediation (2026-03-28)

Human UAT on PR #814 preview identified UX gaps (functionality largely present):

| Finding | Remediation |
|---------|-------------|
| Team Cockpit visual inconsistency (light diagnostic panels, oversized empty areas) | Dark/translucent SCE contextual notices; compact empty states on Kader/Trainerteam/Spiele/Resultate/Rangliste |
| Duplicate **Spieler hinzufügen** / **Trainer hinzufügen** on empty rosters | One primary CTA: empty-state button when roster count is 0; header action when roster has members |
| Checkbox boolean controls in onboarding sheets | Canonical `SwitchToggle` (Captain, Vize-Captain, Auf Website anzeigen) — payload unchanged |
| Person Übersicht: F2 trainer shown under **Trainer & Staff** and again under **Weitere Funktionen** | `lib/people/person-overview-assignment-projection.ts` suppresses redundant sporting `PersonAssignment` rows when `TrainerTeamMember` / `PlayerSquadMember` already represents the same team context (distinct org roles such as Teammanager retained) |

Tests: `lib/people/__tests__/sce-people-team-onboarding-01b-r1-person-overview-projection.test.ts` + extended `sce-people-team-onboarding-01b-roster-ux.test.tsx`.

**Human UAT R1 (partial pass):** Kader action dedupe PASS · player toggles PASS · Trainerteam canonical membership PASS · duplicate F2 Person relationship PASS · Team cockpit dark surface direction PASS. Person Overview visual polish flagged for R2 (empty/unreadable orange pills).

### Slice 01B-R2 — Person Overview presentation (2026-10-10)

| Finding | Remediation |
|---------|-------------|
| Orange pills beside header, teams, and function cards with no readable text | Root cause: `bg-[var(--sce-accent)]` + `text-[var(--sce-primary)]` both resolve to the same orange token — text invisible but pill visible |
| Redundant status/capacity clutter in Person header | Single **Aktiv** badge on title row; summary shows contact + meaningful capacity pills only |
| Redundant **Spieler/in** badge on cards already under Spieler/in | Role pill omitted when section context is sufficient; optional trainer `roleLabel` only when non-empty |
| Light incomplete-assignment warning chip | Warning pill uses SCE `--sce-warning-*` tokens on dark surfaces |

Shared helpers: `lib/people/person-presentation-label.ts`, `components/admin/persons/PersonPresentationPill.tsx`.

Tests: `lib/people/__tests__/sce-people-team-onboarding-01b-r2-person-presentation.test.tsx` + R1 projection suite unchanged.

**Status:** IMPLEMENTED / AUTOMATED_VERIFIED / HUMAN_UAT_R2_SUPERSEDED_BY_R3

### Slice 01B-R3 — Team Directory UX + Senioren 40+ roster integrity (2026-10-10)

Human UAT R2 findings:

| Area | Finding | Remediation |
|------|---------|-------------|
| Team Directory (`/dashboard/teams`) | Light Manuell / Web / Board pills; weak hierarchy; sparse admin list feel | Dark integrated rows (`TeamsOverviewGrid`): identity → context → competition → compact status + grouped publication/sync meta; bounded `max-w-6xl`; category headers tightened |
| Team Directory | Heavy season header | `SeasonContextSelector` `variant="compact"` on Teams list; removed redundant header “Saison wechseln” |
| Senioren 40+ (Michael Duijster) | Person shows incomplete Kaderzuordnung; team Kader shows 0 | **Read-only STAGE diagnosis:** STATE_A_INCOMPLETE_ONBOARDING — active `PersonAssignment` (`SPIELER`, Season 2026/2027) with **no** `PlayerSquadMember` rows for person or team season `cmsod03tv000h04juo7wyen7w`. Kader count is correct; not a read-model defect |
| Onboarding CTA | “Jetzt Kaderzuordnung ergänzen” linked to overview `#spielerkader` (anchor removed in cockpit split) | `lib/teams/team-roster-navigation.ts` → `/dashboard/teams/:id/kader#spielerkader` and `/trainerteam#trainerteam` |
| Team overview count | Potential mismatch vs Kader ACTIVE filter | `buildTeamCockpitMetrics` counts **ACTIVE** squad/trainer rows only (aligned with Kader UI) |

**Canonical roster rule (unchanged):** PersonAssignment expresses relationship; seasonal Kader requires active `PlayerSquadMember` for the active `TeamSeason`. No fallback counting, no STAGE SQL patches.

**Tests (R3):**

- `components/admin/teams/__tests__/sce-people-team-onboarding-01b-r3-team-directory.test.tsx`
- `lib/teams/__tests__/sce-people-team-onboarding-01b-r3-roster-integrity.test.ts`
- `lib/teams/__tests__/team-roster-navigation.test.ts`
- Updated person CTA expectations + `team-cockpit-metrics` ACTIVE filter

**Status:** IMPLEMENTED / AUTOMATED_VERIFIED / HUMAN_UAT_R3_SUPERSEDED_BY_R4

### Slice 01B-R4 — Player eligibility / birth-date / year-group integrity (2026-10-10)

Human UAT R3 finding (Senioren 40+ / Michael Duijster):

| Symptom | Root cause |
|---------|------------|
| Kader add blocked with «Kein Geburtsdatum … Erlaubte Jahrgänge: .» | `Team.ageGroup` for Senioren teams (e.g. `40+`) is **not** a canonical junior category code (`F`, `E`, …). `getAllowedBirthYearsForSeason` returned `[]`, but roster service still treated missing DOB as a jahrgang failure and appended an empty «Erlaubte Jahrgänge» suffix. |

**Canonical eligibility sources (unchanged model, clarified semantics):**

| Input | Source |
|-------|--------|
| Person birth date | `Person.dateOfBirth` (editable via `/dashboard/persons/[id]/edit` — Stammdaten section, `people.manage`) |
| Junior birth-year bands | `Team.ageGroup` junior code + `Season.startDate` → `lib/teams/jahrgang-rules.ts` (`BASE_JAHRGANG_BY_CODE`, season shift) |
| Senioren / adult teams | No formal 40+ age rule in code today — `40+`, `30+`, `Aktive`, empty `ageGroup`, and other non-junior labels → **unrestricted** (no birth-year gate) |
| Malformed junior config | Non-canonical junior-looking labels (e.g. `F2` instead of `F`) → **CONFIG_INCOMPLETE** (actionable admin message, not a silent Person workaround) |

**Implementation:**

- `lib/teams/player-birth-year-eligibility.ts` — `resolveTeamBirthYearEligibility` + `evaluatePlayerBirthYearEligibility`
- `lib/teams/roster-eligibility-presentation.ts` — semantic German copy (missing DOB, outside range, incomplete team config); never renders empty «Erlaubte Jahrgänge»
- `TeamSquadManagementCard` — proactive eligibility notice + optional CTA «Geburtsdatum in Stammdaten ergänzen» (`people.manage`) with safe `returnTo` back to Kader
- `PersonForm` + `lib/navigation/safe-internal-return-path.ts` — post-save return to originating dashboard route
- Roster service + people search roster context aligned with unrestricted vs junior modes

**Roster integrity (unchanged):** `PersonAssignment` ≠ Kader count; only ACTIVE `PlayerSquadMember` on the active `TeamSeason`. No COMM-03 fallback recipients. No STAGE DB patch.

**Tests:** `lib/teams/__tests__/sce-people-team-onboarding-01b-r4-player-eligibility.test.ts` + extended roster UX tests; 01A/01B regression suites.

**Status:** IMPLEMENTED / AUTOMATED_VERIFIED / **HUMAN_UAT_R4_PENDING**

### Human UAT (01B-R4 — pending)

See PR #814 R4 checklist: Senioren 40+ eligibility message, optional DOB remediation via Person edit + return to Kader, canonical `PlayerSquadMember` creation when eligible, F2 / Trainerteam / Person Overview / Team Directory regression.

### Human UAT (01B-R3 — superseded by R4)

See PR #814 R3 checklist: Team Directory dark UX, F2 cockpit regression, Person overview, Senioren 40+ completion via product UI (no manual DB edits).

### Human UAT (01B-R2 — superseded by R3)

Preferred team: **Junioren F2** (known ASSIGNMENT_ONLY trainer). Do **not** mutate FCA STAGE data during implementation.

| Step | Check |
|------|-------|
| A | Open F2 Team Cockpit — current season visible; rosters empty/partial |
| B | Spieler hinzufügen — search/select eligible Person **or** verify capacity/jahrgang guidance if none |
| C | Assignment-only trainer surfaced; explicit add to Trainerteam if approved |
| D | Roster updates without hard reload |
| E | Person/User/access unchanged |

If no safe player Person exists on STAGE (FCA ~4 persons), classify player portion **BLOCKED_BY_DATA** — do not seed club data without approval.

### Known gaps (deferred)

| Gap | Target slice |
|-----|----------------|
| Invitations / User linking from roster | 01C |
| Guardian onboarding at scale | 01D |
| SFV / bulk import | 01E |
| Human UAT on FCA STAGE data | 01F (after 01B exposes workflows) |

### Human UAT recommendation (01A closure)

**01A can close on automated verification alone** (service/API foundation). Bounded Human UAT for roster population should run in **01B** when administrators use the guided Team Cockpit flows; **01F** remains the COMM-03 end-to-end club validation gate. Do not mark 01A CLOSED until product accepts that split or requests a minimal smoke UAT.

## Problem

Collaboration (SCE-COLLAB-01A–C) and COMM-03 recipient resolution are **architecturally correct** but FC Allschwil STAGE shows **Empfänger: 0** for structural team audiences (e.g. Seniorinnen, Junioren F2). Human UAT classified this as **EXPECTED_DATA_STATE**: teams and active `TeamSeason` records exist, but the **operational people → roster → user → tenant access** chain is not populated at club scale.

This package must make that chain **sustainably operable** for real club administration—not a one-off test-data patch.

## Required operational chain

```
TEAM (permanent)
  ↓
ACTIVE TeamSeason (season instance)
  ↓
PlayerSquadMember / TrainerTeamMember (ACTIVE)
  ↓
Person (tenant-scoped, isActive)
  ↓
User + TenantMembership (where login/delivery required)
  ↓
GuardianRelationship (youth safeguarding / guardian delivery)
  ↓
COMM-03 audience (structural teamIds) → candidate Person ids
  ↓
Safeguarding + channel eligibility → effective recipients
```

## Current architecture (repository truth)

### TEAM

| Attribute | Detail |
|-----------|--------|
| **Model** | `Team` |
| **Purpose** | Permanent tenant-owned team identity (name, slug, visibility fallbacks) |
| **Tenant scope** | `Team.tenantId` (required for new logic; nullable legacy) |
| **Primary id** | `Team.id` (cuid) |
| **Important fields** | `name`, `shortName`, `alternativeName`, `slug`, `isActive`, deprecated `category`, deprecated `orgUnitId` |
| **Relations** | `teamSeasons[]`, `personAssignments[]`, SFV `TeamExternalMapping[]` |
| **Active/inactive** | `Team.isActive` |
| **Season scope** | None directly—all seasonal ops on `TeamSeason` |
| **Deletion** | Archive/delete flows exist (admin-delete slices); cascades to `TeamSeason` |
| **Used by** | Team Center, SFV sync, audience selectors, attendance, communication |

### TEAMSEASON

| Attribute | Detail |
|-----------|--------|
| **Model** | `TeamSeason` |
| **Purpose** | Seasonal operational instance of a `Team` |
| **Tenant scope** | Via `Team.tenantId` |
| **Primary id** | `TeamSeason.id` |
| **Important fields** | `teamId`, `seasonId`, `displayName`, `status`, `participationType`, visibility flags |
| **Relations** | `playerSquadMembers[]`, `trainerTeamMembers[]`, `orgUnits[]` (`TeamSeasonOrgUnit`), competitions, training |
| **Active/inactive** | `TeamSeasonStatus`: `ACTIVE`, `INACTIVE`, `ARCHIVED` |
| **Season scope** | `@@unique([teamId, seasonId])` |
| **Deletion** | Cascade from `Team`; membership history tied to season row |
| **Used by** | Roster, COMM-03 team audience, training/spielbetrieb domain audiences, cockpit |

**Current season:** global `Season.isActive = true` (currently one row `2026/2027`). Resolved via `lib/teams/current-season.ts` (`currentTeamSeasonWhere` / `pickCurrentTeamSeason`). **Season is not tenant-scoped yet** (SEASON-01 deferred).

### PLAYER (membership, not subtype)

| Attribute | Detail |
|-----------|--------|
| **Model** | **No separate `Player` entity.** Sporting player = `Person` + `PlayerSquadMember` on a `TeamSeason`. |
| **Purpose** | Season roster slot linking `Person` ↔ `TeamSeason` |
| **Tenant scope** | Via `Person.tenantId` + team tenant |
| **Primary id** | `PlayerSquadMember.id` |
| **Important fields** | `status` (`ACTIVE`, `INJURED`, `ABSENT`, `INACTIVE`, `ARCHIVED`), `shirtNumber`, `positionLabel`, captain flags |
| **Relations** | `person`, `teamSeason` |
| **Unique** | `@@unique([teamSeasonId, personId])` |
| **Used by** | COMM-03 team audience, attendance, participation, public squad, domain audiences |

`Person.isPlayer` is a **capacity flag** (profile classification), not authorization. Squad APIs require `person.isPlayer === true` when adding to roster.

### TRAINER (membership, not subtype)

| Attribute | Detail |
|-----------|--------|
| **Model** | `TrainerTeamMember` on `TeamSeason` (no separate `Trainer` / `Coach` table) |
| **Purpose** | Season staff/trainer slot |
| **Fields** | `status` (`ACTIVE`, `INACTIVE`, `ARCHIVED`), optional `roleLabel` (display only—not permission) |
| **Used by** | COMM-03, team documents (trainer manage), cockpit |

`Person.isTrainer` is capacity only. **Multiple trainers per TeamSeason supported.**

### PERSON

| Attribute | Detail |
|-----------|--------|
| **Model** | `Person` |
| **Tenant scope** | **Required** `Person.tenantId` |
| **User link** | Optional `Person.userId` → `User` (1:1, canonical FK—not email inference) |
| **Important fields** | `email`, `phone`, `dateOfBirth`, `isActive`, capacity flags (`isPlayer`, `isTrainer`, …) |
| **Legacy guardian text** | `guardianFirstName` etc. on Person from registration—**not** canonical for COMM-03 |
| **Used by** | All people UI, COMM-03 subject resolution, guardians |

### USER / TENANT ACCESS

| Model | Purpose |
|-------|---------|
| `User` | Application account (`email` unique globally, `isActive`) |
| `TenantMembership` | Authoritative `(tenantId, userId)` membership, `isActive` |
| `UserRole` | Tenant or platform roles (separate from squad) |
| `PasswordResetToken` | Password reset + **invitations** (`isInvitation`, `invitationTenantId`) |

### GUARDIAN

| Attribute | Detail |
|-----------|--------|
| **Model** | `GuardianRelationship` (PERSON-UX-10) |
| **Shape** | `childPersonId` ↔ `guardianPersonId`, tenant-scoped, `relationshipType`, `isPrimary` |
| **Auth** | **Zero** authorization implications |
| **UI/API** | `PersonContactTab`, `/api/people/[id]/guardians` |
| **COMM-03** | Safeguarding loads guardian Person → User for delivery targets |

### MEMBERSHIP (related, distinct)

| Model | Role |
|-------|------|
| `PlayerSquadMember` / `TrainerTeamMember` | **Canonical sporting roster** (COMM-03, cockpit, attendance) |
| `PersonAssignment` | Organisational function label (trainer/player at team/org)—**does not** grant auth **nor** COMM-03 audience |
| `PersonMembership` | Club membership lifecycle (finance future)—independent |
| `OrgUnitMembership` | Governance / RPERM scope—not roster |

## TeamSeason lifecycle (answers)

1. **Team permanent across seasons?** Yes.
2. **TeamSeason = seasonal instance?** Yes, one row per `(teamId, seasonId)`.
3. **Current season?** `Season.isActive` (global); explicit season key overrides in UI.
4. **Multiple TeamSeasons per Team?** Yes (history + future seasons).
5. **Active TeamSeason?** `TeamSeason.status = ACTIVE`.
6. **Players attached?** `PlayerSquadMember.teamSeasonId`.
7. **Trainers attached?** `TrainerTeamMember.teamSeasonId`.
8. **Memberships season-specific?** Yes.
9. **Person multiple teams?** Yes (multiple squad/trainer rows across TeamSeasons).
10. **Different roles per team?** Yes (separate squad vs trainer rows).
11. **Temporary other-team appearance?** **Not in schema**—only permanent season membership today.
12. **Historical membership?** Yes—rows remain on past TeamSeasons; statuses include `ARCHIVED`/`INACTIVE`.
13. **Season rollover?** No single automated “copy roster” product slice documented as canonical; teams/seasons created via registration/SFV/admin flows.
14. **Inactive TeamSeason?** Membership rows remain; COMM-03 only queries `TeamSeason.status = ACTIVE`.

## People & Access (existing foundation)

| Concern | Implementation |
|---------|----------------|
| **Person creation** | People admin, registration “Create Person”, APIs under `/api/people` |
| **User link** | `Person.userId` FK; People & Access wizard (`/dashboard/admin/people-access`) |
| **Invitation** | `PasswordResetToken.isInvitation`; `/api/admin/users/[userId]/invite`; permission `users.invite` |
| **Tenant access** | `TenantMembership.isActive` required for role-based tenant users |
| **Roles** | `UserRole` + `RolePermission`; club admin template per tenant |
| **Impersonation** | Platform/admin flows (documented in FCA admin UX slices) |
| **Team roster admin** | Team page `#spielerkader` / `#trainerteam` — **not** inside People & Access |

**Person without User:** Normal (children, many players). **User without Person:** Possible legacy; COMM-03 maps roles via Person for tenant users.

## COMM-03 recipient chain (actual code)

### Stage A — structural team audience

`resolveTeamAudiencePersonIds` (`lib/requirements/requirement-audience-resolvers.ts`):

1. Validate all `teamIds` belong to `tenantId`.
2. Load all `TeamSeason` where `teamId IN (...)` AND `status = ACTIVE`.
3. Union active `PlayerSquadMember` (`status = ACTIVE`) and `TrainerTeamMember` (`status = ACTIVE`).
4. Keep `Person.isActive` and matching `tenantId`.
5. Deduplicate person ids.

**Does not use:** `PersonAssignment`, `OrgUnitMembership`, `Person.isPlayer`, registration guardian text fields.

### Stage B — effective recipients

`resolveCommunicationRecipients` (`lib/communication/platform/recipient-resolution/resolve-recipients.ts`):

1. Candidate person ids from audience (above).
2. Intersect with **sender communication scope**.
3. Per person: active profile; **safeguarding** (`evaluateCommunicationSafeguarding`) using DOB + `GuardianRelationship` → guardian User ids.
4. Channel eligibility (`IN_APP`/`EMAIL`/`PUSH`): needs `Person.userId` and/or `Person.email`; EMAIL also checks linked User email for delivery user.
5. User preferences and reachability.

### Decision tree (team structural audience)

```
teamIds[]
  → TeamSeason (status=ACTIVE) for each team
    → PlayerSquadMember (ACTIVE) ∪ TrainerTeamMember (ACTIVE)
      → Person (isActive, tenant match)     ← COMM-03 candidates
        → sender scope filter
          → safeguarding (minor → guardian Users required for delivery)
            → channel + preference + active User/TenantMembership
              → effectiveRecipientPersonIds
```

**Trainers and adult players** can be recipients when they have reachable channel (email or user). **Junior players** typically need guardian Users under safeguarding policy.

## FC Allschwil STAGE diagnosis (read-only, aggregate)

Executed against STAGE via `STAGE_DB_URL` (2026-10-09). Tenant key `fc-allschwil`.

| Metric | Count |
|--------|------:|
| Teams (active) | 28 / 28 |
| TeamSeasons (active) | 30 |
| TeamSeasons in current season `2026/2027` | 28 |
| People (active) | 4 |
| TenantMemberships (active) | 9 |
| PlayerSquadMember (active) | **0** |
| TrainerTeamMember (active) | **0** |
| GuardianRelationship | **0** |
| PersonAssignment (active) | 2 |
| Teams with ≥1 COMM-03 structural candidate | **0** |
| Teams with ≥1 rough email/user reachability | **0** |

### Representative chains

**Junioren F2** (`FC Allschwil Junioren F2`):

- Team: active
- TeamSeason: ACTIVE, season `2026/2027`
- Squad: 0, Trainers: 0
- Note: **PersonAssignment** exists (Michael Duijster, `TRAINER`, same teamId) but **no** `TrainerTeamMember` → COMM-03 correctly returns 0.

**Seniorinnen**:

- Team: active, TeamSeason ACTIVE for `2026/2027`
- Squad: 0, Trainers: 0 → **Empfänger: 0**

### Interpretation

Structural collaboration/audience UI is healthy. The break is **missing canonical roster rows** (and club-scale Person master data), not COMM-03 or audience defects.

## Gap classification

| Class | Items |
|-------|--------|
| **A. DATA_GAP** | FC Allschwil: ~0 squad/trainer memberships; only 4 Person records for 28 teams; no guardian graph |
| **A. DATA_GAP** | PersonAssignment records without matching `PlayerSquadMember`/`TrainerTeamMember` (incomplete operational chain) |
| **B. ADMIN_UX_GAP** | No guided “onboarding path” linking assignment/capacity → roster → invite; Person tabs show State B (assignment without squad) but club-scale workflow not exercised |
| **B. ADMIN_UX_GAP** | Roster mutations require club-wide `teams.manage`—trainers cannot manage own squad without broad permission (may be intentional; blocks delegated trainer onboarding) |
| **F. IMPORT_GAP** | SFV `GET /api/club/{clubId}/players` client tested (Slice 2); **no** import into `Person` + `PlayerSquadMember` |
| **G. NO_GAP** | Schema for Person, User, TenantMembership, GuardianRelationship, PlayerSquadMember, TrainerTeamMember |
| **G. NO_GAP** | Team roster API + Team Cockpit UI (`TeamRosterSeasonSection`, squad/trainer cards) |
| **G. NO_GAP** | People & Access invitation infrastructure |
| **G. NO_GAP** | COMM-03 team resolver (uses roster, not assignment) |
| **E. RECIPIENT_POLICY_GAP** | None identified—policy correctly excludes empty roster |
| **D. MODEL_GAP** | None for seasonal home-team roster |
| **D. MODEL_GAP (future)** | Temporary cross-team / weekend release assignment **not** modeled (see below) |

## Existing admin UX map

| Surface | Capability |
|---------|------------|
| **People & Access** | Person/user/role/invite; not roster |
| **Person detail** | Spieler/Trainer tabs, guardian on Contact tab, squad removal API |
| **Team detail** | Spielerkader / Trainerteam management (current season entry) |
| **Registration / waiting list** | Intake → Person creation; can scope `TEAM_SEASON` waiting list—not bulk roster fill |
| **Guardian admin** | Person Contact tab + guardians API |
| **Import** | No roster/member CSV; SFV players API read-only |

## Authorization & security

| Action | Permission / rule |
|--------|-------------------|
| View team cockpit | `teams.view` (layout) |
| Manage roster | `teams.manage` (all squad/trainer API routes) |
| Manage people | `people.manage` |
| Invite user | `users.invite` |
| Manage guardians | People API (people permissions) |
| Trainer team scope | **Domain:** `TrainerTeamMember`; **Auth:** not auto-granted from membership |
| Tenant isolation | Roster APIs scope `team.tenantId`; guardian service rejects cross-tenant |

**Domain vs auth:** Documented in schema comments and `PersonAssignment` / `GuardianRelationship` invariants. Team membership must not imply club admin rights.

## Weekend Squad & Player Exchange — compatibility

| Question | Answer |
|----------|--------|
| **HOME_TEAM independent of temporary assignment?** | Today only `PlayerSquadMember` on one `TeamSeason`—suitable as **home** roster. |
| **Temporary assignment model?** | **Missing**—need future entity (e.g. activity-scoped release/borrow) for weekend exchange. |
| **Release conditions / notes?** | Not in schema. |
| **Parent communication** | Guardian + COMM-03 safeguarding already support minor delivery when guardians have Users. |
| **Recommendation** | Onboarding must populate **canonical** `PlayerSquadMember`; do not “borrow” by dual permanent squad rows. Record **FUTURE_GAP** for temporary assignment package. |

## Implementation options

### Option 1 — Activate existing roster + people workflows (recommended)

| | |
|--|--|
| **Approach** | Club admin/trainer workflows on **Team Cockpit** + **People** to create/link Person, set capacity flags, add `PlayerSquadMember`/`TrainerTeamMember`, invite Users, link guardians |
| **Reused** | All canonical models and APIs |
| **New** | Onboarding UX orchestration, empty-state guidance, optional assignment→roster “complete setup” actions, metrics/diagnostics |
| **Schema** | None |
| **Migration** | None |
| **Import** | Phase 2: SFV player import job (Person match + squad attach) |
| **Guardian** | Use existing Contact tab; bulk guardian import deferred |
| **COMM-03** | No change |
| **Pros** | Smallest risk, aligns with architecture |
| **Cons** | Manual scale without import slice |
| **Risk** | Low |

### Option 2 — Option 1 + SFV bulk onboarding slice early

Same as Option 1 but prioritizes **IMPORT_GAP** closure: preview/validate/idempotent Person + TeamSeason squad attach from SFV club players API.

**Pros:** Real club scale. **Cons:** SFV lacks guardians, emails may be sensitive; matching/duplicate logic required. **Risk:** Medium (PII + matching).

### Option 3 — Extend COMM-03 to include PersonAssignment

**Rejected.** Would conflate organisational assignment with sporting roster; breaks TEAM-COCKPIT, attendance, and domain audience contracts.

## Recommended package slicing

| Slice | Scope |
|-------|--------|
| **01A — Roster operational foundation** | Document + enforce canonical path; UX to resolve State B (assignment without squad); diagnostics; optional backfill tool for FCA **with explicit human approval** |
| **01B — Team roster administration UX** | Streamlined add-player/add-trainer from team page (search/create Person, set `isPlayer`/`isTrainer`, jahrgang validation) |
| **01C — Invitation & tenant access convergence** | From roster/people: invite guardian/parent/adult player; link Person↔User |
| **01D — Guardian relationships at scale** | Youth onboarding: link child Person, guardian Person, guardian User |
| **01E — Bulk import (SFV / CSV)** | Preview, duplicate detection, idempotency |
| **01F — COMM-03 + Collaboration Human UAT** | Prove Empfänger > 0 via product workflows only |

Slices 01A–01B unblock COMM-03; 01C–01D unblock delivery; 01E scale; 01F validation.

**First implementation slice:** **01A + 01B** (same PR only if tightly coupled; prefer 01A metrics/contract then 01B UX).

| Expectation | |
|-------------|--|
| Schema change | None for 01A–01D |
| Migration | None for 01A–01D |
| Permission change | Only if deliberate trainer-scoped roster manage is product-approved (currently `teams.manage`) |
| COMM-03 change | **Not expected** |

## Test plan (pre-implementation)

### Automated

- TeamSeason active/inactive filtering in `resolveTeamAudiencePersonIds`
- Squad/trainer membership CRUD + duplicate `(teamSeasonId, personId)`
- Person create + `isPlayer` gate on squad POST
- User invite + TenantMembership activation
- Guardian CRUD + cross-tenant rejection
- COMM-03: team with squad → candidates; empty roster → 0; multi-team dedupe
- Safeguarding: minor without guardian User excluded; with guardian User included
- Registration → Person → squad path (integration)

### Security

- Cross-tenant team/person/guardian IDOR attempts on roster and guardian APIs
- Trainer with only squad membership cannot gain `people.manage` or club-wide send without roles

### COMM-03

- Trainer with email/user on roster → effective recipient
- Player adult self-delivery vs minor guardian delivery
- Inactive User / pending invite / blocked preference exclusions

### Import (when built)

- Preview, duplicate Person match, idempotent re-run, partial failure reporting

## Human UAT plan

1. Club Admin opens **Seniorinnen** (or F2) team → current season visible.
2. Create or link **Person** with player/trainer capacity as appropriate.
3. Add **PlayerSquadMember** or **TrainerTeamMember** on active TeamSeason.
4. For youth: create guardian **Person**, `GuardianRelationship`, invite guardian **User**.
5. Invite/link **User** + active **TenantMembership** where in-app/email delivery needed.
6. Open contextual communication (club event / training) → select **team audience**.
7. Confirm COMM-03 preview shows expected recipient count (> 0 for populated roster).
8. Send/prepare message; confirm unrelated teams receive nothing.

## COMM-03 dependency

Collaboration packages must **not** alter recipient resolution. Success = populated **`PlayerSquadMember` / `TrainerTeamMember`** on **ACTIVE** `TeamSeason` plus delivery prerequisites (User/email/guardian per policy).

## Related documentation

- `docs/architecture/team-data-model.md`
- `docs/collaboration/SCE-COLLAB-01-CONTEXTUAL-CLUB-COLLABORATION.md`
- `docs/integrations/sfv-slice-2-club-players.md`
- `lib/requirements/requirement-audience-resolvers.ts` (team audience)
- `lib/communication/platform/recipient-resolution/resolve-recipients.ts` (COMM-03)

## Read-only STAGE diagnostic

Repeatable aggregate script (discovery only):

`node --experimental-strip-types scripts/sce-people-team-onboarding-01-fca-readonly-diagnosis.ts`

Requires `STAGE_DB_URL`. Emits JSON counts only (no bulk PII export).
