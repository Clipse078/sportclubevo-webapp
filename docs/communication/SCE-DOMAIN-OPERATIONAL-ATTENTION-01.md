# SCE-DOMAIN-OPERATIONAL-ATTENTION-01 — Canonical Operational Attention Aggregation

## Purpose

Aggregate live **domain operational attention** from production participation sources into the existing **Personal Command Center** attention area (“Benötigt meine Aufmerksamkeit”) without conflating operator state with **PersonalAction** persistence.

| Layer | Question |
|-------|----------|
| **PersonalAction** | What must *I* (or my child) do? |
| **Domain operational attention** | What unresolved operator/coordinator state am I authorized to see? |

This package implements the registry + aggregator promised by **SCE-DOMAIN-CONSUMERS-01** after Spielbetrieb, Training, and Veranstaltungen proved per-domain sources.

---

## Architecture

```
DomainOperationalAttentionSource (×3 production)
        ↓ register (explicit, in-process)
operational-attention-registry
        ↓ loadDomainOperationalAttention()
DomainOperationalAttentionItem[]  (live, tenant-scoped)
        ↓ mapDomainOperationalAttentionItems()
PersonalAttentionItem (presentation read model)
        ↓ loadDashboardPersonalWork()
Personal Command Center — Benötigt meine Aufmerksamkeit
```

**No database migration.** Counts are never persisted as send authority.

---

## Production sources

| Source | Module | Kind |
|--------|--------|------|
| `spielbetriebParticipationOutstandingAttentionSource` | `lib/spielbetrieb/operational-attention/` | `participation-outstanding` |
| `trainingParticipationOutstandingAttentionSource` | `lib/training/operational-attention/` | `participation-outstanding` |
| `clubEventParticipationOutstandingAttentionSource` | `lib/events/operational-attention/` | `participation-outstanding` |

Registration: `ensureProductionOperationalAttentionSourcesRegistered()` (idempotent, cold-start safe).

---

## Registry

- **API:** `registerDomainOperationalAttentionSource(source, attentionKind)`
- **Identity:** `{domainKey}:{attentionKind}` via `buildOperationalAttentionSourceRegistryKey`
- **Duplicate policy:** throws if key already registered
- **Ordering:** localeCompare `"de"` on registry keys
- **Test reset:** `_clearDomainOperationalAttentionRegistryForTests()`

---

## Aggregation

`loadDomainOperationalAttention({ tenantId, actorUserId, permissionKeys, now? })`

- Each source: `canDiscover` → `evaluateAttention` (source enforces domain auth)
- **Tenant isolation:** rejects items whose `tenantId` ≠ context
- **Dedup:** duplicate stable `id` within one evaluation throws
- **Failure isolation:** source exception → logged, no items from that source; other sources continue
- **Partial load UX:** `failedSourceKeys` → `operationalSourcesDegraded` on dashboard snapshot; empty attention must not show definitive “all clear” when degraded
- **Ordering:** `dueAt` ascending, then stable `id`

---

## Dashboard integration

- **Loader:** `loadDashboardPersonalWork()` merges PersonalAction attention + operational items
- **Dedup:** PersonalAction ids (`task:`, `participation:`, …) vs `domain-attn:` — separate namespaces; combined dedupe by `id` throws on collision
- **Combined sort:** urgency bucket → `dueAt` → `id` (`sortPersonalAttentionItems`)
- **Operational-only users:** attention section authorized when operational items exist even without personal inbox
- **UI:** `PersonalAttention` — existing personal rows unchanged; operational rows show domain label, summary, deep link, **Erinnerung senden** via action metadata

---

## Action execution

- **Not** a generic `/attention/execute` bypass
- Dashboard POST: `/api/dashboard/domain-operational-attention/execute`
- Server: `executeDomainOperationalAttentionAction()` re-loads authorized items, matches `actionKey`, dispatches to domain executors:
  - Spielbetrieb → `executeSpielbetriebOutstandingParticipationReminder`
  - Training → `executeTrainingOutstandingParticipationReminder`
  - Events → `executeClubEventOutstandingParticipationReminder`
- Domain paths re-authenticate and re-resolve live audience (COMM-03 → COMM-17/18)

---

## Notifications & automation

- **Notifications** remain historical; aggregator does not create notifications
- **Automatic reminders / cron:** out of scope (manual CTA only)

---

## Query / scale notes (current)

| Source | Pattern |
|--------|---------|
| Spielbetrieb | One `event.findMany` (cap 40) + per-event outstanding resolution |
| Training | Similar per-session evaluation |
| Events | Per club event invitee resolution |

Three sources are acceptable for FCA scale today; per-entity loops exist — batching deferred (**ATTENTION-PERF-01**).

---

## FCA validation

Read-only script: `scripts/sce-domain-operational-attention-01-fca-readonly-aggregate.ts`  
Reports aggregate counts only (no participant PII, no actions).

---

## Backlog preservation

| Item | Status |
|------|--------|
| **CALENDAR-UX-UPGRADE** — Smart next-active-period | Not implemented here; applies across Spiele/Trainings/Turniere/Veranstaltungen |
| **FCA-EVENTS-PARTICIPATION-UAT** | Remains open (#788 could not validate FCA live data) |
| **ATTENTION-PERF-01** | Batch operational attention evaluation when tenant scale requires it |
| **DOMAIN-OPERATIONAL-ATTENTION-01-UI-UAT** | Post-STAGE browser UAT for dashboard operational attention (mixed/partial/reminder flows) |

---

## Related docs

- `SCE-DOMAIN-CONSUMERS-01.md` — contract + programme
- `SCE-SPIELBETRIEB-AUDIENCE-01.md`, `SCE-TRAINING-AUDIENCE-01.md`, `SCE-EVENTS-AUDIENCE-01.md` — domain sources
