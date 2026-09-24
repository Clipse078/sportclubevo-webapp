# PLANNING-UX-04 — Unified SCE Event Editors

## Reference implementation

**TRAININGCENTER-UX-03R2** — `/dashboard/training/sessions/[sessionId]/edit`

Accepted product language:

- Compact centered workspace (`max-w-[min(72rem,100%)]`)
- Dark SCE surfaces (`bg-[var(--surface)]/80`, bordered panels)
- Dense IA: header → primary grid → resources → participants
- Progressive resource editing via secondary **Ändern** control
- SCE orange primary save/create only; secondary **fca-button-secondary** for Ändern/navigation

## Route inventory

| Domain | Create | Edit |
|--------|--------|------|
| **Match** | `/dashboard/matchcenter/new` → `MatchCreateForm` (guided steps in `SPIELE_RECORD_WORKSPACE_SURFACE`) | `/dashboard/matchcenter/[matchId]` → `SpieleMatchRecordWorkspace` + `MatchcenterDetailOperational` |
| **Tournament** | `/dashboard/tournamentcenter/new` → `TournamentCreateForm` + `TurniereRecordWorkspaceShell` | `/dashboard/tournamentcenter/[tournamentId]/edit` → `TurniereTournamentRecordWorkspace` |
| **Club event** | `/dashboard/veranstaltungen/new` → `VeranstaltungCreateForm` | `/dashboard/veranstaltungen/[eventId]/edit` → `VeranstaltungEditForm` |
| **Training (reference)** | series create flows (unchanged) | `/dashboard/training/sessions/[sessionId]/edit` |

Legacy generic routes (`/dashboard/events/matches/new`, `/dashboard/events/tournaments/new`) remain; canonical UX is Match/Tournament center.

## Shared presentation layer

Location: `components/admin/shared/planning-editor/`

| Primitive | Role |
|-----------|------|
| `planning-editor-layout.ts` | Canonical width, surface, datetime grid, primary 12-col grid, context rail |
| `PlanningEditorShell` | Top-level compact page wrapper (training + Veranstaltungen) |
| `PlanningEditorHeader` | Back link, single `h1`, optional context line + actions |
| `PlanningEditorSection` | SCE bordered panel with standard padding |
| `PlanningEditorSectionHeading` | Semantic `h2` + optional helper |
| `PlanningEditorActions` | Primary/secondary button row |
| `PlanningEditorProgressiveChangeButton` | Icon + **Ändern** secondary disclosure trigger |
| `PlanningEditorRecordShell` | Breadcrumbs + back + header + optional context rail (Match/Tournament) |

Domain modules re-export layout tokens:

- `training-form-layout.ts` → training aliases
- `spiele-record-layout.ts` / `turniere-record-layout.ts` → match/tournament aliases

**Presentational only** — loaders, mutations, validation, SFV sync, publication defaults, and allocation APIs stay in domain services.

## Domain mapping

### Match

- **Identity**: hero home/away, competition, kickoff, Heim/Auswärts semantic label
- **Resources**: HOME — pitch/hall + dressing rooms via operational PATCH; AWAY — no facility sections
- **Participation**: `ParticipationRequestConfigEditor` on record workspace when configured
- **Participants**: squad/participation via matchcenter detail (canonical model)
- **Publication**: operational toggles; HOME/AWAY Wochenplan defaults unchanged
- **SFV**: read-only locked fields; no weakening of sync semantics

### Tournament

- **Identity**: title, organizer, participating teams, Heim/Auswärts
- **Resources**: HOME allocations + per-participant dressing rooms; progressive pickers in create/edit
- **Participation**: tournament participation-request API where enabled
- **Participants**: `TournamentParticipantAddWorkflow` / participant rows

### Club event (Veranstaltung)

- **Identity**: title (dynamic on create from category), season context on edit
- **Schedule**: compact planning datetime grid; Ganztägig switch preserved
- **Resources**: free-text location (no team pitch allocation model)
- **Participation**: not manufactured — no team roster panel
- **Publication**: `VeranstaltungAusspielungFields` (Website/Homepage/Wochenplan)

## Resources semantics

Reuse `FacilityResourceIdentity` + `semanticResourceColors`:

- Pitch/hall → green pitch glyph
- Dressing room → blue `DoorOpen`
- Progressive disclosure: summary row + `PlanningEditorProgressiveChangeButton` / training allocation **Ändern**

## Authorization & tenancy

Unchanged server gates:

- Match: `EVENTS_VIEW` / `EVENTS_MANAGE` / `MATCHES_DELETE`
- Tournament: `EVENTS_*`, `TOURNAMENTS_DELETE`
- Veranstaltung: `EVENTS_MANAGE` (create), `EVENTS_VIEW|MANAGE` (edit)
- Training: `TRAININGS_VIEW|MANAGE`

All loaders/mutations remain tenant-scoped; UI `canManage` only disables controls.

## i18n

New namespaces:

- `PlanningEditor.common`, `PlanningEditor.match.create`
- `Veranstaltungen.editor.*` (DE/EN/FR/IT)

Training copy remains under `TrainingCenter.sessionEdit`.

## Responsive

- Desktop/laptop: 12-col primary grid (training), record shell max width 72rem
- Context rail from `min-[105rem]` for tasks (match/tournament/veranstaltung edit)
- Narrow: single-column stack, `min-w-0` on grids

## Accessibility

- One `h1` per page via `PlanningEditorHeader` or record hero
- Section `h2` via `PlanningEditorSectionHeading`
- `aria-expanded` on progressive change buttons
- Resource identity not conveyed by colour alone (icon + text)

## Regression coverage

- `components/admin/shared/planning-editor/__tests__/*`
- `VeranstaltungEditorPlanningUx.test.ts`, updated schedule/ausspielung form tests
- `MatchCreatePagePlanningUx.test.ts`
- Existing TrainingCenter session edit contract test (updated for `PlanningEditorSection`)
- Match/Tournament/Training/Wochenplan/dashboard suites re-run in CI

## Database

No schema changes. No migrations.

## Follow-up

Operational workspace convergence (publication at top, shared Teilnehmer/Aufgaben/Zusammenarbeit): **[PLANNING-UX-05](./PLANNING-UX-05-UNIFIED-OPERATIONAL-EVENT-WORKSPACE.md)**.
