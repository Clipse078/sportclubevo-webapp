# PLANNING-UX-05R2 — Visual Refinement (Operational Planning Language)

Builds on [PLANNING-UX-04](./PLANNING-UX-04-UNIFIED-EVENT-EDITORS.md) and [PLANNING-UX-05](./PLANNING-UX-05-UNIFIED-OPERATIONAL-EVENT-WORKSPACE.md) (ported to STAGE without PLANNING-UX-05R1 schema work).

## Mission

Consolidated world-class UX refinement across **Trainings**, **Spiele**, **Turniere**, and **Veranstaltungen** with a shared operational planning language, denser forms, and compact resource selection.

## Visual language

| Element | Semantics |
|---------|-----------|
| Pitch / hall resources | Green line glyph (`FacilityResourceGlyph` / `RESOURCE_SEMANTIC_PITCH_ICON_CLASS`) |
| Dressing rooms | Blue `DoorOpen` / `RESOURCE_SEMANTIC_DRESSING_ICON_CLASS` |
| Primary actions & active focus | SCE orange (`--sce-primary`) on selection ring and check affordance |
| Surfaces | `planning-editor-layout.ts` tokens — 72rem workspace, bordered SCE panels |

**Operational selectors** use `CompactOperationalResourceSelector` (chip grid, 1–3 columns). **Wochenplaner** keeps `VisualResourceAvailabilityPicker` / `PitchVisual` for spatial calendar context.

## Domains

| Domain | Create | Edit | Resource UX |
|--------|--------|------|-------------|
| Training | `/dashboard/training/new` | `/dashboard/training/sessions/[sessionId]/edit` | Compact pickers on create; session allocation uses progressive `FacilityResourceSelector` |
| Match | `/dashboard/matchcenter/new` | `/dashboard/matchcenter/[matchId]` | Compact pickers; publication control bar at top |
| Tournament | `/dashboard/tournamentcenter/new` | `/dashboard/tournamentcenter/[tournamentId]/edit` | Compact pickers for pitch + participant dressing rooms |
| Club event | `/dashboard/veranstaltungen/new` | `/dashboard/veranstaltungen/[eventId]/edit` | Text location; shared publication + deferred work/collaboration sections |

Density reference: **Match record** (`SpieleMatchRecordWorkspace` + `MatchcenterDetailOperational`).

## Shared primitives

- `components/admin/shared/planning-editor/*` — shell, sections, publication switches, pre-persist Aufgaben/Anforderungen/Zusammenarbeit notices
- `components/admin/shared/planning/CompactOperationalResourceSelector.tsx` — operational resource chips
- `lib/planning/planning-publication-channels.ts` — channel definitions for switch-based publication

## Authorization & business rules

Unchanged server gates (`EVENTS_*`, `TRAININGS_*`, `TOURNAMENTS_*`, planning authorization policy, availability-service semantics, match HOME/AWAY allocation rules, SFV sync read-only fields).

## SFV HOME Wochenplan regression

UI-only change — publication defaults and repair policy unchanged:

- `lib/publishing/policy/match-publication-defaults.ts`
- `lib/publishing/policy/match-wochenplan-repair-policy.ts`
- Test: `lib/planning/__tests__/planning-ux-05r2-sfv-wochenplan-regression.test.ts`

## Database

**SCHEMA_CHANGE=NO · MIGRATION=NO · STAGE_DB_WRITE=NO**

## Tests

- `components/admin/shared/planning/__tests__/CompactOperationalResourceSelector.test.tsx`
- `components/admin/shared/planning-editor/__tests__/planning-ux-05-operational.test.ts`
- Existing Match/Tournament/Veranstaltung planning UX tests (updated expectations)

## Verdict

**PLANNING-UX-05R2 PASS** — TRAINING, MATCH, TOURNAMENT AND EVENT NOW SHARE A COHERENT OPERATIONAL PLANNING LANGUAGE — RESOURCE SELECTION STANDARDIZED WITH COMPACT GREEN PITCH/HALL AND BLUE DRESSING-ROOM SEMANTICS — FORM DENSITY AND DESKTOP SPACE USAGE IMPROVED — PUBLICATION AND DEFERRED SECTIONS CONSOLIDATED — EXISTING PLANNING, AUTHORIZATION, AVAILABILITY AND PUBLICATION RULES PRESERVED
