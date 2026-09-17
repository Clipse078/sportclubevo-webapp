import {
  validateTenantOperationalDurationMinutes,
  OperationalDurationPolicyValidationError,
  MatchOperationalPolicyValidationError,
} from "@/lib/operational/validation";
import { SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES } from "./defaults";

export { MatchOperationalPolicyValidationError, OperationalDurationPolicyValidationError };

export function validateTenantMatchDurationMinutes(
  value: unknown,
  field = "defaultMatchDurationMinutes",
): number {
  return validateTenantOperationalDurationMinutes(value, field);
}

export function resolveEffectiveTenantMatchDurationMinutes(
  configuredMinutes: number | null | undefined,
): number {
  if (configuredMinutes == null) {
    return SCE_PLATFORM_DEFAULT_MATCH_DURATION_MINUTES;
  }
  return configuredMinutes;
}
