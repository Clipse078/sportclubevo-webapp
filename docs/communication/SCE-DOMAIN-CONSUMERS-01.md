# SCE-DOMAIN-CONSUMERS-01 — Canonical Domain Audience + Actionable Attention Architecture

## Purpose

SCE now has:

| Package | Delivers |
|---------|----------|
| **SCE-ZIELGRUPPEN-02** | Canonical hybrid audiences (`CommunicationAudienceSpec`, saved Zielgruppen) |
| **SCE-DOMAIN-AUDIENCE-01** | Registry/adapter for domain-owned dynamic audiences |
| **SCE-PROBETRAINING-COMM-01** | First production `DomainAudienceSource` consumer |

This document defines the **next layer**: how SCE domains expose **dynamic audiences** and, where appropriate, **actionable operational attention**—without merging those responsibilities or turning Communication into a workflow engine.

```
DOMAIN STATE          → business truth (ParticipationResponse, Task, Invoice, …)
DOMAIN AUDIENCE       → who matches this state *now*? (DomainAudienceSource → COMM-03)
OPERATIONAL ATTENTION → does *this user* need to act on domain state? (read models)
ACTION                → what authorized users may do (send reminder, navigate, mutate)
COMMUNICATION         → delivery when action involves messaging (live recipient resolution)
NOTIFICATION          → alert that something happened (may be read/dismissed)
```

**Personal obligations** (player/parent “your RSVP is missing”) reuse **PersonalAction** (`lib/personal-actions`). **Operator obligations** (trainer “2 RSVPs outstanding on Sunday’s match”) use the **domain operational attention** contract in `lib/domain-attention` (this package).

---

## Terminology

| Term | Meaning |
|------|---------|
| **Domain state** | Authoritative persisted business data in the owning module |
| **Domain audience** | Projection: current set of recipients matching a domain predicate |
| **Operational attention** | Projection: unresolved state that warrants user action for operators/coordinators |
| **Personal action / attention** | Projection: unresolved obligation for the logged-in member/guardian |
| **Nudge (product language)** | UX label for attention + optional action—not a mandated table or class name |
| **Live resolution** | Re-query domain state at action/send time; never trust dashboard counts as send authority |

---

## Reuse: DOMAIN-AUDIENCE

See `docs/communication/SCE-DOMAIN-AUDIENCE-01.md`.

- Register sources via `registerDomainAudienceSource()`.
- Persist `DomainAudienceReference` on Zielgruppe components.
- Materialize with `materializeDomainAudiencesInSpec()` → **COMM-03** → **COMM-17/COMM-18**.

Domain audience providers **describe/select**; they do **not** send mail or own Communication orchestration.

---

## Reuse: PersonalAction (member / guardian attention)

| Artifact | Location |
|----------|----------|
| Read model | `lib/personal-actions/types.ts` |
| Sources | `task`, `attendance`, `requirement` adapters in `lib/personal-actions/sources/` |
| Dashboard mapping | `lib/dashboard/personal-attention/` → “Benötigt meine Aufmerksamkeit” |

**PersonalAction** answers: *What must I (or my child) do?*

- `ATTENDANCE_RESPONSE` — open `ParticipationResponse` (YES/NO inline on dashboard/inbox)
- `REQUIREMENT` — open `RequirementRecipient` acknowledgement
- `TASK` — assigned open/in-progress tasks (attention subset: overdue / due today)

Future `REGISTRATION_ACTION` / `DOCUMENT_ACTION` are reserved in types only.

**Do not** overload PersonalAction for trainer aggregates (“2 parents still OPEN on this match”). That is operational attention (below).

---

## Operational attention (operator / coordinator)

### Existing patterns (fragmented)

