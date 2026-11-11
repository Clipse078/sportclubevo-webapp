# SCE-CD-02 — Meetings 2.0: Meeting Workspace

**Package ID:** SCE-CD-02 (maps to architecture baseline **CD-02** — meeting sub-entity UI)  
**Branch:** `cursor/sce-cd-02-meetings-workspace-52b1`  
**Target:** STAGE

## Delivered

- Full-page **Meeting Workspace** on `/vereinsleitung/meetings/[slug]` for DB-backed meetings
- Inline CRUD for agenda, participants, decisions, and actions via existing REST APIs
- Meeting header with lifecycle status, logistics, and link to metadata edit
- Template preview hardening: strategic entity context respects VL workspace access + visibility queries

### SCE-CD-02R1 (UAT corrections)

- **Creation UX:** full-page workflow at `/vereinsleitung/meetings/new` (list CTA uses page flow, not modal)
- **People pickers:** tenant-scoped `PeoplePicker` for participants, agenda/decision/action owners (`personId` / `ownerPersonId`)
- **Agenda duration:** optional `durationMin` per item + meeting `plannedDurationMin` with non-blocking overrun hint
- **Initiative linking:** optional `initiativeId` on agenda items with visibility-gated API validation

### SCE-CD-02R2 (UAT readiness)

- **Navigation:** Club-Betrieb header resolves to operational **Helfereinsätze** (`/dashboard/helfereinsaetze`), not Sitzungen/Meetings or Material demo
- **Create-flow metadata:** Meetings documented as full-page canonical create (`SCE-DS-EX-DOM-006`); unused `CreateMeetingComposerDialog` removed

## Meeting authority & invitations (Phase E)

SportClubEvo remains the system of record. No Google Calendar / Outlook sync is implemented in this package. Existing communication templates and audience infrastructure can be reused for future invitation dispatch; **no automatic outbound invitations** are sent from workspace mutations or tests.

**Follow-on dependency (documented, not built):** optional calendar notification channel (COMM / calendar programmes) for RSVP links referencing meeting slug URLs.

## Tests

- `lib/communication/__tests__/sce-cd-02-template-preview-context.test.ts`
- `lib/meetings/__tests__/meeting-workspace-access.test.ts`
- Existing meeting API + visibility guard tests remain authoritative for tenant isolation
