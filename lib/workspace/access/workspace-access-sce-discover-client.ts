import type { SceListSelectorFetchParams } from "@/lib/sce/list-selector/use-sce-list-selector-query";
import type { SceSelectorResultGroup } from "@/lib/sce/list-selector/types";
import { sceSelectorPresentation } from "@/lib/sce/list-selector/entity-presentation";

/**
 * Prepends tenant organisation browse row for workspace ACL selector (canonical function keys stay on ROLE source).
 */
export function decorateWorkspaceAccessDiscoverFetch(
  base: (params: SceListSelectorFetchParams) => Promise<{
    groups: SceSelectorResultGroup[];
    noAccess?: boolean;
    error?: string;
  }>,
  organisationLabel: string,
) {
  return async (params: SceListSelectorFetchParams) => {
    const result = await base(params);
    const isInitialBrowse =
      params.category === "all" &&
      !params.query.trim() &&
      !(params.cursors && Object.keys(params.cursors).length > 0);
    if (!isInitialBrowse) {
      return result;
    }
    const orgGroup: SceSelectorResultGroup = {
      type: "ORG_UNIT",
      heading: "Organisation",
      items: [
        {
          id: "organisation",
          type: "ORG_UNIT",
          label: organisationLabel,
          description: "Gesamter Verein",
          metadata: { workspaceSubjectType: "ORGANISATION" },
        },
      ],
    };
    return {
      ...result,
      groups: [orgGroup, ...(result.groups ?? [])],
    };
  };
}
