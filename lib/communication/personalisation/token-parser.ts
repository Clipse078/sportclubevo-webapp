/**
 * SCE-COMM-EVO-06 — safe `<token>` parser (registered fields only at render time).
 */

import type {
  PersonalisationMissingPolicyMode,
  PersonalisationTokenOccurrence,
} from "@/lib/communication/personalisation/types";
import { getPersonalisationFieldDefinition } from "@/lib/communication/personalisation/field-registry";

const TOKEN_PATTERN = /<([a-z][a-z0-9_]*)(?:\|([^>]*))?>/gi;

function parseMissingPolicy(
  modifiers: string | undefined,
  fieldDefault: PersonalisationMissingPolicyMode,
): { policy: PersonalisationMissingPolicyMode; fallback: string | null } {
  if (!modifiers?.trim()) {
    return { policy: fieldDefault, fallback: null };
  }
  let policy = fieldDefault;
  let fallback: string | null = null;
  for (const part of modifiers.split("|")) {
    const trimmed = part.trim();
    const fallbackMatch = trimmed.match(/^fallback="([^"]*)"$/i);
    if (fallbackMatch) {
      fallback = fallbackMatch[1] ?? "";
      policy = "REPLACEMENT";
      continue;
    }
    const policyMatch = trimmed.match(/^policy=(blank|replacement|block)$/i);
    if (policyMatch) {
      const raw = policyMatch[1]!.toUpperCase();
      if (raw === "BLANK") policy = "BLANK";
      else if (raw === "REPLACEMENT") policy = "REPLACEMENT";
      else if (raw === "BLOCK") policy = "BLOCK_SEND";
    }
  }
  return { policy, fallback };
}

export function extractPersonalisationTokens(template: string): PersonalisationTokenOccurrence[] {
  const occurrences: PersonalisationTokenOccurrence[] = [];
  if (!template) return occurrences;
  let match: RegExpExecArray | null;
  const re = new RegExp(TOKEN_PATTERN.source, TOKEN_PATTERN.flags);
  while ((match = re.exec(template)) !== null) {
    const key = match[1]!;
    const def = getPersonalisationFieldDefinition(key);
    const { policy, fallback } = parseMissingPolicy(
      match[2],
      def?.defaultMissingPolicy ?? "BLANK",
    );
    occurrences.push({
      raw: match[0],
      key,
      start: match.index,
      end: match.index + match[0].length,
      missingPolicy: policy,
      fallbackReplacement: fallback,
    });
  }
  return occurrences;
}

export function extractUnknownPersonalisationKeys(template: string): string[] {
  const keys = extractPersonalisationTokens(template);
  const unknown = keys.filter((k) => !getPersonalisationFieldDefinition(k.key)).map((k) => k.key);
  return [...new Set(unknown)];
}
