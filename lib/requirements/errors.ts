export class RequirementNotFoundError extends Error {
  constructor(requirementId?: string) {
    super(requirementId ? `Requirement not found: ${requirementId}` : "Requirement not found");
    this.name = "RequirementNotFoundError";
  }
}

export class RequirementRecipientNotFoundError extends Error {
  constructor(recipientId?: string) {
    super(
      recipientId ? `Requirement recipient not found: ${recipientId}` : "Requirement recipient not found",
    );
    this.name = "RequirementRecipientNotFoundError";
  }
}

export class RequirementForbiddenError extends Error {
  constructor(message = "Not authorized for this requirement") {
    super(message);
    this.name = "RequirementForbiddenError";
  }
}

export class RequirementValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequirementValidationError";
  }
}

export class RequirementTenantMismatchError extends Error {
  constructor(message = "Tenant mismatch") {
    super(message);
    this.name = "RequirementTenantMismatchError";
  }
}
