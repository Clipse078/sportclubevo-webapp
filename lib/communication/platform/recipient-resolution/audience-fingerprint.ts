/**
 * SCE-COMM-03 — deterministic audience definition fingerprint.
 */

import { createHash } from "node:crypto";
import type { CommunicationAudienceSpec } from "@/lib/communication/platform/audience/zielgruppe-definition";

function stableSerialize(value: unknown): string {
  if (value == null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(obj[k])}`).join(",")}}`;
}

export function computeAudienceFingerprint(audience: CommunicationAudienceSpec): string {
  const payload = stableSerialize(audience);
  return createHash("sha256").update(payload).digest("hex");
}
