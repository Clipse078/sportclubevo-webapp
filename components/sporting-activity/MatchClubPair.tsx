import { cn } from "@/lib/cn";
import type { MatchClubIdentityPair } from "@/lib/sporting-activity-design/match-identity";
import type { SportingActivityDensity } from "@/lib/sporting-activity-design/density";
import { ClubIdentityDisplay } from "./ClubIdentityDisplay";

export type MatchClubPairProps = {
  pair: MatchClubIdentityPair;
  density?: SportingActivityDensity;
  className?: string;
  vsLabel?: string;
};

/**
 * HOME left · AWAY right — independent of tenant home/away position.
 */
export function MatchClubPair({
  pair,
  density = "management",
  className,
  vsLabel = "VS",
}: MatchClubPairProps) {
  return (
    <div
      className={cn("grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2", className)}
      data-testid="match-club-pair"
    >
      <ClubIdentityDisplay
        identity={pair.homeClubIdentity}
        density={density}
        className="justify-self-start"
      />
      <span
        className="shrink-0 text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--muted)]"
        aria-hidden
      >
        {vsLabel}
      </span>
      <div className="flex min-w-0 justify-self-end justify-end">
        <ClubIdentityDisplay
          identity={pair.awayClubIdentity}
          density={density}
          className="flex-row-reverse"
          nameClassName="text-right"
        />
      </div>
    </div>
  );
}
