/**
 * SCE-SPIELBETRIEB-AUDIENCE-01 — lazy registration of Spielbetrieb domain audience sources.
 */

import {
  getDomainAudienceSourceRegistry,
  registerDomainAudienceSource,
} from "@/lib/communication/platform/audience/domain-audience-registry";
import { spielbetriebTeilnahmeDomainAudienceSource } from "@/lib/spielbetrieb/domain-audience/spielbetrieb-domain-audience-source";
import { SPIELBETRIEB_TEILNAHME_REGISTRY_KEY } from "@/lib/spielbetrieb/domain-audience/spielbetrieb-audience-candidates";

export function ensureSpielbetriebDomainAudienceRegistered(): void {
  if (!getDomainAudienceSourceRegistry().get(SPIELBETRIEB_TEILNAHME_REGISTRY_KEY)) {
    registerDomainAudienceSource(spielbetriebTeilnahmeDomainAudienceSource);
  }
}
