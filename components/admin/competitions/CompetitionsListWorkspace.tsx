"use client";

import { CompetitionSceIcon } from "@/components/icons/domain-sce-icon-components";
import type { CompetitionListItem } from "@/lib/competitions/dto";
import { SceDenseSurface } from "@/components/sce/dense";
import { SceEmptyState } from "@/components/sce/feedback/SceEmptyState";
import CompetitionsOperationalToolbar from "./CompetitionsOperationalToolbar";
import CompetitionsTable from "./CompetitionsTable";

type Props = {
  competitions: CompetitionListItem[];
  canManage?: boolean;
  canDelete?: boolean;
  initialSearch?: string;
  initialProvider?: string;
  initialIncludeArchived?: boolean;
  hasSearchFilter?: boolean;
};

export default function CompetitionsListWorkspace({
  competitions,
  canManage = false,
  canDelete = false,
  initialSearch = "",
  initialProvider = "",
  initialIncludeArchived = false,
  hasSearchFilter = false,
}: Props) {
  return (
    <SceDenseSurface
      feedbackSurfaceId="competitions-list"
      aria-label="Wettkämpfe"
      data-testid="competitions-dense-surface"
    >
      <CompetitionsOperationalToolbar
        initialSearch={initialSearch}
        initialProvider={initialProvider}
        initialIncludeArchived={initialIncludeArchived}
        canManage={canManage}
      />

      {competitions.length === 0 ? (
        <SceEmptyState
          variant={hasSearchFilter ? "FILTERED_NO_RESULTS" : "NO_DATA"}
          icon={<CompetitionSceIcon className="h-10 w-10" />}
          title={hasSearchFilter ? "Keine Treffer" : "Keine Wettkämpfe vorhanden"}
          description={
            hasSearchFilter
              ? `Keine Wettkämpfe für „${initialSearch}" gefunden.`
              : "Noch keine Wettkämpfe vorhanden. Erstellen Sie manuell einen Wettkampf oder starten Sie eine SFV-Synchronisation."
          }
          contained
        />
      ) : (
        <CompetitionsTable competitions={competitions} canManage={canManage} canDelete={canDelete} />
      )}
    </SceDenseSurface>
  );
}
