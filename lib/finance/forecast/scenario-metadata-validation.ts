export const FINANCE_SCENARIO_NAME_MAX_LENGTH = 120;
export const FINANCE_SCENARIO_DESCRIPTION_MAX_LENGTH = 2000;

export function normalizeFinanceScenarioName(raw: string): string {
  return raw.trim();
}

export function normalizeFinanceScenarioDescription(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

export function assertValidFinanceScenarioName(raw: string): string {
  const name = normalizeFinanceScenarioName(raw);
  if (name.length === 0) {
    throw new Error("FINANCE_SCENARIO_NAME_BLANK");
  }
  if (name.length > FINANCE_SCENARIO_NAME_MAX_LENGTH) {
    throw new Error("FINANCE_SCENARIO_NAME_TOO_LONG");
  }
  return name;
}

export function assertValidFinanceScenarioDescription(
  raw: string | null | undefined,
): string | null {
  const description = normalizeFinanceScenarioDescription(raw);
  if (description != null && description.length > FINANCE_SCENARIO_DESCRIPTION_MAX_LENGTH) {
    throw new Error("FINANCE_SCENARIO_DESCRIPTION_TOO_LONG");
  }
  return description;
}

export function normalizedScenarioNameKey(name: string): string {
  return normalizeFinanceScenarioName(name).toLowerCase();
}
