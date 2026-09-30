/**
 * SCE-SPIELBETRIEB-AUDIENCE-01 — DomainAudienceSource for MATCH/TOURNAMENT Spielteilnahme.
 */

import type { DomainAudienceSource } from "@/lib/communication/platform/audience/domain-audience-source";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  buildSpielbetriebAudienceCandidateId,
  SPIELBETRIEB_DOMAIN_KEY,
  SPIELBETRIEB_TEILNAHME_REGISTRY_KEY,
  SPIELBETRIEB_TEILNAHME_SOURCE_KEY,
  SPIELBETRIEB_PARTICIPATION_PRESETS,
  spielbetriebAudienceDisplayLabel,
  spielbetriebAudienceProvenanceLabel,
  spielbetriebParticipationPresetDescription,
} from "@/lib/spielbetrieb/domain-audience/spielbetrieb-audience-candidates";
import { materializeSpielbetriebParticipationAudienceComponent } from "@/lib/spielbetrieb/domain-audience/spielbetrieb-recipient-materialization";
import {
  isSpielbetriebEventRelevantForParticipationAttention,
  isSpielbetriebMatchOrTournament,
} from "@/lib/spielbetrieb/domain-audience/spielbetrieb-event-relevance";
import type { SpielbetriebEventKind } from "@/lib/spielbetrieb/domain-audience/spielbetrieb-audience-candidates";
import { listTeamIdsWithSpielbetriebAudienceView } from "@/lib/spielbetrieb/domain-audience/spielbetrieb-team-authorization";

export const spielbetriebTeilnahmeDomainAudienceSource: DomainAudienceSource = {
  key: SPIELBETRIEB_TEILNAHME_REGISTRY_KEY,
  domainKey: SPIELBETRIEB_DOMAIN_KEY,
  sourceKey: SPIELBETRIEB_TEILNAHME_SOURCE_KEY,
  label: "Spielteilnahme",
  description:
    "Live Zielgruppen aus Teilnahmeanfragen für Spiele und Turniere (Saisonkader, aktueller Rückmeldungsstand).",
  requiredPermissions: [PERMISSIONS.COMMUNICATION_TEAM_VIEW],
  async canDiscover(ctx) {
    if (!ctx.permissionKeys.has(PERMISSIONS.COMMUNICATION_TEAM_VIEW)) {
      return false;
    }
    const teams = await listTeamIdsWithSpielbetriebAudienceView({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
    });
    return teams.length > 0;
  },
  async searchCandidates({ tenantId, senderUserId, query, limit }) {
    const now = new Date();
    const teamIds = await listTeamIdsWithSpielbetriebAudienceView({
      tenantId,
      userId: senderUserId,
    });
    if (teamIds.length === 0) return [];

    const events = await prisma.event.findMany({
      where: {
        tenantId,
        teamId: { in: teamIds },
        type: { in: ["MATCH", "TOURNAMENT"] },
        startAt: { gte: now },
        status: { in: ["SCHEDULED", "LIVE"] },
        teamSeasonId: { not: null },
        participationResponseDueAt: { not: null },
      },
      select: {
        id: true,
        type: true,
        title: true,
        startAt: true,
        status: true,
        teamId: true,
        teamSeasonId: true,
        participationResponseDueAt: true,
        team: { select: { name: true } },
      },
      orderBy: [{ startAt: "asc" }],
      take: Math.min(Math.max(limit, 1), 50) * 3,
    });

    const term = query.trim().toLowerCase();
    const candidates = [];

    for (const event of events) {
      if (!event.teamId || !event.teamSeasonId) continue;
      if (!isSpielbetriebMatchOrTournament(event.type)) continue;
      const eventKind = event.type as SpielbetriebEventKind;
      if (
        !isSpielbetriebEventRelevantForParticipationAttention({
          type: eventKind,
          status: event.status,
          startAt: event.startAt,
          now,
          participationResponseDueAt: event.participationResponseDueAt,
        })
      ) {
        continue;
      }
      for (const preset of SPIELBETRIEB_PARTICIPATION_PRESETS) {
        const candidateId = buildSpielbetriebAudienceCandidateId({
          teamId: event.teamId,
          teamSeasonId: event.teamSeasonId,
          eventId: event.id,
          eventKind,
          preset,
        });
        const label = spielbetriebAudienceDisplayLabel({
          teamDisplayName: event.team?.name,
          eventTitle: event.title,
          eventStartAt: event.startAt,
          preset,
        });
        const description = spielbetriebParticipationPresetDescription(preset);
        if (
          term &&
          !label.toLowerCase().includes(term) &&
          !description.toLowerCase().includes(term) &&
          !event.title.toLowerCase().includes(term)
        ) {
          continue;
        }
        candidates.push({
          sourceKey: SPIELBETRIEB_TEILNAHME_REGISTRY_KEY,
          candidateId,
          label,
          description,
        });
      }
    }

    return candidates.slice(0, Math.min(Math.max(limit, 1), 50));
  },
  toAudienceComponent() {
    throw new Error(
      "Spielteilnahme audiences require live domain resolution; use resolveAudienceComponent.",
    );
  },
  async resolveAudienceComponent({ tenantId, senderUserId, candidateId }) {
    return materializeSpielbetriebParticipationAudienceComponent({
      tenantId,
      senderUserId,
      candidateId,
    });
  },
  provenanceLabel: spielbetriebAudienceProvenanceLabel,
};
