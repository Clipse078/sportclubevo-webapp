import {
  MAX_TENANT_OPERATIONAL_DURATION_MINUTES,
  SCE_PLATFORM_DEFAULT_OPERATIONAL_DURATION_MINUTES,
  type OperationalDurationKind,
} from "./defaults";

export class OperationalDurationPolicyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OperationalDurationPolicyValidationError";
  }
}

/** @deprecated Use OperationalDurationPolicyValidationError — kept for SCE-OPS-01A API compat. */
export { OperationalDurationPolicyValidationError as MatchOperationalPolicyValidationError };

export function validateTenantOperationalDurationMinutes(
  value: unknown,
  field = "durationMinutes",
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new OperationalDurationPolicyValidationError(`${field} muss eine Zahl sein.`);
  }
  const rounded = Math.round(value);
  if (rounded <= 0) {
    throw new OperationalDurationPolicyValidationError(`${field} muss grösser als 0 sein.`);
  }
  if (rounded > MAX_TENANT_OPERATIONAL_DURATION_MINUTES) {
    throw new OperationalDurationPolicyValidationError(
      `${field} darf höchstens ${MAX_TENANT_OPERATIONAL_DURATION_MINUTES} Minuten sein.`,
    );
  }
  return rounded;
}

export function resolvePlatformDefaultMinutes(kind: OperationalDurationKind): number {
  return SCE_PLATFORM_DEFAULT_OPERATIONAL_DURATION_MINUTES[kind];
}
