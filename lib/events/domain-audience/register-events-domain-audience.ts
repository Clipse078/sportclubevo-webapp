/**
 * SCE-EVENTS-AUDIENCE-01 — lazy registration of Events domain audience sources.
 */

import {
  getDomainAudienceSourceRegistry,
  registerDomainAudienceSource,
} from "@/lib/communication/platform/audience/domain-audience-registry";
import { clubEventTeilnahmeDomainAudienceSource } from "@/lib/events/domain-audience/club-event-domain-audience-source";
import { EVENTS_TEILNAHME_REGISTRY_KEY } from "@/lib/events/domain-audience/club-event-audience-candidates";

export function ensureEventsDomainAudienceRegistered(): void {
  if (!getDomainAudienceSourceRegistry().get(EVENTS_TEILNAHME_REGISTRY_KEY)) {
    registerDomainAudienceSource(clubEventTeilnahmeDomainAudienceSource);
  }
}
