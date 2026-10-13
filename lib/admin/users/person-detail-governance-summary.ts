import type { SceActivityTypeGovernancePolicy } from "@/lib/sce/activity-governance/types";

export type PersonClubEventGovernanceOverview = {
  createLabel: "Ja" | "Nein";
  publicationLabel: "Direkt" | "Freigabe erforderlich" | "—";
};

export function resolvePersonClubEventGovernanceOverview(input: {
  clubEventTypePolicy: SceActivityTypeGovernancePolicy | undefined;
  personId: string;
}): PersonClubEventGovernanceOverview {
  const typePolicy = input.clubEventTypePolicy;
  const defaultPublication = typePolicy?.defaultPublicationAuthority ?? "DIRECT_PUBLISH";
  const creatorPolicy = typePolicy?.creatorPolicies.find((p) => p.personId === input.personId);

  const createEnabled = creatorPolicy?.createEnabled !== false;
  const createLabel: PersonClubEventGovernanceOverview["createLabel"] = createEnabled ? "Ja" : "Nein";
  const publicationAuthority = creatorPolicy?.publicationAuthority ?? defaultPublication;
  const publicationLabel: PersonClubEventGovernanceOverview["publicationLabel"] = createEnabled
    ? publicationAuthority === "APPROVAL_REQUIRED"
      ? "Freigabe erforderlich"
      : "Direkt"
    : "—";

  return { createLabel, publicationLabel };
}