| Area | Pattern | Scope |
|------|---------|--------|
| Billing ops | `buildBillingAttentionQueue()` | Finance operators |
| Planning hub | `buildPlanningConflictIncidents()` | Weekplanner conflicts |
| Legacy club dashboard | `buildAttentionItems()` | News/registrations/meetings KPIs (deprecated path) |
| Personal dashboard | `PersonalAttentionItem` from PersonalAction | Member/guardian |
| Team UI | `TeamParticipationSection`, `EventCommunicationPanel` | Page-local, not aggregated |

### Canonical contract (this package)

Types in DOMAIN-CONSUMERS-01; **registry + dashboard aggregation** in **SCE-DOMAIN-OPERATIONAL-ATTENTION-01** (no DB migration):

- `lib/domain-attention/types.ts` — `DomainOperationalAttentionItem`, actions, optional `DeferredDomainAudienceReference` (selector only — resolved live at execute)
- `lib/domain-attention/source-identity.ts` — stable `domain-attn:{domain}:{kind}:{entityType}:{entityId}` ids

Production domain packages implement `DomainOperationalAttentionSource`; registration/aggregation: `lib/domain-attention/` + `ensureProductionOperationalAttentionSourcesRegistered()` (see `SCE-DOMAIN-OPERATIONAL-ATTENTION-01.md`).

### Attention item fields (operator)

Conceptually each item includes:

- Stable source identity (see `buildDomainOperationalAttentionId`)
- `tenantId`, `domainKey`, contextual entity type/id
- Human-readable `title` / `summary`
- `severity` (`info` \| `warning` \| `urgent`) — no global SCE priority enum required
- `count` optional, **display-only**
- `dueAt` when domain exposes deadline (`participationResponseDueAt`, task/requirement due, invoice due)
- `actions[]` with `actionKey`, `label`, `executionKind`, `requiredPermissions`
- Optional `domainAudience` for COMMUNICATION_SEND actions
- `deepLink` to domain workspace

---

## Live resolution (mandatory)

### Display

Dashboard/domain pages may show counts from the latest read (e.g. 3 outstanding responses).

### Action execution (TOCTOU)

When the user invokes **Erinnerung senden** (or any COMMUNICATION_SEND action):

1. **Re-authenticate** session + tenant
2. **Re-check** domain + action permissions
3. **Re-read** canonical domain state (e.g. `ParticipationResponse.status`)
4. **Re-materialize** audience (`DomainAudienceReference` → `materializeDomainAudiencesInSpec`)
5. **COMM-03** recipient resolution with current Person/guardian/external rules
6. **COMM-17/COMM-18** preferences + safeguarding
7. Send/dispatch (e.g. `dispatchSmartReminderCommunication`)

**Flagship TOCTOU (Spielteilnahme):**

| Time | State |
|------|--------|
| 10:00 | 3 outstanding `ParticipationResponse` rows (`NOT_RESPONDED` / OPEN) — dashboard may show count **3** |
| 11:00 | One family responds — canonical state now **2** outstanding |
| 11:05 | Trainer clicks **Erinnerung senden** |

Expected at 11:05: re-read domain state → `DomainAudienceSource` resolves **2** current subjects → COMM-03/17/18 → send only to those two. The stale display count **3** is never send authority.

**Never** persist dashboard counts or preview recipient lists as send authority.

### Race handling

| Scenario | Behavior |
|----------|----------|
| A. Count drops to zero before action | No-op or validation error with 0 recipients — domain defines UX; **no stale send** |
| B. Event deleted/cancelled | Fail closed or no-op after re-read; do not materialize audience for missing context |
| C. User loses permission between display and action | Fail closed (403 / SOURCE_UNAUTHORIZED) |
| D. Audience source unavailable / misconfigured | Fail closed at materialization (registry/source errors) |
| E. Deadline changes | Use **current** deadline for display on next read; send path uses current response rows only |
| F. Tenant/context mismatch | Reject — attention id + `tenantId` + entity lookup must align; never cross-tenant materialize |
| Duplicate action double-click | Smart reminder `executionIdentity` dedupes scheduled sends where configured |
| Stale saved Zielgruppe | Materialization re-queries domain; unauthorized → fail closed |

