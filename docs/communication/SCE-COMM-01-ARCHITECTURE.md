# SCE-COMM-01 — Canonical Communication & Zielgruppen Architecture

**Programme:** SCE COMM  
**Baseline:** `origin/STAGE` @ `23c1ebab4546e39243abf18aa45676585ddb3c68`  
**Contracts:** `lib/communication/platform/`  
**Ownership matrix:** [SCE-COMM-01-source-matrix.json](./SCE-COMM-01-source-matrix.json)

---

## Programme invariants

1. **Zielgruppen are an organisation-wide Communication capability and are not owned by Sponsors, Teams, or individual feature modules.**
2. **Authorization to send and membership of a Zielgruppe are separate concerns.**
3. **Communication content is separate from delivery attempts** (one communication → many recipient/channel deliveries).
4. **Historical sends require recipient snapshots** — never infer past delivery from current group membership alone.
5. **Tenant isolation is mandatory** on audience resolution, context validation, and delivery.
6. **Sponsors and Teams consume the platform** — they do not own audience engines, push infrastructure, or email infrastructure.

---

## 1. Layered domain model

```
COMMUNICATION (kind + content + policy)
    ↓
CONTEXT (where/why it originated — Organisation, Team, Event, Sponsor, …)
    ↓
ZIELGRUPPE / AUDIENCE (who it concerns — rules + structural selectors)
    ↓
RECIPIENT RESOLUTION (dispatch-time: data + auth + safeguarding + preferences)
    ↓
CHANNEL (IN_APP, PUSH, EMAIL)
    ↓
DELIVERY (per-recipient attempts: QUEUED → SENT → …)
    ↓
RESPONSE / INTERACTION (READ, ACK, RESPONDED — kind-specific payloads)
```

### 1.1 Communication kinds (extension without new subsystems)

| Kind | Role | Specialized data (future packages) |
|------|------|-------------------------------------|
| `MESSAGE` | Conversational | Threads, replies, reactions |
| `ANNOUNCEMENT` | Structured one-to-many | Read/ack policy |
| `ALERT` | Urgent / time-sensitive | Escalation, expiry |
| `POLL` | Choice collection | Options, votes, anonymity |
| `DATE_POLL` | Scheduling poll | Slots, availability → Event conversion |
| `REQUEST` | Helfer / capacity ask | Accept/decline, optional Aufgabe bridge |
| `CAMPAIGN` | Sponsor/club broadcast composer | Scheduling, multi-channel |

Types live in `communication-kinds.ts`. Poll attendance remains Calendar/Participation domain; formal tasks remain Aufgaben.

### 1.2 Context model

`CommunicationContextRef` (`communication-context.ts`) retains originating context:

| Kind | Example |
|------|---------|
| `ORGANISATION` | Club-wide announcement |
| `ORG_UNIT` | Kinderfussball unit message |
| `TEAM` | F2 team message (default audience) |
| `EVENT` | Training cancelled → invitees |
| `SPONSOR` | Campaign composer entry |
| `SYSTEM` | Module-generated communication |

**Integrity:** validate shape in contracts; **prove tenant ownership** of referenced ids in services before persist. Avoid sponsor-specific columns on base communication rows — use typed references.

Existing `CommunicationTargetType` (COMM-01A) remains the **collaboration/email thread anchor** on business objects (registration, planning events, documents). Platform context is the **programme-level** origin for mobile/club/campaign comms. Convergence is planned in COMM-04+ (team chat) without breaking registration threads.

---

## 2. Zielgruppen engine

### 2.1 Ownership

- **Persistence:** `TargetGroup` (tenant-scoped, `ruleJson` schema in `lib/org/target-group-types.ts`).
- **Resolution:** `lib/org/target-group-resolver.ts` (deterministic, no query language).
- **Communication contract:** `CommunicationAudienceSpec` + validation in `lib/communication/platform/audience/*`.

Requirements/Aufgaben already consume the same structural selectors via `lib/requirements/requirement-audience-resolvers.ts` — **do not fork person/team/audience models**.

### 2.2 Structural targets

`StructuralAudienceSelectors`: whole organisation, org units, teams, roles (id or role key). Same families as requirement draft audiences.

### 2.3 Dynamic rule-based targets

Reuse `TargetGroupClause` (`union`, `intersection`, leaf clauses: `teamIds`, `orgUnitIds`, `roleKeys`, `personIds`, `userIds`). Examples:

- Trainer **AND** team (intersection)
- Junioren A–C trainers (union of team-scoped role clauses)

**NOT / exclude:** implemented as **explicit exclude person lists** and set subtraction after resolution — not an arbitrary SQL DSL.

### 2.4 Composition

- One communication may reference **1..n** audience components.
- `composition: UNION | INTERSECTION` across components.
- Saved groups referenced by `savedTargetGroupIds`.

### 2.5 Explicit persons

`explicit.includePersonIds` / `excludePersonIds` when authorized — validated for overlap.

---

## 3. Recipient resolution pipeline

Dispatch-time pipeline (`recipient-resolution/pipeline.ts`):

1. **Resolve audience** → candidate subject `personIds` (TargetGroup + structural + explicit).
2. **Intersect sender scope** → `allowedSubjectPersonIds` from People/Access (`communication-authorization.ts`).
3. **Safeguarding** → minor/guardian policy (`safeguarding/guardian-policy-seam.ts`, data from `GuardianRelationship`).
4. **Communication preferences / consent** → category + channel (`preference-categories.ts`, COMM-17 `UserCommunicationPreference`).
5. **Channel eligibility** → effective delivery targets (User ids).
6. **Persist snapshot** → `RecipientSnapshotRow[]` for audit and “who actually received this send”.

