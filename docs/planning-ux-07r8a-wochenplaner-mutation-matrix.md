# PLANNING-UX-07R8A — Wochenplaner mutation matrix

Standardplan = `activePlanId === null` (canonical entity writes).  
Alternativplan = sparse `WeekplannerPlanAllocation` / `WeekplannerPlanActivityOverride` only.

| Activity | Plan | Date/time write target | Pitch/hall write target | Dressing write target | Editable in Wochenplaner |
| --- | --- | --- | --- | --- | --- |
| Training | Standard | `PATCH /api/training-sessions/[id]/reschedule` | session allocations API | session allocations API | yes |
| Training | Alternative | `PUT/DELETE …/time-overrides` | `POST/DELETE …/allocations` | `POST/DELETE …/allocations` | yes |
| Match | Standard | Manual: `PATCH /api/matchcenter/[id]` (`startAt`/`endAt`); SFV: `PATCH /api/events/[id]/operational-end` only | `PATCH /api/matchcenter/[id]` (`pitchCode`) | `PATCH /api/matchcenter/[id]` (home/away codes) | yes (SFV kickoff read-only) |
| Match | Alternative | `PUT/DELETE …/time-overrides` | plan allocations (`PITCH_HALL`) | plan allocations (`DRESSING_ROOM`, home only) | yes |
| Tournament | Standard | `PATCH /api/tournaments/[id]` (`startAt`/`endAt`) | tournament resource-allocations API | participant dressing-room-allocations API | yes |
| Tournament | Alternative | `PUT/DELETE …/time-overrides` | plan allocations (`PITCH_HALL`) | plan allocations per `participantId` | yes (pitch/time); participant dressing via canonical panel read-only in alt plan UI where overrides exist |
| Veranstaltung | Standard | `PATCH /api/events/[id]` (club event schedule) | `POST/DELETE …/facility-allocations` | same | yes |
| Veranstaltung | Alternative | _not supported_ (`toWeekplannerPlanActivityType` → null) | _not supported_ | _not supported_ | open record / standard plan only |

Occupancy (Belegungszeit Garderobe) for Training/Match/Tournament on Standardplan uses persisted event/session occupancy services (`DressingRoomOccupancyEditor`). Alternative plan encodes occupancy on plan allocation rows.