**Execution not implemented in DOMAIN-CONSUMERS-01** — subsequent domain packages (SPIELBETRIEB-AUDIENCE-01, DOMAIN-OPERATIONAL-ATTENTION-01) implement server-side execute paths against this contract.

Reference implementation today: **SCE-COMM-10** `listEventParticipationSubjectPersonIds()` re-queries squad + responses at send time; **PROBETRAINING-COMM-01** re-queries registrations at materialization.

---

## Contextual actions (shared contract, no UI in this package)

The same domain state must back:

| Surface | Example |
|---------|---------|
| A. Domain page | Spielteilnahme (MATCH/TOURNAMENT) → “2 Rückmeldungen ausstehend” + Erinnerung |
| B. Personal dashboard | Only **PersonalAction** rows for **my** missing RSVP |
| C. Operator dashboard (future) | Aggregated `DomainOperationalAttentionItem` for teams user coordinates |
| D. Communication composer | Domain category → `DomainAudienceSource` candidate |

Shared anchors:

- **Participation**: `ParticipationEventRef` + `teamSeasonId` + `ParticipationResponse` rows
- **Domain audience**: `{ sourceKey, candidateId }` e.g. future `spielbetrieb.teilnahme/not-responded/{eventId}`
- **Attention id**: `domain-attn:spielbetrieb:participation-outstanding:event:{eventId}`

---

## Manual vs automatic reminders

| Level | Description | DOMAIN-CONSUMERS-01 |
|-------|-------------|---------------------|
| 1 | Informational count/text | Contract supports `count` + `severity: info` |
| 2 | Manual action (Erinnerung senden) | `executionKind: COMMUNICATION_SEND` + live audience |
| 3 | Scheduled automatic | **Out of scope** — belongs in notification/deadline processors (`participation-deadline-processor`, `requirement-deadline-processor`, `CommunicationReminderExecution`), **not** in DomainAudienceSource |

Automatic reminders must **not** be embedded in audience providers; they call the same live COMM paths when firing.

---

## Notification vs attention

| | **Notification** | **Attention** |
|---|------------------|-----------------|
| Semantics | Event: “Aufgebot veröffentlicht” | State: “Deine Rückmeldung fehlt” / “2 Rückmeldungen ausstehend” |
| Lifetime | Read/dismissed | Until underlying state resolves |
| Implementation | `lib/notifications/*`, push delivery | PersonalAction + future operational attention sources |
| Model | Do not equate with attention | Derived read models only |

---

## Authorization

Five distinct gates — **no UI-provided permission list is sufficient on its own**; execution always re-checks server-side.

| Gate | Purpose | Rule |
|------|---------|------|
| **Discovery auth** | Can this user see that a domain audience category / attention source exists? | Domain permissions on sources; operational sources declare `requiredPermissions` for discovery |
| **Display auth** | Can this user see a specific attention row or count? | Tenant isolation + team/org scope where the domain supports it |
| **Action auth** | Can this user invoke `actionKey`? | Re-check `requiredPermissions` (and domain-specific rules) on **execute** |
| **Domain audience auth** | Can this user resolve/materialize this `sourceKey` + `candidateId`? | Domain view permissions (`teams.*`, `registrations.view`, …) — **not** implied by send alone |
| **Comm send auth** | Can this user dispatch communication? | Communication send permissions + safeguarding — **does not** grant protected domain state access |

| Cross-cutting | Rule |
|---------------|------|
| **Tenant** | All queries scoped by `tenantId`; cross-tenant references rejected |
| **Role/team scope** | Team-scoped domains filter by assignments the user holds at execute time |
| **Send-only insufficient** | `communication.send` alone must not unlock billing/sponsor/participation admin reads |
| **Domain permission ≠ send** | Holding domain view does not automatically allow COMMUNICATION_SEND |

