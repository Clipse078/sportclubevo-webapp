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
  resolveEffectiveScheduleLockDimension,
  resolveFixtureScheduleLocksFromBaseline,
  scheduleLockFromPersistedAssignment,
  toLockedAssignmentsForFeasibility,
  type ResolvedFixtureScheduleLock,
} from "./normalize";
export { validateResolvedScheduleLocks } from "./validate-locks";
