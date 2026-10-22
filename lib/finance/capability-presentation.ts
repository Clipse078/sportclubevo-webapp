import type { FinanceCapabilityKey } from "@/lib/finance/finance-architecture";
import { FINANCE_CAPABILITY_KEYS } from "@/lib/finance/finance-architecture";

/** i18n keys under the Finance namespace — labels/descriptions stay localization-ready. */
export type FinanceCapabilityPresentation = {
  key: FinanceCapabilityKey;
  labelKey: `capabilities.${FinanceCapabilityKey}`;
  descriptionKey: `capabilityDescriptions.${FinanceCapabilityKey}`;
  starterRecommended: boolean;
};

const STARTER_RECOMMENDED = new Set<FinanceCapabilityKey>([
  "OVERVIEW",
  "BUDGETING",
  "ACTUALS",
]);

function presentationFor(key: FinanceCapabilityKey): FinanceCapabilityPresentation {
  return {
    key,
    labelKey: `capabilities.${key}`,
    descriptionKey: `capabilityDescriptions.${key}`,
    starterRecommended: STARTER_RECOMMENDED.has(key),
  };
}

/** UX guidance only — does not auto-enable capabilities or change tenant defaults. */
export const FINANCE_STARTER_RECOMMENDED_CAPABILITY_KEYS: readonly FinanceCapabilityKey[] =
  FINANCE_CAPABILITY_KEYS.filter((key) => STARTER_RECOMMENDED.has(key));

export const FINANCE_CAPABILITY_PRESENTATION: Record<
  FinanceCapabilityKey,
  FinanceCapabilityPresentation
> = Object.fromEntries(
  FINANCE_CAPABILITY_KEYS.map((key) => [key, presentationFor(key)]),
) as Record<FinanceCapabilityKey, FinanceCapabilityPresentation>;

export const FINANCE_CAPABILITY_PRESENTATION_ORDER: readonly FinanceCapabilityPresentation[] =
  FINANCE_CAPABILITY_KEYS.map((key) => FINANCE_CAPABILITY_PRESENTATION[key]);

export function getFinanceCapabilityPresentation(
  key: FinanceCapabilityKey,
): FinanceCapabilityPresentation {
  return FINANCE_CAPABILITY_PRESENTATION[key];
}
