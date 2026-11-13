# SCE-MTG-PEND-01 — Schema-dependent follow-up gaps

## Already supported without migration

- Unified **Pendenzen** view from `MeetingAction` (Massnahmen) and `Task` (`contextType = MEETING` / `MEETING_DECISION`).
- Dedupe key: `massnahme:{id}` / `aufgabe:{id}` — one row per source record.
- Overdue derived from deadline + non-terminal status (not persisted).
- Carry-forward of open agenda topics (`sourceAgendaItemId`) and meeting-scoped tasks (context reassignment).
- Carry-forward review items for open **Massnahmen** from prior meetings: creates a Traktandum with `notes` referencing `MeetingAction/{id}` (no duplicate action row).
- Protocol export: open Massnahmen/Aufgaben of **this** meeting with live status at export time.

## Unsupported (requires additive migration)

| Gap | Proposed model | Purpose |
|-----|----------------|---------|
| Durable cross-meeting Pendenz review | `MeetingCommitmentReview` | Link `targetMeetingId` → `sourceActionId` / `sourceTaskId`, optional `reviewOutcome`, without cloning records |
| Formal Sitzungsleitung / Protokollführung | `Meeting.chairPersonId`, `Meeting.minuteTakerPersonId` | Structured protocol metadata |
| Dedicated agenda background (non-initiative) | `MeetingAgendaItem.background` | Separate from `notes` (protocol) and initiative text |
| Series-scoped carry-forward | `Meeting.seriesId` or committee FK | Limit open Pendenz search to related meetings instead of visibility-scoped last 50 |

### `MeetingCommitmentReview` (draft migration)

```sql
CREATE TYPE "MeetingCommitmentSourceKind" AS ENUM ('MASSNAHME', 'AUFGABE');

CREATE TABLE "MeetingCommitmentReview" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "targetMeetingId" TEXT NOT NULL,
  "sourceKind" "MeetingCommitmentSourceKind" NOT NULL,
  "sourceActionId" TEXT,
  "sourceTaskId" TEXT,
  "reviewOutcome" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" TEXT,
  CONSTRAINT "MeetingCommitmentReview_pkey" PRIMARY KEY ("id")
);
```

Compatibility: existing carry-forward and Pendenzen UI remain; reviews backfill optional.

## Approval integrity (unchanged)

Protocol content hash still excludes rationale, Massnahme details, and Aufgaben live state. Document footnote in print export describes the limitation.
