# SCE-PEOPLE-TEAM-ONBOARDING-01 — People & Team Operational Onboarding

## Status

| Field | Value |
|-------|-------|
| **Package** | SCE-PEOPLE-TEAM-ONBOARDING-01 |
| **Mode** | DISCOVERY_COMPLETE / IMPLEMENTATION_PENDING |
| **Canonical STAGE baseline** | `e9a1e5fba2557b99dca1f1e360a68c83160737db` |
| **Feature branch** | `cursor/sce-people-team-onboarding-01` |
| **STAGE data mutated during discovery** | No |
| **Schema / migration / prod** | Untouched |

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
