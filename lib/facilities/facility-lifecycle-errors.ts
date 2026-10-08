/**
 * SCE-PLANNER-UX-08-08A — canonical facility/resource lifecycle domain errors.
 */

export const FACILITY_LIFECYCLE_ERROR_CODES = {
  RESOURCE_IN_USE: "RESOURCE_IN_USE",
  FACILITY_IN_USE: "FACILITY_IN_USE",
  DUPLICATE_RESOURCE: "DUPLICATE_RESOURCE",
} as const;

export type FacilityLifecycleErrorCode =
  (typeof FACILITY_LIFECYCLE_ERROR_CODES)[keyof typeof FACILITY_LIFECYCLE_ERROR_CODES];

export class FacilityLifecycleError extends Error {
  readonly code: FacilityLifecycleErrorCode;

  constructor(code: FacilityLifecycleErrorCode, message: string) {
    super(message);
    this.name = "FacilityLifecycleError";
    this.code = code;
  }
}

export const FACILITY_LIFECYCLE_MESSAGES = {
  resourceInUse:
    "Diese Ressource wird bereits verwendet und kann nicht gelöscht werden. Deaktiviere sie stattdessen.",
  facilityInUse:
    "Diese Anlage oder ihre Ressourcen werden bereits verwendet und können nicht gelöscht werden. Deaktiviere sie stattdessen.",
  duplicateResourceCode:
    "Eine Ressource mit diesem Code existiert in diesem Mandanten bereits.",
  duplicateFacilityIdentity:
    "Eine Anlage mit diesem Namen und Typ existiert in diesem Mandanten bereits.",
} as const;

export function isFacilityLifecycleError(error: unknown): error is FacilityLifecycleError {
  return error instanceof FacilityLifecycleError;
}

export function isPrismaForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2003"
  );
}
