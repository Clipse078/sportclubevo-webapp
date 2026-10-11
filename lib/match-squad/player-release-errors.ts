export class PlayerReleaseError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = "PlayerReleaseError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export class PlayerReleaseForbiddenError extends PlayerReleaseError {
  constructor(message = "Keine Berechtigung für Spielerfreigaben.") {
    super("FORBIDDEN", message, 403);
  }
}

export class PlayerReleaseNotFoundError extends PlayerReleaseError {
  constructor(message = "Spielerfreigabe nicht gefunden.") {
    super("NOT_FOUND", message, 404);
  }
}

export class PlayerReleaseValidationError extends PlayerReleaseError {
  constructor(message: string, code = "VALIDATION") {
    super(code, message, 422);
  }
}

export class PlayerReleaseConflictError extends PlayerReleaseError {
  constructor(message = "Die Freigabe wurde zwischenzeitlich geändert.") {
    super("CONFLICT", message, 409);
  }
}

export class PlayerReleaseOverlapError extends PlayerReleaseError {
  constructor(
    message = "Für dieses Zielteam existiert bereits eine überlappende aktive Freigabe.",
  ) {
    super("OVERLAP", message, 409);
  }
}
