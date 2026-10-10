export class MatchSquadError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = "MatchSquadError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export class MatchSquadNotFoundError extends MatchSquadError {
  constructor(message = "Spiel nicht gefunden.") {
    super("NOT_FOUND", message, 404);
  }
}

export class MatchSquadForbiddenError extends MatchSquadError {
  constructor(message = "Keine Berechtigung für dieses Aufgebot.") {
    super("FORBIDDEN", message, 403);
  }
}

export class MatchSquadValidationError extends MatchSquadError {
  constructor(message: string, code = "VALIDATION") {
    super(code, message, 422);
  }
}

export class MatchSquadConflictError extends MatchSquadError {
  constructor(message = "Das Aufgebot wurde zwischenzeitlich von einer anderen Person geändert.") {
    super("CONFLICT", message, 409);
  }
}

export class MatchSquadReadOnlyError extends MatchSquadError {
  constructor(message = "Für abgesagte Spiele kann das Aufgebot nicht bearbeitet werden.") {
    super("READ_ONLY", message, 422);
  }
}