**Authorization ≠ Zielgruppe:** selecting “whole organisation” only affects **targets**, not **sender rights**. Effective recipients = `SELECTED ∩ SENDER_SCOPE ∩ ELIGIBILITY`.

Guardian expansion follows precedent from `lib/notifications/requirement-recipient-resolution.ts` but policy is tenant-configurable (COMM-18).

---

## 4. Channels & delivery

| Channel | Notes |
|---------|--------|
| `IN_APP` | Inbox / comm center (COMM-15) |
| `PUSH` | Device tokens on user/device (COMM-09) — **not** team-owned |
| `EMAIL` | Provider-backed; do not claim `DELIVERED` without provider support |

`CommunicationDeliveryStatus`: `QUEUED`, `SENT`, `DELIVERED` (where supported), `FAILED`, `SKIPPED`.

Existing `NotificationDelivery` remains the notification feed channel state; platform comm deliveries will align in COMM-13/09.

---

## 5. Engagement (read / ack / respond)

Distinct per-recipient states: `PENDING`, `DELIVERED`, `READ`, `ACKNOWLEDGED`, `RESPONDED` (`engagement.ts`). Announcement “21/28 read” and poll “22/28 responded” use different metrics — do not conflate.

---

## 6. Threads & team communication seam

`seams/team-communication-seam.ts`:

- **Default audience** for team context = active team structural selector (trainer should not manually pick F2 each time).
- **Conversation anchor** types for general vs named threads (COMM-05).
- Full mobile UX (Nachricht, Umfrage, Termin finden, Helfer suchen) is **out of scope** for COMM-01.

---

## 7. Announcements & alerts

Kind-level defaults in `COMMUNICATION_KIND_SEMANTICS` (ack/reply/thread support). SMS reserved, not implemented. Escalation/fallback documented for COMM-06.

---

## 8. Polls & date polls

Extension points only: poll-specific tables in COMM-07. **Do not** misuse Calendar attendance as polling. Date poll → Event conversion stays in Calendar domain.

---

## 9. Requests / Helfereinsätze

`REQUEST` kind + optional `RequestToAufgabeBridge` (`integration-seams.ts`). Does **not** auto-create Aufgaben for every request.

---

## 10. Event-context communication

`seams/event-communication-seam.ts` — presets (`ALL_INVITEES`, `ACCEPTED_ONLY`, …) map to **participation filters** in COMM-10. RSVP data from `lib/participation/*` only.

---

## 11. Club communication

Organisation / OrgUnit context + saved Zielgruppen + scheduled/campaign sends use the **same engine** as team comms. Permissions via org communication roles (future COMM-11).

---

## 12. Sponsor seam

`seams/sponsor-communication-seam.ts` — Sponsor launches **Campaign Composer** with `SPONSOR` context. Sponsor does **not** own recipient lists, Zielgruppen, push, or email infrastructure.

---

## 13. Attachments & Workspace

COMM-01A: `CommunicationAttachment` with optional `WorkspaceDocument` / version linkage. Lightweight message media vs governed documents — do not weaken Workspace authorization (`lib/workspace/access/*`).

---

## 14. Notification integration

Communication owns **content/conversation/campaign**. Notification owns **attention signals** (`lib/notifications/notification-service.ts`). Bridge type in `integration-seams.ts`. Requirement notifications remain; comm events may emit notifications without replacing the feed.

---

## 15. Audit & history

Reuse `lib/audit/log-action.ts`. Communication audit references ids + summaries (`CommunicationAuditSeam`); **no** full bodies in generic audit logs (same rule as `audit-integration.ts`).

---

## 16. Performance & scale

Organisation-wide campaigns **must not** synchronously deliver thousands of messages in one HTTP request. Seams:

- Recipient resolution → snapshot persist
- `CommunicationDispatchJobSeam` → queue/batch workers, idempotency, provider retries (COMM-19/20)

COMM-01 defines boundaries only.

---

## 17. Safeguarding

- **Model:** `GuardianRelationship`, `lib/people/guardian-service.ts`
- **Policy:** `TenantSafeguardingCommunicationPolicy` (tenant-configurable)
- Trainer → minor direct messaging restrictions, guardian substitution, traceability — COMM-18 implements persistence/UI.

---

## 18. Relationship to existing COMM-01A/B/C

| Asset | Role today | Programme direction |
|-------|------------|-------------------|
| `CommunicationThread` / `CommunicationMessage` | Registration/planning email + internal comments | Coexist; team chat extends platform model |
| `CommunicationTargetType` | Thread anchor on business entities | Maps to planning/event collaboration |
| `lib/communication/recipient-resolver.ts` | Single external recipient (registration) | Superseded for bulk comm by platform pipeline |
| Billing communication | Finance domain | **Out of scope** for club comm platform |

---

## 19. Enforcement

- Import platform types/enums from `lib/communication/platform` in future COMM packages.
- Validate audiences with `validateCommunicationAudienceSpec` before accept/scheduling APIs.
- Apply `resolveEffectiveRecipients` (or full pipeline) at **service/API boundaries** before enqueueing delivery.

---

## 20. Tests

`lib/communication/platform/__tests__/sce-comm-01-contracts.test.ts` covers executable contracts. Regression: `lib/org/__tests__/rperm-04-target-group-role-keys.test.ts`, requirement audience tests as applicable.
