# SCE-MTG-PEND-01 — Schema-dependent follow-up gaps

## Already supported without migration

- Unified **Pendenzen** view from `MeetingAction` (Massnahmen) and `Task` (`contextType = MEETING` / `MEETING_DECISION`).
- Canonical aggregation via `loadMeetingPendenzenSnapshot` / `GET /api/meetings/[id]/pendenzen` (permission-filtered tasks + meeting Massnahmen).
- Dedupe key: `massnahme:{id}` / `aufgabe:{id}` — one row per source record (no inferred Task↔Massnahme equivalence).
- Overdue derived from deadline + non-terminal status (not persisted).
- Tab badge, status bar, open/alle filters, and protocol follow-up summary use the same merge + `countOpenPendenzen`.
- Carry-forward of open agenda topics (`sourceAgendaItemId`) and meeting-scoped tasks (context reassignment, no duplicate Task row).
- **Preparation discovery** of open Massnahmen from prior meetings (`ACTION_OPEN` in carry-forward list) within actor visibility scope (not tenant-wide).
- Protocol export: open Massnahmen/Aufgaben of **this** meeting with live status at export time; technical carry-forward markers stripped from agenda notes in print output.

## Unsupported (requires additive migration)

| Gap | Proposed model | Purpose |
|-----|----------------|---------|
| Durable cross-meeting Pendenz review | `MeetingCommitmentReview` | Link `targetMeetingId` → `sourceActionId` / `sourceTaskId`, optional `reviewOutcome`, without cloning records |
| Formal Sitzungsleitung / Protokollführung | `Meeting.chairPersonId`, `Meeting.minuteTakerPersonId` | Structured protocol metadata |
| Dedicated agenda background (non-initiative) | `MeetingAgendaItem.background` | Separate from `notes` (protocol) and initiative text |
| Series-scoped carry-forward | `Meeting.seriesId` or committee FK | Limit open Pendenz search to related meetings instead of visibility-scoped last 50 |

### `MeetingCommitmentReview` (draft migration — do not run in STAGE prep)

See `docs/roadmap/proposals/SCE-MTG-PEND-01-meeting-commitment-review.proposed.prisma`.

Compatibility: existing carry-forward and Pendenzen UI remain; reviews backfill optional. Until migration ships, `ACTION_OPEN` selections are **discovery-only** (apply is a no-op).

## Approval integrity (unchanged)

Protocol content hash still excludes rationale, Massnahme details, and Aufgaben live state. Document footnote in print export describes the limitation.

## Related documentation

- **SCE-CD-03R4** decision/action fields: `docs/roadmap/SCE-CD-03R4-DECISION-ACTION-DOCUMENTATION.md` supersedes the assessment-only PR #967 proposal.
