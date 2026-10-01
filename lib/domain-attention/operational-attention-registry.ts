/**
 * SCE-DOMAIN-OPERATIONAL-ATTENTION-01 — in-process registry for DomainOperationalAttentionSource.
 */

import type { DomainOperationalAttentionSource } from "./types";
import {
  buildOperationalAttentionSourceRegistryKey,
  type OperationalAttentionSourceRegistryKey,
} from "./operational-attention-source-id";

type RegisteredOperationalAttentionSource = {
  source: DomainOperationalAttentionSource;
  attentionKind: string;
};

const registry = new Map<OperationalAttentionSourceRegistryKey, RegisteredOperationalAttentionSource>();

export function registerDomainOperationalAttentionSource(
  source: DomainOperationalAttentionSource,
  attentionKind: string,
): void {
  const key = buildOperationalAttentionSourceRegistryKey({ domainKey: source.domainKey, attentionKind });
  if (registry.has(key)) {
    throw new Error(`Domain operational attention source "${key}" is already registered.`);
  }
  registry.set(key, { source, attentionKind });
}

export function listRegisteredDomainOperationalAttentionSources(): DomainOperationalAttentionSource[] {
  return [...registry.values()]
    .sort((a, b) =>
      buildOperationalAttentionSourceRegistryKey({
        domainKey: a.source.domainKey,
        attentionKind: a.attentionKind,
      }).localeCompare(
        buildOperationalAttentionSourceRegistryKey({
          domainKey: b.source.domainKey,
          attentionKind: b.attentionKind,
        }),
        "de",
      ),
    )
    .map((entry) => entry.source);
}

export function getDomainOperationalAttentionSource(
  key: OperationalAttentionSourceRegistryKey,
): DomainOperationalAttentionSource | null {
  return registry.get(key)?.source ?? null;
}

/** Test isolation only — do not call in production. */
export function _clearDomainOperationalAttentionRegistryForTests(): void {
  registry.clear();
}
