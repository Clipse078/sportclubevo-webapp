"use client";

import type { CommunicationAudienceSearchKind } from "@/lib/communication/audience/communication-audience-search-service";
import type { SceListSelectorFetchParams } from "@/lib/sce/list-selector/use-sce-list-selector-query";
import type { SceSelectorResultGroup, SceSelectorSourceType } from "@/lib/sce/list-selector/types";
import {
  communicationSearchKindToSelectorType,
  selectorTypeToCommunicationSearchKind,
} from "@/lib/sce/list-selector/communication-bridge";
import type { CommunicationAudienceSelectorContext } from "@/components/admin/communication/audience/CommunicationAudienceSelector";
import type { CommunicationAudienceSelectorFeatures } from "@/components/admin/communication/audience/CommunicationAudienceSelector";
import { fetchWithSceSelectorTimeout } from "@/lib/sce/list-selector/fetch-with-timeout";

function featuresToSourceTypes(
  features: Required<CommunicationAudienceSelectorFeatures>,
): SceSelectorSourceType[] {
  const types: SceSelectorSourceType[] = [];
  if (features.orgUnits) types.push("ORG_UNIT");
  if (features.teams) types.push("TEAM");
  if (features.roles) types.push("ROLE");
  if (features.persons) types.push("PERSON");
  if (features.externalContacts) types.push("EXTERNAL_CONTACT");
  if (features.targetGroups) types.push("TARGET_GROUP");
  return types;
}

function selectorCategoryToCommunicationParam(
  category: SceListSelectorFetchParams["category"],
): string {
  if (category === "org_unit") return "orgUnit";
  if (category === "target_group") return "targetGroup";
  if (category === "external_contact") return "external";
  return category;
}

export function communicationAudienceDiscoverFetch(input: {
  context: CommunicationAudienceSelectorContext;
  enabledFeatures: Required<CommunicationAudienceSelectorFeatures>;
}) {
  const sourceTypes = featuresToSourceTypes(input.enabledFeatures);
  const sourcesParam = sourceTypes
    .map((t) => selectorTypeToCommunicationSearchKind(t))
    .join(",");

  return async (params: SceListSelectorFetchParams): Promise<{
    groups: SceSelectorResultGroup[];
    noAccess?: boolean;
    error?: string;
  }> => {
    const res = await fetchWithSceSelectorTimeout(
      `/api/communication/audience/discover?context=${encodeURIComponent(input.context)}&category=${encodeURIComponent(selectorCategoryToCommunicationParam(params.category))}&q=${encodeURIComponent(params.query.trim())}&sources=${encodeURIComponent(sourcesParam)}`,
      { signal: params.signal },
    );
    const data = (await res.json()) as {
      groups?: Array<{
        kind: CommunicationAudienceSearchKind;
        heading: string;
        options: Array<{ id: string; label: string; description?: string | null }>;
      }>;
      noAccess?: boolean;
      error?: string;
    };
    if (!res.ok) {
      return {
        groups: [],
        error: data.error ?? "Auswahl konnte nicht geladen werden.",
      };
    }
    const groups: SceSelectorResultGroup[] = (data.groups ?? []).map((group) => {
      const type = communicationSearchKindToSelectorType(group.kind);
      return {
        type,
        heading: group.heading,
        items: group.options.map((option) => ({
          id: option.id,
          type,
          label: option.label,
          description: option.description,
        })),
      };
    });
    return { groups, noAccess: data.noAccess };
  };
}

export function communicationEnabledSourceTypes(
  features: Required<CommunicationAudienceSelectorFeatures>,
): SceSelectorSourceType[] {
  return featuresToSourceTypes(features);
}
