import type { PersonalisationMissingPolicyMode } from "@/lib/communication/personalisation/types";

export function buildPersonalisationToken(input: {
  key: string;
  missingPolicy: PersonalisationMissingPolicyMode;
  fallbackText?: string;
  defaultMissingPolicy: PersonalisationMissingPolicyMode;
}): string {
  const { key, missingPolicy, fallbackText, defaultMissingPolicy } = input;
  if (missingPolicy === "REPLACEMENT") {
    const text = (fallbackText ?? "").replace(/"/g, "");
    return `<${key}|fallback="${text}">`;
  }
  if (missingPolicy === defaultMissingPolicy) {
    return `<${key}>`;
  }
  if (missingPolicy === "BLANK") {
    return `<${key}|policy=blank>`;
  }
  return `<${key}|policy=block>`;
}
