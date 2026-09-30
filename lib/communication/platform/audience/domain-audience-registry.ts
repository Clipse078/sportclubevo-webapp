/**
 * SCE-DOMAIN-AUDIENCE-01 — canonical in-process domain audience source registry.
 *
 * Domain packages register providers at startup; communication resolves via this registry only.
 */

import type {
  DomainAudienceSource,
  DomainAudienceSourceKey,
  DomainAudienceSourceRegistry,
} from "@/lib/communication/platform/audience/domain-audience-source";
import { assertValidDomainAudienceSourceKeyParts } from "@/lib/communication/platform/audience/domain-audience-source";

const registry = new Map<DomainAudienceSourceKey, DomainAudienceSource>();

export function registerDomainAudienceSource(source: DomainAudienceSource): void {
  assertValidDomainAudienceSourceKeyParts(source);
  if (source.key !== `${source.domainKey}.${source.sourceKey}`) {
    throw new Error(
      `Domain audience source key "${source.key}" must equal "{domainKey}.{sourceKey}" (${source.domainKey}.${source.sourceKey}).`,
    );
  }
  if (registry.has(source.key)) {
    throw new Error(`Domain audience source "${source.key}" is already registered.`);
  }
  registry.set(source.key, source);
}

export function getDomainAudienceSourceRegistry(): DomainAudienceSourceRegistry {
  return {
    list: () =>
      [...registry.values()].sort((a, b) => a.key.localeCompare(b.key, "de")),
    get: (key) => registry.get(key) ?? null,
  };
}

/** Test isolation only — do not call in production. */
export function _clearDomainAudienceRegistryForTests(): void {
  registry.clear();
}
