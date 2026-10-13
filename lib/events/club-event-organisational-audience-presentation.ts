import type { SceClubEventAudiencePresentation } from "@/lib/sporting-activity-presentation/canonical/types";
import type {
  ClubEventOrganisationalAudienceTargetDto,
  ClubEventOrganisationalScope,
} from "./club-event-organisational-audience-types";

const CLUB_WIDE_PRIMARY_LABEL = "Gesamter Verein";

export function buildSceClubEventAudiencePresentation(input: {
  scope: ClubEventOrganisationalScope;
  targets: readonly ClubEventOrganisationalAudienceTargetDto[];
}): SceClubEventAudiencePresentation {
  if (input.scope === "CLUB_WIDE") {
    return {
      scope: "CLUB_WIDE",
      primaryLabel: CLUB_WIDE_PRIMARY_LABEL,
    };
  }

  const labels = input.targets.map((t) => t.label.trim()).filter(Boolean);
  const teamCount = input.targets.filter((t) => t.kind === "TEAM").length;
  const orgUnitCount = input.targets.filter((t) => t.kind === "ORG_UNIT").length;
  const targetCount = labels.length;

  if (targetCount === 0) {
    return {
      scope: "SELECTED_ORG_UNITS",
      primaryLabel: CLUB_WIDE_PRIMARY_LABEL,
    };
  }

  if (targetCount === 1) {
    return {
      scope: "SELECTED_ORG_UNITS",
      primaryLabel: labels[0]!,
      detailLabels: labels,
      targetCount: 1,
      teamCount: teamCount || undefined,
      orgUnitCount: orgUnitCount || undefined,
    };
  }

  const primaryLabel = labels.join(" · ");
  const compactLabel = resolveCompactAudienceLabel({
    targetCount,
    teamCount,
    orgUnitCount,
    labels,
  });

  return {
    scope: "SELECTED_ORG_UNITS",
    primaryLabel,
    compactLabel,
    detailLabels: labels,
    targetCount,
    teamCount: teamCount || undefined,
    orgUnitCount: orgUnitCount || undefined,
  };
}

function resolveCompactAudienceLabel(input: {
  targetCount: number;
  teamCount: number;
  orgUnitCount: number;
  labels: string[];
}): string {
  if (input.targetCount >= 3) {
    if (input.teamCount > 0 && input.orgUnitCount === 0) {
      return `${input.targetCount} Teams`;
    }
    return `${input.targetCount} Organisationseinheiten`;
  }
  if (input.teamCount === input.targetCount && input.targetCount === 2) {
    return "2 Teams";
  }
  return input.labels.join(" · ");
}
