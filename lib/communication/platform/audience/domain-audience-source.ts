/**
 * SCE-ZIELGRUPPEN-02 — extension seam for DOMAIN-AUDIENCE-01 (not implemented here).
 *
 * Domain modules (Probetraining, events, camps, …) register providers that expose
 * searchable candidates and map to Communication audience components at compose time.
 */

export type DomainAudienceSourceKey = string;

export type DomainAudienceCandidate = {
  sourceKey: DomainAudienceSourceKey;
  candidateId: string;
  label: string;
  description?: string | null;
};

export type DomainAudienceSource = {
  key: DomainAudienceSourceKey;
  label: string;
  searchCandidates(input: {
    tenantId: string;
    senderUserId: string;
    query: string;
    limit: number;
  }): Promise<DomainAudienceCandidate[]>;
  /** Maps a selected candidate into a CommunicationAudienceSpec component fragment. */
  toAudienceComponent(candidateId: string): import("@/lib/communication/platform/audience/zielgruppe-definition").ZielgruppeAudienceComponent;
  /** Human-readable provenance line for preview (e.g. «Probetraining Anmeldung»). */
  provenanceLabel(candidateId: string): string;
};

export type DomainAudienceSourceRegistry = {
  list(): DomainAudienceSource[];
  get(key: DomainAudienceSourceKey): DomainAudienceSource | null;
};

/** Empty registry until DOMAIN-AUDIENCE-01 registers providers. */
export function createEmptyDomainAudienceSourceRegistry(): DomainAudienceSourceRegistry {
  return {
    list: () => [],
    get: () => null,
  };
}
