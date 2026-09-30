/**
 * SCE-PROBETRAINING-COMM-01 — stable Probetraining domain audience candidates.
 *
 * Candidate ids are persisted in saved Zielgruppen; labels are German UI copy only.
 */

import { RegistrationStatus } from "@prisma/client";
import {
  ACTIVE_INBOX_STATUSES,
  ARCHIVE_STATUSES,
  STATUS_LABELS,
  WAITING_LIST_REGISTRATION_STATUSES,
} from "@/lib/registrations/status";

export const PROBETRAINING_DOMAIN_KEY = "probetraining" as const;
export const PROBETRAINING_ANMELDUNGEN_SOURCE_KEY = "anmeldungen" as const;
export const PROBETRAINING_ANMELDUNGEN_REGISTRY_KEY =
  `${PROBETRAINING_DOMAIN_KEY}.${PROBETRAINING_ANMELDUNGEN_SOURCE_KEY}` as const;

export type ProbetrainingAudienceCandidateDefinition = {
  candidateId: string;
  label: string;
  description: string;
  statuses: readonly RegistrationStatus[];
};

const GROUP_CANDIDATES: ProbetrainingAudienceCandidateDefinition[] = [
  {
    candidateId: "open-registrations",
    label: "Offene Anmeldungen",
    description:
      "Neue und in Bearbeitung befindliche Probetraining-Anmeldungen (Posteingang).",
    statuses: ACTIVE_INBOX_STATUSES,
  },
  {
    candidateId: "waiting-list",
    label: "Warteliste",
    description: "Probetraining-Anmeldungen im Status «Wartend».",
    statuses: WAITING_LIST_REGISTRATION_STATUSES,
  },
  {
    candidateId: "archive",
    label: "Archiv",
    description: "Abgeschlossene Probetraining-Anmeldungen (angenommen, abgelehnt, archiviert).",
    statuses: ARCHIVE_STATUSES,
  },
];

const STATUS_CANDIDATES: ProbetrainingAudienceCandidateDefinition[] = (
  Object.values(RegistrationStatus) as RegistrationStatus[]
).map((status) => ({
  candidateId: `status:${status.toLowerCase()}`,
  label: STATUS_LABELS[status],
  description: `Probetraining-Anmeldungen mit Status «${STATUS_LABELS[status]}».`,
  statuses: [status],
}));

export const PROBETRAINING_AUDIENCE_CANDIDATE_DEFINITIONS: readonly ProbetrainingAudienceCandidateDefinition[] =
  [...GROUP_CANDIDATES, ...STATUS_CANDIDATES];

const BY_CANDIDATE_ID = new Map(
  PROBETRAINING_AUDIENCE_CANDIDATE_DEFINITIONS.map((def) => [def.candidateId, def]),
);

export function getProbetrainingAudienceCandidateDefinition(
  candidateId: string,
): ProbetrainingAudienceCandidateDefinition | null {
  return BY_CANDIDATE_ID.get(candidateId) ?? null;
}

export function searchProbetrainingAudienceCandidateDefinitions(input: {
  query: string;
  limit: number;
}): ProbetrainingAudienceCandidateDefinition[] {
  const term = input.query.trim().toLowerCase();
  const limit = Math.min(Math.max(input.limit, 1), 50);
  const pool = term
    ? PROBETRAINING_AUDIENCE_CANDIDATE_DEFINITIONS.filter(
        (def) =>
          def.candidateId.toLowerCase().includes(term) ||
          def.label.toLowerCase().includes(term) ||
          def.description.toLowerCase().includes(term),
      )
    : PROBETRAINING_AUDIENCE_CANDIDATE_DEFINITIONS;
  return pool.slice(0, limit);
}

export function probetrainingAudienceProvenanceLabel(candidateId: string): string {
  const def = getProbetrainingAudienceCandidateDefinition(candidateId);
  if (!def) {
    return "Probetraining – Unbekannte Gruppe";
  }
  return `Probetraining – ${def.label}`;
}
