/**
 * SCE-TRAINING-AUDIENCE-01 — lazy registration of Training domain audience sources.
 */

import {
  getDomainAudienceSourceRegistry,
  registerDomainAudienceSource,
} from "@/lib/communication/platform/audience/domain-audience-registry";
import { trainingTeilnahmeDomainAudienceSource } from "@/lib/training/domain-audience/training-domain-audience-source";
import { TRAINING_TEILNAHME_REGISTRY_KEY } from "@/lib/training/domain-audience/training-audience-candidates";

export function ensureTrainingDomainAudienceRegistered(): void {
  if (!getDomainAudienceSourceRegistry().get(TRAINING_TEILNAHME_REGISTRY_KEY)) {
    registerDomainAudienceSource(trainingTeilnahmeDomainAudienceSource);
  }
}
