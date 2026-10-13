# SCE-CLUB-EVENT-AUDIENCE-01 — Club Event Audience, Create Workflow & Recurrence

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-CLUB-EVENT-AUDIENCE-01` |
| **Programme** | [`SCE-UI-ROLLOUT-01+`](./SCE-UI-ROLLOUT-01.md) |
| **Status** | **CLOSED** |
| **Revisions** | **R1** (tabbed create + recurring series) · **R1.1** (create UX refinement) |
| **OWNER_VISUAL_UAT** | **PASS** (PO-owned) |
| **Predecessor** | [`SCE-UI-ROLLOUT-01G`](./SCE-UI-ROLLOUT-01G.md) **CLOSED** |
| **Branch** | `cursor/sce-club-event-audience-01` |
| **PR** | #837 → `STAGE` **MERGED** |
| **Approved R1.1 HEAD** | `7ae6a2e06ae803ea82a17b2be8f4ab7a5e5dd8b4` |
| **Successor** | [`SCE-ACTIVITY-CREATE-01A`](./SCE-ACTIVITY-CREATE-01A.md) — Unified Activity Creation research |
| **Then** | [`SCE-UI-ROLLOUT-01H`](./SCE-UI-ROLLOUT-01.md) — Core planning surface adoption ( **NOT STARTED** ) |
| **Architecture input** | [`SCE-UI-ROLLOUT-01G-R1-TEAM-AUDIENCE-ARCHITECTURE.md`](./SCE-UI-ROLLOUT-01G-R1-TEAM-AUDIENCE-ARCHITECTURE.md) |

## Objective

Deliver authoritative **Club Event organisational audience** (`CLUB_WIDE` \| `SELECTED_ORG_UNITS`), programme relevance resolvers, canonical **create workflow** on Universal Context Tabs, **recurring series** with materialized occurrences, resource conflict integration, publication, and **R1.1** natural-language recurrence UX — without conflating scope with publication, participation, or organiser.

## Scope model (canonical)

| Mode | Meaning |
|------|---------|
| `CLUB_WIDE` | Event concerns the whole club |
| `SELECTED_ORG_UNITS` | Event concerns **1..N** selected organisational targets (Teams and/or OrgUnits) |

**Persistence:**

```text
Event.type = OTHER (Club Event)
  clubEventOrganisationalScope: CLUB_WIDE | SELECTED_ORG_UNITS
  ClubEventOrganisationalAudienceTeam (N:M → Team)
  ClubEventOrganisationalAudienceOrgUnit (N:M → OrgUnit)
```

OrgUnit selection is **exact unit** — no silent descendant expansion during this package.

## Separation of concerns (non-negotiable)

| Concern | Role | Must not substitute for audience |
|---------|------|----------------------------------|
| **AUDIENCE** | Who the event concerns («Gültig für») | — |
| **PUBLICATION** | Website / Homepage / Wochenplan | Not scope |
| **ATTENDANCE** | RSVP / participation | Not scope |
| **ORGANISER** | Host / organiser branding | Not scope |

## Create workflow (R1 + R1.1)

| Item | Contract |
|------|----------|
| **Route** | `/dashboard/veranstaltungen/new` |
| **Tabs** | Übersicht · Gültigkeit · Termin · Ressourcen · Publikation (`SceContextTabs`) |
| **Post-create** | Teilnehmer · Aufgaben & Anforderungen · Zusammenarbeit — **not** on create route |
| **Dirty guard** | `SceContextDirtyGuardProvider` |
| **Actions** | Shell-level Abbrechen / Veranstaltung erstellen |

Design System: [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md) — Club Event create/edit workflow.

## Recurrence (R1)

| Item | Contract |
|------|----------|
| **Series** | `ClubEventSeries` |
| **Occurrences** | Materialized `Event` rows |
| **Exceptions** | `ClubEventSeriesOccurrenceException` |
| **Timezone** | Tenant IANA |
| **Max occurrences** | 104 |
| **Patterns** | Weekly; monthly fixed day; monthly ordinal weekday |
| **End** | End date or occurrence count — **no** infinite materialization |
| **UX (R1.1)** | Natural language («Alle … Wochen/Monate», «Nach … Terminen»), summary + bounded preview — no raw RRULE in UI |

**VL regression (first Tuesday monthly, 18:30–21:00):** `03.11.2026`, `01.12.2026`, `05.01.2027`, `02.02.2027` · «Jeden ersten Dienstag im Monat · 18:30–21:00».

## Series lifecycle (deferred)

Architecture supports future **Nur diesen Termin** / **Diesen und zukünftige** / **Gesamte Serie** edit and cancellation flows. **Full lifecycle UI is not shipped** in this package; unsupported series-wide destructive actions must not silently rewrite historical occurrences.

## Resources & publication

- Recurring occurrences use existing **EventFacilityAllocation** / availability conflict validation — no second conflict engine.
- Publication switches (Website, Homepage, Wochenplan) remain independent from organisational applicability.

## Activity presentation

- **`SceClubEventPresentationModel`** · **`SceClubEventCard`** · activity type **VERANSTALTUNG** · semantic **club-event-violet**
- No recurrence-specific activity type or second presentation model.

## Migrations (final — do not rewrite)

| Migration | Purpose |
|-----------|---------|
| `20261013103000_sce_club_event_audience_01` | Organisational scope + audience N:M |
| `20261013120000_sce_club_event_audience_01_r1` | Series, recurrence, occurrence materialization |

## Toggle First

`BINARY_CONTROL_COMPLIANCE: PASS` · `NEW_BINARY_CHECKBOXES: 0` — Wiederholung, Ganztägig, publication use canonical switches; audience targets use multi-select.

## Validation (closure)

Automated suites (representative):

- `lib/events/__tests__/sce-club-event-audience-01.test.ts`
- `lib/events/domain-audience/__tests__/club-event-relevance.test.ts`
- `lib/events/__tests__/club-event-recurrence.test.ts`
- `lib/events/__tests__/club-event-recurrence-presentation.test.ts`
- `lib/veranstaltungen/__tests__/club-event-create-workflow.test.ts`
- `components/admin/veranstaltungen/__tests__/VeranstaltungCreateWorkflowR1_1.test.ts`
- `components/admin/veranstaltungen/__tests__/VeranstaltungRecurrenceFields.test.tsx`
- `lib/sporting-activity-presentation/canonical/__tests__/club-event-audience-presentation.test.ts`
- `lib/design-system/__tests__/sce-binary-control-standard.test.ts`

**Closure agent:** 64+ package-focused tests **PASS**; `prisma validate` **PASS**; `npm run build` **PASS**.

## Closure criteria

- [x] PO visual UAT — **PASS**
- [x] STAGE drift review — no conflicting STAGE commits since `efd792a1` baseline
- [x] Migration integrity — not rewritten post-application
- [x] Persistent fictional Club Event test data — **0**
- [x] Automated validation + build **PASS**
- [x] PR #837 merged to `STAGE`
- [x] Roadmap status → **CLOSED** (R1 + R1.1)

**NEXT (not started):** [`SCE-ACTIVITY-CREATE-01A`](./SCE-ACTIVITY-CREATE-01A.md).

**Then:** [`SCE-UI-ROLLOUT-01H`](./SCE-UI-ROLLOUT-01.md) after Activity Create research gate (see [`SCE-ACTIVITY-CREATE-01`](./SCE-ACTIVITY-CREATE-01.md)).
