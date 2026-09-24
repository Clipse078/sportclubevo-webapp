# PLANNING-UX-05 — Unified Operational Event Workspace

Builds on [PLANNING-UX-04](./PLANNING-UX-04-UNIFIED-EVENT-EDITORS.md) and TRAININGCENTER-UX-03/R2.

## Route matrix

| Domain | Create | Edit |
|--------|--------|------|
| Training | Series create (existing); session = generated | `/dashboard/training/sessions/[sessionId]/edit` |
| Match | `/dashboard/matchcenter/new` | `/dashboard/matchcenter/[matchId]` |
| Tournament | `/dashboard/tournamentcenter/new` | `/dashboard/tournamentcenter/[tournamentId]/edit` |
| Club event | `/dashboard/veranstaltungen/new` | `/dashboard/veranstaltungen/[eventId]/edit` |

## Shared architecture

`components/admin/shared/planning-editor/`:

| Primitive | Role |
|-----------|------|
| `PlanningEditorControlBar` | Top operational strip (publication, etc.) |
| `PlanningEditorPublicationControls` | Canonical switch-based publication channels |
| `PlanningEditorZeitstandardLink` | Permission-aware `/dashboard/admin/facilities` |
| `PlanningEditorParticipantsSection` + `PlanningParticipantsList` | Shared attendance presentation |
| `PlanningEditorWorkSection` | Aufgaben + Anforderungen (requirements gap documented) |
| `PlanningEditorCollaborationSection` | Zusammenarbeit via `InternalCommentsPanel` |
| `PlanningEditorPrePersistNotice` | Create-mode lifecycle messaging |

Channel definitions: `lib/planning/planning-publication-channels.ts`.

Participant loaders: `lib/planning/load-match-planning-participants.ts`, `load-tournament-planning-participants.ts`.

## Canonical page order

1. Record header  
2. **Operational controls** (publication; planning status where applicable)  
3. Core details / schedule  
4. Resources (domain-specific)  
5. Teilnehmer  
6. Aufgaben + Anforderungen  
7. Zusammenarbeit  

## Publication

- Switches only (`SwitchThumb`) — no publication checkboxes in canonical flows.
- Tournament: `TournamentPublicationToggles` → `PlanningEditorPublicationControls`.
- Veranstaltung: `VeranstaltungAusspielungFields` → shared controls.
- Match create: visible toggles + `resolveMatchPublicationDefaultsForCreate` on HOME/AWAY change.
- Match edit: publication block moved to top of `MatchcenterDetailOperational` (record layout).

## Zeitstandards by domain

| Domain | Uses tenant operational duration policy | Link shown |
|--------|----------------------------------------|------------|
| Training | Yes (series/session scheduling) | Yes, when `FACILITIES_MANAGE` |
| Match | Indirect (match timing / end-time ops) | No dedicated link (no duration picker on session form) |
| Tournament | Yes (`TournamentStandardDurationHint`) | Yes, when `FACILITIES_MANAGE` |
| Club event | No configurable time standard on event | No |

## Resource semantics

Unchanged from TRAININGCENTER-UX-03R2: `FacilityResourceIdentity` / green pitch, blue dressing room.

## HOME / AWAY

`HomeAwaySegmentedControl` — Home + Bus icons (match create, tournament create/edit).

## Participants

| Domain | Adapter |
|--------|---------|
| Training | `TrainingSessionParticipantsPanel` (existing) |
| Match | `loadMatchPlanningParticipants` → squad + participation responses |
| Tournament | Teams in `PlanningParticipantsList`; people via participation when main team season resolves |
| Club event | Section present; canonical roster gap documented |

## Tasks

`ContextRelatedTasksPanel` with canonical `TaskContextType` + entity id (training uses **series** id per registry).

## Requirements

No `Requirement.contextType` — `ContextRelatedRequirementsPanelView` documents gap + link to Anforderungen center.

## Collaboration

`InternalCommentsPanel` + `CommunicationTargetType` TRAINING | MATCH | TOURNAMENT (target resolver extended).

Club events: `CommunicationTargetType` has no CLUB_EVENT — section shows documented gap.

## @mention security

Unchanged COMM-01A/B: tenant-scoped validation, mentions do not grant resource access.

## Authorization

Existing permission gates preserved; panels return null when unauthorized (zero disclosure).

## Schema / migrations

None. STAGE_WRITE=NO for new migrations.

## Known gaps

- Requirement ↔ planning entity typed reference.
- Club event participation roster + CLUB_EVENT communication target.
- Training **create** (series) not fully re-wired to operational stack (session edit + event centers are).

## Tests

`components/admin/shared/planning-editor/__tests__/planning-ux-05-operational.test.ts`
