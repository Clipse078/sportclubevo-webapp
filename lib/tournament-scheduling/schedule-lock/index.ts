export type {
  ScheduleLockConflictCategory,
  ScheduleLockConflictDiagnostic,
  ScheduleLockValidationResult,
  TournamentFixtureScheduleLock,
  TournamentFixtureScheduleLockDimension,
} from "./types";
export {
  fixtureAllowsSlot,
  isFixtureFullyLockedInState,
  mergeScheduleLocks,
  resolveFixtureScheduleLocksFromBaseline,
  toLockedAssignmentsForFeasibility,
  type ResolvedFixtureScheduleLock,
} from "./normalize";
export { validateResolvedScheduleLocks } from "./validate-locks";
