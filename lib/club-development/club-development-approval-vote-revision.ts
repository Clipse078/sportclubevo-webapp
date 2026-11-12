/**
 * SCE-CD-03R3F1 — revision-scoped club-development approval votes (initiative + process).
 */

import type { MeetingApprovalDecisionKind } from "@prisma/client";

export type ClubDevelopmentApprovalVoteRow = {
  approverPersonId: string;
  decision: MeetingApprovalDecisionKind;
  contentRevision: number;
  comment?: string | null;
  decidedAt?: Date | null;
  legacyRevisionUnscoped?: boolean;
};

export function filterVotesForContentRevision<T extends Pick<ClubDevelopmentApprovalVoteRow, "contentRevision">>(
  votes: T[],
  contentRevision: number,
): T[] {
  return votes.filter((v) => v.contentRevision === contentRevision);
}

export type ApprovalVoteHistoryGroup = {
  contentRevision: number;
  legacyRevisionUnscoped: boolean;
  votes: ClubDevelopmentApprovalVoteRow[];
};

export function groupApprovalVotesByRevision(
  votes: ClubDevelopmentApprovalVoteRow[],
  currentContentRevision: number,
): { currentVotes: ClubDevelopmentApprovalVoteRow[]; history: ApprovalVoteHistoryGroup[] } {
  const currentVotes = filterVotesForContentRevision(votes, currentContentRevision);
  const historicalRevisions = new Set(
    votes.map((v) => v.contentRevision).filter((r) => r !== currentContentRevision),
  );
  const history: ApprovalVoteHistoryGroup[] = [...historicalRevisions]
    .sort((a, b) => b - a)
    .map((revision) => {
      const groupVotes = votes.filter((v) => v.contentRevision === revision);
      return {
        contentRevision: revision,
        legacyRevisionUnscoped: groupVotes.some((v) => v.legacyRevisionUnscoped),
        votes: groupVotes,
      };
    });
  return { currentVotes, history };
}