`requiredPermissions` on `DomainOperationalAttentionAction` is **metadata for server enforcement**, not a client-side allow list.

Participation: `lib/participation/authorization.ts` (self + guardian). Finance: strict billing roles. Sponsor: `sponsoring.view`.

---

## Dashboard & mobile

### Personal dashboard

Existing seam: `loadDashboardPersonalWork()` → `mapPersonalActionsToAttentionItems()`.

Operational attention is aggregated via `loadDomainOperationalAttention()` → `loadDashboardPersonalWork()` → `PersonalAttentionItem` (see `SCE-DOMAIN-OPERATIONAL-ATTENTION-01.md`).

### Mobile

No mobile UI in this package. Same read models should feed Mobile Home later (see `docs/dashboard/DASHBOARD-07-ACCEPTANCE-CLOSURE.md` handoff notes).

---

## Domain inventory (repository truth)

### EVENTS (Veranstaltungen — club events `Event.type = OTHER`)

| Field | Value |
|-------|-------|
| Canonical entity | `Event`, `EventParticipationAudienceEntry` |
| Tenant scope | `Event.tenantId` |
| Person relation | Invitee persons via audience entries (PERSON/TEAM/ORG_UNIT/ROLE) |
| Attendance model | `ParticipationResponse` with `eventKind` CLUB_EVENT; invitees from `resolveClubEventInviteePersonIds` |
| Deadline | `Event.participationResponseDueAt`, reminder fields |
| Existing comm | COMM-10 presets via club-event branch in `event-participation-recipients.ts` |
| Audience readiness | **Medium** — distinct invitee model vs squad |
| Nudge readiness | **Medium** — operator UI not centralized; data exists |

**Distinct from** match/tournament squad participation (see Spielbetrieb).

### SPIELBETRIEB (matches / tournaments / squad participation)

| Field | Value |
|-------|-------|
| Canonical entity | `Event` (MATCH/TOURNAMENT), `TrainingSession` (training ops under Spielbetrieb nav) |
| Roster | `PlayerSquadMember` (season squad—not a separate “Aufgebot selection” table) |
| Response | `ParticipationResponse` (`OPEN`/`YES`/`NO`/`MAYBE`) |
| Guardian | `guardianRelationship` + COMM-18 / subject responder users |
| Deadline | `participationResponseDueAt` on Event / TrainingSession |
| Existing actions | COMM-10 presets (`NOT_RESPONDED`), `sendEventNoResponseSmartReminder`, team communication APIs |
| Permissions | Team communication send gates (`requireTeamCommunicationSend`) |
| Audience readiness | **High** for `NOT_RESPONDED`-style dynamic groups (migrate COMM-10 → DomainAudience) |
| Nudge readiness | **High** for operator outstanding-count + manual reminder |

### TRAINING (Trainingsbetrieb)

Same participation stack as squad events but `eventKind: TRAINING` + `TrainingSession` + series policies (`participationResponseDueDaysBefore` on series).

Audience/nudge readiness: **High** (parallel to Spielbetrieb).

### TASKS (Aufgaben)

| Field | Value |
|-------|-------|
| Entities | `Task`, `TaskAssignee`, `Requirement`, `RequirementRecipient` |
| Personal filters | Task lists + PersonalAction task source |
| Domain audience use case | Niche: e.g. “assignees of overdue tasks in initiative”—needs explicit product demand |
| Readiness | **Low** for DOMAIN-AUDIENCE; PersonalAction covers personal comms needs |

### SPIELERBÖRSE

**Not implemented** in repository (no models, routes, or docs). Audience provider **BLOCKED BY DOMAIN IMPLEMENTATION**.

### FINANCE

Native billing: invoices, customers, contracts, reconciliation. `buildBillingAttentionQueue` for operator attention. Sponsor/billing comms require strict permissions. Audience readiness: **Medium** with privacy review; not first wave.

### SPONSOR / Commercial

