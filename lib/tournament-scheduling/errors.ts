/**
 * SCE-TOURNAMENT-PLANNER-01B — structured tournament scheduling domain errors.
 */

export type TournamentSchedulingErrorCode =
  | "TOURNAMENT_FIXTURE_NOT_FOUND"
  | "TOURNAMENT_FIXTURES_ALREADY_EXIST"
  | "TOURNAMENT_FIXTURE_SET_CONFLICT"
  | "TOURNAMENT_PARTICIPANTS_INSUFFICIENT"
  | "TOURNAMENT_PARTICIPANT_LIMIT_EXCEEDED"
  | "TOURNAMENT_FIXTURE_LIMIT_EXCEEDED"
  | "TOURNAMENT_MEETINGS_PER_OPPONENT_INVALID"
  | "TOURNAMENT_PLANNER_NOT_OWNED_BY_TENANT"
  | "TOURNAMENT_FORMAT_UNSUPPORTED"
  | "TOURNAMENT_GENERATION_INVALID"
  | "TOURNAMENT_SCHEDULE_NOT_FOUND"
  | "TOURNAMENT_SCHEDULE_APPROVED_IMMUTABLE"
  | "TOURNAMENT_ASSIGNMENT_NOT_FOUND"
  | "TOURNAMENT_ASSIGNMENT_DUPLICATE"
  | "TOURNAMENT_PARTICIPANT_INVALID"
  | "TOURNAMENT_RESOURCE_INVALID"
  | "TOURNAMENT_SCHEDULE_WORKING_EXISTS"
  | "SCHEDULE.STALE_VERSION";

export class TournamentSchedulingError extends Error {
  readonly code: TournamentSchedulingErrorCode;

  constructor(code: TournamentSchedulingErrorCode, message: string) {
    super(message);
    this.name = "TournamentSchedulingError";
    this.code = code;
  }
}

export class TournamentFixtureNotFoundError extends TournamentSchedulingError {
  constructor(fixtureId: string) {
    super("TOURNAMENT_FIXTURE_NOT_FOUND", `Tournament fixture not found: ${fixtureId}`);
    this.name = "TournamentFixtureNotFoundError";
  }
}

export class TournamentScheduleNotFoundError extends TournamentSchedulingError {
  constructor(scheduleVersionId: string) {
    super("TOURNAMENT_SCHEDULE_NOT_FOUND", `Tournament schedule version not found: ${scheduleVersionId}`);
    this.name = "TournamentScheduleNotFoundError";
  }
}

export class TournamentScheduleApprovedImmutableError extends TournamentSchedulingError {
  constructor(scheduleVersionId: string) {
    super(
      "TOURNAMENT_SCHEDULE_APPROVED_IMMUTABLE",
      `Approved schedule version "${scheduleVersionId}" cannot be mutated`,
    );
    this.name = "TournamentScheduleApprovedImmutableError";
  }
}

export class TournamentAssignmentNotFoundError extends TournamentSchedulingError {
  constructor(assignmentId: string) {
    super("TOURNAMENT_ASSIGNMENT_NOT_FOUND", `Tournament fixture assignment not found: ${assignmentId}`);
    this.name = "TournamentAssignmentNotFoundError";
  }
}

export class TournamentAssignmentDuplicateError extends TournamentSchedulingError {
  constructor(scheduleVersionId: string, fixtureId: string) {
    super(
      "TOURNAMENT_ASSIGNMENT_DUPLICATE",
      `Fixture "${fixtureId}" is already assigned on schedule version "${scheduleVersionId}"`,
    );
    this.name = "TournamentAssignmentDuplicateError";
  }
}

export class TournamentScheduleParticipantInvalidError extends TournamentSchedulingError {
  constructor(message: string) {
    super("TOURNAMENT_PARTICIPANT_INVALID", message);
    this.name = "TournamentScheduleParticipantInvalidError";
  }
}

export class TournamentScheduleResourceInvalidError extends TournamentSchedulingError {
  constructor(message: string) {
    super("TOURNAMENT_RESOURCE_INVALID", message);
    this.name = "TournamentScheduleResourceInvalidError";
  }
}

export class TournamentScheduleWorkingExistsError extends TournamentSchedulingError {
  constructor(eventId: string) {
    super(
      "TOURNAMENT_SCHEDULE_WORKING_EXISTS",
      `Tournament "${eventId}" already has a WORKING schedule version`,
    );
    this.name = "TournamentScheduleWorkingExistsError";
  }
}

export class TournamentScheduleStaleVersionError extends TournamentSchedulingError {
  constructor(expectedRevision: number, actualRevision: number) {
    super(
      "SCHEDULE.STALE_VERSION",
      `Schedule revision mismatch: expected ${expectedRevision}, actual ${actualRevision}`,
    );
    this.name = "TournamentScheduleStaleVersionError";
  }
}

export class TournamentFixturesAlreadyExistError extends TournamentSchedulingError {
  constructor(tournamentId: string, message?: string) {
    super(
      "TOURNAMENT_FIXTURES_ALREADY_EXIST",
      message ??
        `Tournament "${tournamentId}" already has fixtures that cannot be replaced automatically`,
    );
    this.name = "TournamentFixturesAlreadyExistError";
  }
}

export class TournamentFixtureSetConflictError extends TournamentSchedulingError {
  constructor(message: string) {
    super("TOURNAMENT_FIXTURE_SET_CONFLICT", message);
    this.name = "TournamentFixtureSetConflictError";
  }
}

export class TournamentParticipantsInsufficientError extends TournamentSchedulingError {
  constructor(message: string) {
    super("TOURNAMENT_PARTICIPANTS_INSUFFICIENT", message);
    this.name = "TournamentParticipantsInsufficientError";
  }
}

export class TournamentParticipantLimitExceededError extends TournamentSchedulingError {
  constructor(message: string) {
    super("TOURNAMENT_PARTICIPANT_LIMIT_EXCEEDED", message);
    this.name = "TournamentParticipantLimitExceededError";
  }
}

export class TournamentFormatUnsupportedError extends TournamentSchedulingError {
  constructor(message: string) {
    super("TOURNAMENT_FORMAT_UNSUPPORTED", message);
    this.name = "TournamentFormatUnsupportedError";
  }
}

export class TournamentGenerationInvalidError extends TournamentSchedulingError {
  constructor(message: string) {
    super("TOURNAMENT_GENERATION_INVALID", message);
    this.name = "TournamentGenerationInvalidError";
  }
}

export class TournamentFixtureLimitExceededError extends TournamentSchedulingError {
  constructor(message: string) {
    super("TOURNAMENT_FIXTURE_LIMIT_EXCEEDED", message);
    this.name = "TournamentFixtureLimitExceededError";
  }
}

export class TournamentMeetingsPerOpponentInvalidError extends TournamentSchedulingError {
  constructor(message: string) {
    super("TOURNAMENT_MEETINGS_PER_OPPONENT_INVALID", message);
    this.name = "TournamentMeetingsPerOpponentInvalidError";
  }
}

export class TournamentPlannerNotOwnedByTenantError extends TournamentSchedulingError {
  constructor(tournamentId: string) {
    super(
      "TOURNAMENT_PLANNER_NOT_OWNED_BY_TENANT",
      `Tournament "${tournamentId}" is not organised by the current tenant; fixture generation is not available`,
    );
    this.name = "TournamentPlannerNotOwnedByTenantError";
  }
}
