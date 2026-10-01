/**
 * SCE-DOMAIN-OPERATIONAL-ATTENTION-01 — idempotent registration of production operational attention sources.
 */

import {
  getDomainOperationalAttentionSource,
  listRegisteredDomainOperationalAttentionSources,
  registerDomainOperationalAttentionSource,
} from "./operational-attention-registry";
import { buildOperationalAttentionSourceRegistryKey } from "./operational-attention-source-id";
import {
  CLUB_EVENT_PARTICIPATION_OUTSTANDING_ATTENTION_KIND,
  clubEventParticipationOutstandingAttentionSource,
} from "@/lib/events/operational-attention/club-event-participation-attention-source";
import {
  SPIELBETRIEB_PARTICIPATION_OUTSTANDING_ATTENTION_KIND,
  spielbetriebParticipationOutstandingAttentionSource,
} from "@/lib/spielbetrieb/operational-attention/spielbetrieb-participation-attention-source";
import {
  TRAINING_PARTICIPATION_OUTSTANDING_ATTENTION_KIND,
  trainingParticipationOutstandingAttentionSource,
} from "@/lib/training/operational-attention/training-participation-attention-source";

const PRODUCTION_SOURCE_KEYS = [
  buildOperationalAttentionSourceRegistryKey({
    domainKey: spielbetriebParticipationOutstandingAttentionSource.domainKey,
    attentionKind: SPIELBETRIEB_PARTICIPATION_OUTSTANDING_ATTENTION_KIND,
  }),
  buildOperationalAttentionSourceRegistryKey({
    domainKey: trainingParticipationOutstandingAttentionSource.domainKey,
    attentionKind: TRAINING_PARTICIPATION_OUTSTANDING_ATTENTION_KIND,
  }),
  buildOperationalAttentionSourceRegistryKey({
    domainKey: clubEventParticipationOutstandingAttentionSource.domainKey,
    attentionKind: CLUB_EVENT_PARTICIPATION_OUTSTANDING_ATTENTION_KIND,
  }),
] as const;

/**
 * Registers Spielbetrieb, Training, and Veranstaltungen participation-outstanding sources once per process.
 */
export function ensureProductionOperationalAttentionSourcesRegistered(): void {
  if (
    PRODUCTION_SOURCE_KEYS.every((key) => getDomainOperationalAttentionSource(key) != null) &&
    listRegisteredDomainOperationalAttentionSources().length >= PRODUCTION_SOURCE_KEYS.length
  ) {
    return;
  }

  if (!getDomainOperationalAttentionSource(PRODUCTION_SOURCE_KEYS[0])) {
    registerDomainOperationalAttentionSource(
      spielbetriebParticipationOutstandingAttentionSource,
      SPIELBETRIEB_PARTICIPATION_OUTSTANDING_ATTENTION_KIND,
    );
  }
  if (!getDomainOperationalAttentionSource(PRODUCTION_SOURCE_KEYS[1])) {
    registerDomainOperationalAttentionSource(
      trainingParticipationOutstandingAttentionSource,
      TRAINING_PARTICIPATION_OUTSTANDING_ATTENTION_KIND,
    );
  }
  if (!getDomainOperationalAttentionSource(PRODUCTION_SOURCE_KEYS[2])) {
    registerDomainOperationalAttentionSource(
      clubEventParticipationOutstandingAttentionSource,
      CLUB_EVENT_PARTICIPATION_OUTSTANDING_ATTENTION_KIND,
    );
  }
}
