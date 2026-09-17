import {
  MAX_TENANT_MATCH_DURATION_MINUTES,
  SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES,
} from "./defaults";

export class MatchOperationalPolicyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchOperationalPolicyValidationError";
  }
}

export function validateTenantMatchDurationMinutes(
  value: unknown,
  field = "defaultMatchDurationMinutes",
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new MatchOperationalPolicyValidationError(`${field} muss eine Zahl sein.`);
  }
  const rounded = Math.round(value);
  if (rounded <= 0) {
    throw new MatchOperationalPolicyValidationError(`${field} muss grösser als 0 sein.`);
  }
  if (rounded > MAX_TENANT_MATCH_DURATION_MINUTES) {
    throw new MatchOperationalPolicyValidationError(
      `${field} darf höchstens ${MAX_TENANT_MATCH_DURATION_MINUTES} Minuten sein.`,
    );
  }
  return rounded;
}

export function resolveEffectiveTenantMatchDurationMinutes(
  configuredMinutes: number | null | undefined,
): number {
  if (configuredMinutes == null) {
    return SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES;
  }
  return configuredMinutes;
}
