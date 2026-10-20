/**
 * F category field layout proposals (approved reference structures — Spielplan rounds not encoded in-repo).
 * Used for composer logical pitch-count recommendations only; `playingFormats` are legacy reference
 * metadata and must not drive automatic playersPerSide assignment (DS-06-R3).
 */

import type { TemplateFieldPlayingFormat } from "../types";

export const F_CURATED_FIELD_PROPOSAL_PARTICIPANT_COUNTS = [5, 6, 7, 8, 9, 10, 11, 12] as const;

export type FFieldProposalStructure = {
  participantCount: number;
  fieldCount: number;
  playingFormats: readonly TemplateFieldPlayingFormat[];
  referenceAvailable: false;
  roundsEncoded: false;
};

function mixedThreeAndFourFieldFormats(fieldCount: number): TemplateFieldPlayingFormat[] {
  const threes = Math.ceil(fieldCount / 2);
  const formats: TemplateFieldPlayingFormat[] = [];
  for (let i = 0; i < fieldCount; i += 1) {
    formats.push({ playersPerSide: i < threes ? 3 : 4 });
  }
  return formats;
}

export function fFieldCountForParticipantCount(participantCount: number): number | null {
  if (participantCount < 5 || participantCount > 12) return null;
  if (participantCount <= 8) return 4;
  if (participantCount <= 10) return 5;
  return 6;
}

export function resolveFFieldProposalStructure(
  participantCount: number,
): FFieldProposalStructure | null {
  const fieldCount = fFieldCountForParticipantCount(participantCount);
  if (fieldCount == null) return null;
  return {
    participantCount,
    fieldCount,
    playingFormats: mixedThreeAndFourFieldFormats(fieldCount),
    referenceAvailable: false,
    roundsEncoded: false,
  };
}

export function listFFieldProposalStructures(): readonly FFieldProposalStructure[] {
  return F_CURATED_FIELD_PROPOSAL_PARTICIPANT_COUNTS.map((count) => resolveFFieldProposalStructure(count)!);
}
