/**
 * SCE-DOMAIN-OPERATIONAL-ATTENTION-01 — deterministic registry identity for operational attention sources.
 */

import type { DomainOperationalAttentionSource } from "./types";

export type OperationalAttentionSourceRegistryKey = string;

export function buildOperationalAttentionSourceRegistryKey(
  source: Pick<DomainOperationalAttentionSource, "domainKey"> & {
    attentionKind: string;
  },
): OperationalAttentionSourceRegistryKey {
  const domainKey = source.domainKey.trim();
  const attentionKind = source.attentionKind.trim();
  if (!domainKey || !attentionKind) {
    throw new Error("Operational attention source registry key requires domainKey and attentionKind.");
  }
  return `${domainKey}:${attentionKind}`;
}