`sponsor-audience-selectors` + COMM-13 resolution already exist. **Generic Sponsor Campaigns** are Sponsor-domain product (out of scope). DomainAudience wrapper readiness: **Medium** after Spielbetrieb/Training.

### PROBETRAINING (reference)

See `docs/communication/SCE-PROBETRAINING-COMM-01.md`.

**Reuse for future consumers:**

- Registration pattern + lazy `registerDomainAudienceSource`
- Stable `candidateId` vocabulary
- `resolveAudienceComponent()` for live queries
- Person vs external contact materialization + minor/guardian fail-closed
- COMM-03 / COMM-17 / COMM-18 / provenance

**Do not generalize:** Probetraining status enum filters, registration payload shape, `registrations.view` semantics.

---

## Flagship: Aufgebot readiness

Product language “Aufgebot” maps to **squad-scoped participation**, not a separate lineup entity.

| Question | Status |
|----------|--------|
| Event/match/tournament | **Yes** — `Event` MATCH/TOURNAMENT |
| Squad | **Yes** — `PlayerSquadMember` (full season squad invited) |
| Selection entity (subset “selected for Sunday”) | **No** separate canonical model—only full squad |
| Attendance request | **Yes** — participation request fields + notifications |
| Response status | **Yes** — `ParticipationResponse` |
| Player/Person | **Yes** |
| Guardian | **Yes** — `guardianRelationship`, responder resolution |
| Response deadline | **Yes** — `participationResponseDueAt` |
| Audience for “ohne Rückmeldung” | **Yes** — COMM-10 `NOT_RESPONDED` / `PENDING` filter |
| Centralized operator attention | **No** — UI on team pages only |

**AUDIENCE_IMPLEMENTABLE_NOW:** Yes (wrap existing COMM-10 logic as `spielbetrieb` DomainAudienceSource).

**NUDGE_IMPLEMENTABLE_NOW:** Yes (operational attention item + action pointing at live domain audience / existing remind API).

**MISSING (future gap — MATCH-SPECIFIC AUFGEBOT / SELECTION):** Explicit match-day subset (season squad → selected for event → participation → guardians → final match squad). Until a canonical selection entity exists, use **Spielteilnahme / Teilnahmeanfrage / Rückmeldung zur Teilnahme / Rückmeldung ausstehend** — not “selected players for this match”.

---

## Event registration vs match Aufgebot

| | Club event registration | Match/tournament participation |
|---|-------------------------|--------------------------------|
| Invitee definition | `EventParticipationAudienceEntry` | `PlayerSquadMember` |
| Event kind | CLUB_EVENT | MATCH / TOURNAMENT |
| Do not collapse | Different audience resolution paths in `event-participation-recipients.ts` | |

---

## Architecture decision (DOMAIN-CONSUMERS-01)

| Option | Choice |
|--------|--------|
| **Personal/member attention** | **A** — keep **PersonalAction** as canonical |
| **Operator/domain attention** | **C (minimal)** — `lib/domain-attention` contract; registry + aggregator in DOMAIN-OPERATIONAL-ATTENTION-01 |
| **Database** | **None** — derive from domain state |

**Why not B only:** PersonalAction is intentionally **per-subject** (inbox semantics). Operator aggregates need a parallel read model without polluting PersonalAction.

**Why not full registry now:** No second consumer implemented; Probetraining proves audience path only.

---

## Domain audience consumer programme

Recommended **package sequence** (not prompt order):

