export class TeamCommunicationForbiddenError extends Error {
  constructor(message = "Team communication access denied") {
    super(message);
    this.name = "TeamCommunicationForbiddenError";
  }
}

export class TeamCommunicationNotFoundError extends Error {
  constructor(message = "Team communication not found") {
    super(message);
    this.name = "TeamCommunicationNotFoundError";
  }
}

export class TeamCommunicationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamCommunicationValidationError";
  }
}

export class TeamCommunicationTenantMismatchError extends Error {
  constructor(message = "Tenant mismatch") {
    super(message);
    this.name = "TeamCommunicationTenantMismatchError";
  }
}
