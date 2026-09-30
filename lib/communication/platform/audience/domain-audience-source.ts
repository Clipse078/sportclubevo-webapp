/**
 * SCE-DOMAIN-AUDIENCE-01 — domain audience provider contract (extends ZIELGRUPPEN-02 seam).
 *
 * Domain modules (Probetraining, events, …) register {@link DomainAudienceSource} providers.
 * They describe/select audiences; COMM-03 remains the sole Person recipient engine.
 */

import type { PermissionKey } from "@/lib/permissions/permissions";
import type { ZielgruppeAudienceComponent } from "@/lib/communication/platform/audience/zielgruppe-definition";

/** Stable composite key `{domainKey}.{sourceKey}` (machine id, not user-facing). */
export type DomainAudienceSourceKey = string;

export type DomainAudienceCandidate = {
  sourceKey: DomainAudienceSourceKey;
  candidateId: string;
  label: string;
  description?: string | null;
};

export type DomainAudienceDiscoveryContext = {
  tenantId: string;
  userId: string;
  permissionKeys: ReadonlySet<string>;
};

export type DomainAudienceSource = {
  /** Stable composite key — must equal `{domainKey}.{sourceKey}`. */
  key: DomainAudienceSourceKey;
  domainKey: string;
  sourceKey: string;
  /** German human-readable source label (e.g. «Offene Anmeldungen»). */
  label: string;
  description?: string;
  /**
   * Permissions required to discover or materialize this source (any-of).
   * Communication send permission alone is insufficient when domain permissions are listed.
   */
  requiredPermissions: PermissionKey[];
  /** Optional override; default requires any of {@link requiredPermissions}. */
  canDiscover?(ctx: DomainAudienceDiscoveryContext): boolean | Promise<boolean>;
  searchCandidates(input: {
    tenantId: string;
    senderUserId: string;
    query: string;
    limit: number;
  }): Promise<DomainAudienceCandidate[]>;
  /**
   * Synchronous mapping for static candidates (compose-time / tests).
   * For dynamic resolution at send/preview time, implement {@link resolveAudienceComponent}.
   */
  toAudienceComponent(candidateId: string): ZielgruppeAudienceComponent;
  /**
   * Optional async expansion when audience membership depends on live domain state.
   * When absent, {@link toAudienceComponent} is used during materialization.
   */
  resolveAudienceComponent?(input: {
    tenantId: string;
    senderUserId: string;
    candidateId: string;
  }): Promise<ZielgruppeAudienceComponent>;
  /** Human-readable provenance line for preview (e.g. «Probetraining – Offene Anmeldungen»). */
  provenanceLabel(candidateId: string): string;
};

export type DomainAudienceSourceRegistry = {
  list(): DomainAudienceSource[];
  get(key: DomainAudienceSourceKey): DomainAudienceSource | null;
};

const DOMAIN_KEY_PATTERN = /^[a-z][a-z0-9-]*$/;
const SOURCE_KEY_PATTERN = /^[a-z][a-z0-9-]*$/;

export function assertValidDomainAudienceSourceKeyParts(source: Pick<
  DomainAudienceSource,
  "key" | "domainKey" | "sourceKey"
>): void {
  if (!DOMAIN_KEY_PATTERN.test(source.domainKey)) {
    throw new Error(`Invalid domainKey "${source.domainKey}" for domain audience source.`);
  }
  if (!SOURCE_KEY_PATTERN.test(source.sourceKey)) {
    throw new Error(`Invalid sourceKey "${source.sourceKey}" for domain audience source.`);
  }
  if (!source.key.trim()) {
    throw new Error("Domain audience source key must be non-empty.");
  }
}

/** Isolated empty registry for unit tests (does not use the process singleton). */
export function createEmptyDomainAudienceSourceRegistry(): DomainAudienceSourceRegistry {
  return {
    list: () => [],
    get: () => null,
  };
}
