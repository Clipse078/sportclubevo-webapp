/**
 * TRAININGS-UX-02A — canonical training duration defaults for create flows.
 *
 * Duration minutes must come from getTenantOperationalDurationPolicy (server);
 * this module only derives start/end wall-clock defaults from that value.
 */

import {
  addMinutesToTrainingWallClockTime,
  DEFAULT_TRAINING_WALL_CLOCK_START,
} from "./training-schedule-presentation";

export function defaultTrainingCreateEndTime(durationMinutes: number): string {
  const end = addMinutesToTrainingWallClockTime(DEFAULT_TRAINING_WALL_CLOCK_START, durationMinutes);
  if (!end) {
    throw new Error(`Invalid training create default for duration ${durationMinutes}`);
  }
  return end;
}

export function defaultNewTrainingSlotTimes(durationMinutes: number): {
  startsAt: string;
  endsAt: string;
} {
  return {
    startsAt: DEFAULT_TRAINING_WALL_CLOCK_START,
    endsAt: defaultTrainingCreateEndTime(durationMinutes),
  };
}
