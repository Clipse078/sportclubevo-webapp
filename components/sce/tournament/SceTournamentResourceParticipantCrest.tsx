"use client";

import { ClubCrest } from "@/components/sporting-activity/ClubCrest";
import type { ClubIdentity } from "@/lib/sporting-activity-design/club-identity";

type Props = {
  identity: ClubIdentity;
  testId?: string;
};

/** Compact (~32px) crest for tournament resource assignment rows — decorative when paired with visible text. */
export function SceTournamentResourceParticipantCrest({ identity, testId }: Props) {
  return (
    <span data-testid={testId}>
      <ClubCrest identity={identity} density="compact" decorative />
    </span>
  );
}