| # | Package | Why |
|---|---------|-----|
| 1 | **SPIELBETRIEB-AUDIENCE-01** | Strongest data + flagship Aufgebot; COMM-10 to migrate; proves attention+nudge |
| 2 | **TRAINING-AUDIENCE-01** | Same participation engine; high FCA daily value |
| 3 | **EVENTS-AUDIENCE-01** (club Veranstaltung) | Separate invitee model; needed before generic “events” composer |
| 4 | **DOMAIN-OPERATIONAL-ATTENTION-01** (registry) | **Implemented** — aggregate production sources into Personal Command Center (see `SCE-DOMAIN-OPERATIONAL-ATTENTION-01.md`) |
| 5 | **SPONSOR-AUDIENCE-01** | Wrap COMM-13 selectors as DomainAudience for composer parity |
| 6 | **FINANCE-AUDIENCE-01** | Strict auth + privacy; after comm patterns proven |
| 7 | **TASKS-AUDIENCE-01** | Only if comms needs dynamic task-state groups |
| — | **SPIELERBÖRSE-AUDIENCE-01** | **Blocked** until domain exists |

### Per-package notes (first audiences only)

**SPIELBETRIEB-AUDIENCE-01** — **Implemented** (see `docs/communication/SCE-SPIELBETRIEB-AUDIENCE-01.md`)

- Entity: `ParticipationResponse` + `PlayerSquadMember` anchor
- First audiences: `not-responded`, `accepted`, `declined`, `maybe`, `all-invitees` (COMM-10 parity + MAYBE for domain composer)
- Permissions: team comm view (discovery/materialize) + team comm send (Erinnerung)
- Attention: `participation-outstanding` with `COMMUNICATION_SEND` → deferred `spielbetrieb.teilnahme` candidate per event
- Shared core: `lib/participation/participation-audience-resolution.ts`
- Dependency: none (logic existed; refactored, not forked)

**TRAINING-AUDIENCE-01** — **Implemented** (see `docs/communication/SCE-TRAINING-AUDIENCE-01.md`)

- Entity: `TrainingSession` + squad (per-occurrence, not series-wide)
- Audiences: COMM-10 parity + MAYBE (`training.teilnahme`)
- Attention: `participation-outstanding` + manual COMM-10 TRAINING remind
- Shared core: `lib/participation/participation-audience-resolution.ts`

**EVENTS-AUDIENCE-01** — **Implemented** (see `docs/communication/SCE-EVENTS-AUDIENCE-01.md`)

- Entity: `Event` OTHER + `EventParticipationAudienceEntry`
- Audiences: live invitation population by response status (`events.teilnahme`)
- Attention: `participation-outstanding` + manual remind (COMM-10 team path or COMM-11 club path)
- Shared status core: `lib/participation/participation-audience-resolution.ts` (club branch only for population)

**TASKS-AUDIENCE-01**

- Deferred until product defines comms use case beyond PersonalAction

**FINANCE-AUDIENCE-01**

- Audiences: overdue invoice recipients, open receivable contacts
- Permissions: billing view/manage only

**SPONSOR-AUDIENCE-01**

- Map existing sponsor selectors to `DomainAudienceSource` for EVO-03 composer

**PROBETRAINING**

- Done (`probetraining.anmeldungen`)

---

## Dependencies & blockers

| Blocker | Impact |
|---------|--------|
| Spielerbörse domain missing | SPIELERBÖRSE-AUDIENCE blocked |
| Aufgebot subset selection | Product mismatch vs squad-wide invite |
| COMM-EVO-03 composer UI | Discovery UX for domain categories |
| Operational attention registry | **Delivered** in DOMAIN-OPERATIONAL-ATTENTION-01 |

---

## Related documents

- `docs/communication/SCE-DOMAIN-AUDIENCE-01.md`
- `docs/communication/SCE-PROBETRAINING-COMM-01.md`
- `docs/communication/SCE-ZIELGRUPPEN-02-HYBRID-AUDIENCES.md`
- `docs/dashboard/DASHBOARD-D-UX-BLUEPRINT.md`
- `lib/personal-actions/types.ts`
- `lib/communication/event/event-communication-service.ts` (SCE-COMM-10)

---

## Explicitly out of scope (DOMAIN-CONSUMERS-01)

- Individual domain audience providers (except documentation references)
- Automatic reminder scheduling
- Sponsor Campaign product
- Composer UI / dashboard redesign
- FCA / PROD data mutation
- DB migrations
