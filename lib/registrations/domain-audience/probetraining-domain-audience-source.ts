/**
 * SCE-PROBETRAINING-COMM-01 — DomainAudienceSource for Probetraining (Registration type PROBETRAINING).
 */

import type { DomainAudienceSource } from "@/lib/communication/platform/audience/domain-audience-source";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import {
  getProbetrainingAudienceCandidateDefinition,
  PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY,
  PROBETRAINING_ANMELDUNGEN_SOURCE_KEY,
  PROBETRAINING_DOMAIN_KEY,
  probetrainingAudienceProvenanceLabel,
  searchProbetrainingAudienceCandidateDefinitions,
} from "@/lib/registrations/domain-audience/probetraining-audience-candidates";
import {
  loadProbetrainingRegistrationsForCandidate,
  materializeProbetrainingRegistrationsToAudienceComponent,
} from "@/lib/registrations/domain-audience/probetraining-recipient-materialization";

export const probetrainingAnmeldungenDomainAudienceSource: DomainAudienceSource = {
  key: PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY,
  domainKey: PROBETRAINING_DOMAIN_KEY,
  sourceKey: PROBETRAINING_ANMELDUNGEN_SOURCE_KEY,
  label: "Probetraining-Anmeldungen",
  description:
    "Empfängergruppen aus Probetraining-Anmeldungen nach Bearbeitungsstatus (mandantenspezifisch).",
  requiredPermissions: [PERMISSIONS.REGISTRATIONS_VIEW],
  async searchCandidates({ tenantId, query, limit }) {
    void tenantId;
    const defs = searchProbetrainingAudienceCandidateDefinitions({ query, limit });
    return defs.map((def) => ({
      sourceKey: PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY,
      candidateId: def.candidateId,
      label: def.label,
      description: def.description,
    }));
  },
  toAudienceComponent() {
    throw new Error(
      "Probetraining audiences require live domain resolution; use resolveAudienceComponent.",
    );
  },
  async resolveAudienceComponent({ tenantId, senderUserId, candidateId }) {
    const def = getProbetrainingAudienceCandidateDefinition(candidateId);
    if (!def) {
      throw new Error(`Unbekannte Probetraining-Zielgruppe «${candidateId}».`);
    }
    const registrations = await loadProbetrainingRegistrationsForCandidate({
      tenantId,
      statuses: def.statuses,
    });
    return materializeProbetrainingRegistrationsToAudienceComponent({
      tenantId,
      senderUserId,
      registrations,
    });
  },
  provenanceLabel: probetrainingAudienceProvenanceLabel,
};
