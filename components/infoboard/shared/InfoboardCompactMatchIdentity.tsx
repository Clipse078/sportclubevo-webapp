import type { ReactElement } from "react";
import type { InfoboardMatchPresentation } from "@/lib/publishing/event-types";

type Props = {
  matchPresentation: InfoboardMatchPresentation;
  /** Primary line class (Screen 2 pitch card). */
  primaryClassName: string;
  /** Secondary/opponent line class. */
  opponentClassName: string;
  /** Optional VS separator class. */
  vsClassName?: string;
};

/**
 * Fixture-authoritative home-left / away-right match identity for compact
 * Infoboard surfaces (Screen 2 pitch cards, unallocated list).
 */
export function InfoboardCompactMatchIdentity({
  matchPresentation,
  primaryClassName,
  opponentClassName,
  vsClassName,
}: Props): ReactElement {
  return (
    <span data-testid="infoboard-compact-match-identity">
      <span className={primaryClassName} data-testid="match-home-team-row">
        {matchPresentation.home.clubDisplayName}
      </span>
      <span className={vsClassName} aria-hidden="true">
        {" "}
        vs.{" "}
      </span>
      {matchPresentation.away !== null ? (
        <span className={opponentClassName} data-testid="match-away-team-row">
          {matchPresentation.away.clubDisplayName}
        </span>
      ) : null}
    </span>
  );
}
