import { cn } from "@/lib/cn";
import type { ClubIdentity } from "@/lib/sporting-activity-design/club-identity";
import type { SportingActivityDensity } from "@/lib/sporting-activity-design/density";
import { ClubCrest } from "./ClubCrest";
import { SceTeamName } from "@/components/design-system/typography";

export type ClubIdentityDisplayProps = {
  identity: ClubIdentity;
  density?: SportingActivityDensity;
  /** Truncate long club names in dense layouts. */
  truncate?: boolean;
  className?: string;
  nameClassName?: string;
};

/**
 * Accessible club identity row — text name is always present; crest is supplementary.
 */
export function ClubIdentityDisplay({
  identity,
  density = "management",
  truncate = true,
  className,
  nameClassName,
}: ClubIdentityDisplayProps) {
  return (
    <div
      className={cn("flex min-w-0 items-center gap-2", className)}
      data-testid="club-identity-display"
    >
      <ClubCrest identity={identity} density={density} decorative />
      <SceTeamName
        className={cn(
          "min-w-0 text-[var(--foreground)]",
          nameClassName,
        )}
        truncate={truncate}
        lineClamp={truncate ? 1 : 2}
        density="STANDARD"
      >
        {identity.displayName}
      </SceTeamName>
    </div>
  );
}
