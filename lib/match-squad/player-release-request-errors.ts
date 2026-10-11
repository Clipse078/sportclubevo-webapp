export class PlayerReleaseRequestError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = "PlayerReleaseRequestError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export class PlayerReleaseRequestForbiddenError extends PlayerReleaseRequestError {
  constructor(message = "Keine Berechtigung für Spieleranfragen.") {
    super("FORBIDDEN", message, 403);
  }
}

export class PlayerReleaseRequestNotFoundError extends PlayerReleaseRequestError {
  constructor(message = "Spieleranfrage nicht gefunden.") {
    super("NOT_FOUND", message, 404);
  }
}

export class PlayerReleaseRequestValidationError extends PlayerReleaseRequestError {
  constructor(message: string, code = "VALIDATION") {
    super(code, message, 422);
  }
}

export class PlayerReleaseRequestConflictError extends PlayerReleaseRequestError {
  constructor(message = "Die Anfrage wurde zwischenzeitlich bearbeitet.") {
    super("CONFLICT", message, 409);
  }
}

export class PlayerReleaseRequestDuplicateError extends PlayerReleaseRequestError {
  constructor(message = "Für diesen Spieler besteht bereits eine offene Anfrage.") {
    super("DUPLICATE_REQUEST", message, 409);
  }
}
