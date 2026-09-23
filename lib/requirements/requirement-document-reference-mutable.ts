import { RequirementStatus } from "@prisma/client";
import { RequirementValidationError } from "./errors";

/** Canonical WORKSPACE-07 / AUFGABEN-06G reference mutation gate (DRAFT + ACTIVE mutable). */
export function assertRequirementReferenceMutable(status: RequirementStatus): void {
  if (status === "CLOSED" || status === "CANCELLED") {
    throw new RequirementValidationError("Requirement is read-only");
  }
}
