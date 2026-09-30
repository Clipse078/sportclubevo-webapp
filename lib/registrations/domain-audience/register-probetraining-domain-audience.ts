/**
 * SCE-PROBETRAINING-COMM-01 — lazy registration of Probetraining domain audience sources.
 */

import {
  getDomainAudienceSourceRegistry,
  registerDomainAudienceSource,
} from "@/lib/communication/platform/audience/domain-audience-registry";
import { probetrainingAnmeldungenDomainAudienceSource } from "@/lib/registrations/domain-audience/probetraining-domain-audience-source";
import { PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY } from "@/lib/registrations/domain-audience/probetraining-audience-candidates";

/**
 * Idempotent — registers Probetraining domain audience providers once per process.
 */
export function ensureProbetrainingDomainAudienceRegistered(): void {
  if (!getDomainAudienceSourceRegistry().get(PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY)) {
    registerDomainAudienceSource(probetrainingAnmeldungenDomainAudienceSource);
  }
}
