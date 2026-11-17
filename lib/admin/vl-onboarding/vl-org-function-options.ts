/**
 * Organisational function choices for VL PersonAssignment (labels only — no RPERM grants).
 */

import {
  PERSON_FUNCTION_GROUPS,
  PERSON_FUNCTION_LABELS,
  type PersonFunctionKey,
} from "@/lib/people/functions";

export type VlOrgFunctionOption = {
  value: PersonFunctionKey;
  label: string;
};

export const VL_STANDARD_INVITE_ORG_FUNCTION_OPTIONS: readonly VlOrgFunctionOption[] =
  PERSON_FUNCTION_GROUPS.VEREINSLEITUNG.map((value) => ({
    value,
    label: PERSON_FUNCTION_LABELS[value],
  }));

export function isValidVlOrgFunctionKey(key: string): key is PersonFunctionKey {
  return VL_STANDARD_INVITE_ORG_FUNCTION_OPTIONS.some((o) => o.value === key);
}