"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import DevelopmentSprintCreateCard, {
  type DevelopmentSprintCreateCardHandle,
} from "./DevelopmentSprintCreateCard";
import SceClubDevelopmentSectionShell from "./SceClubDevelopmentSectionShell";
import {
  CD_NAV_COPY,
  CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY,
} from "@/lib/club-development/product-copy";
import {
  applyUmsetzungsplanungSectionDeepLink,
  countUmsetzungsplanungBuckets,
  openPhaseAssignmentOptions,
  parseUmsetzungsplanungSectionFocus,
  partitionSprintsForUmsetzungsplanung,
  resolveUmsetzungsplanungSectionOpenDefaults,
  type UmsetzungsplanungSectionKey,
} from "@/lib/club-development/sprints/umsetzungsplanung-workspace";
import { CD_UMSETZUNGSPLANUNG_SECTION_QUERY } from "@/lib/club-development/vereinsentwicklung-workspace-routing";
import type { UmsetzungsplanungPhaseCardItem } from "./UmsetzungsplanungPhaseCard";
import { UmsetzungsplanungPhaseList } from "./UmsetzungsplanungPhaseCard";
import UmsetzungsplanungCollapsibleSection from "./UmsetzungsplanungCollapsibleSection";
import UmsetzungsplanungInlineEmpty from "./UmsetzungsplanungInlineEmpty";
import UmsetzungsplanungUnplannedPanel from "./UmsetzungsplanungUnplannedPanel";

type Props = {
  sprints: UmsetzungsplanungPhaseCardItem[];
  canManageSprints: boolean;
};

export default function UmsetzungsplanungWorkspace({ sprints, canManageSprints }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createRef = useRef<DevelopmentSprintCreateCardHandle>(null);
  const buckets = partitionSprintsForUmsetzungsplanung(sprints);
  const counts = countUmsetzungsplanungBuckets(buckets);
  const phaseOptions = openPhaseAssignmentOptions(buckets);
  const sectionFocus = parseUmsetzungsplanungSectionFocus(searchParams.get(CD_UMSETZUNGSPLANUNG_SECTION_QUERY));
  const [sectionOpen, setSectionOpen] = useState(() =>
    applyUmsetzungsplanungSectionDeepLink(
      resolveUmsetzungsplanungSectionOpenDefaults(counts, canManageSprints),
      sectionFocus,
    ),
  );
  const touchSection = (key: UmsetzungsplanungSectionKey, open: boolean) => {
    setSectionOpen((prev) => ({ ...prev, [key]: open }));
  };

  return (
    <SceClubDevelopmentSectionShell title={CD_NAV_COPY.implementationPlanning} bodyClassName="p-5 space-y-3">
      <DevelopmentSprintCreateCard ref={createRef} canCreate={canManageSprints} />

      <UmsetzungsplanungCollapsibleSection
        title={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.ongoingSection}
        count={counts.ongoing}
        open={sectionOpen.ongoing}
        onOpenChange={(open) => touchSection("ongoing", open)}
        testId="umsetzungsplanung-ongoing-section"
      >
        {counts.ongoing > 0 ? (
          <UmsetzungsplanungPhaseList
            items={buckets.active}
            canManageSprints={canManageSprints}
            phaseOptions={phaseOptions}
          />
        ) : (
          <UmsetzungsplanungInlineEmpty
            message={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.noActivePhase}
            testId="umsetzungsplanung-ongoing-empty"
          />
        )}
      </UmsetzungsplanungCollapsibleSection>

      <UmsetzungsplanungCollapsibleSection
        title={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.futureSection}
        count={counts.planned}
        open={sectionOpen.planned}
        onOpenChange={(open) => touchSection("planned", open)}
        testId="umsetzungsplanung-future-section"
      >
        {counts.planned > 0 ? (
          <UmsetzungsplanungPhaseList
            items={buckets.planned}
            canManageSprints={canManageSprints}
            phaseOptions={phaseOptions}
          />
        ) : (
          <UmsetzungsplanungInlineEmpty
            message={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.noFuturePhases}
            testId="umsetzungsplanung-future-empty"
            action={
              canManageSprints ? (
                <button
                  type="button"
                  className="text-sm font-medium text-[var(--sce-primary)] hover:underline"
                  onClick={() => {
                    touchSection("planned", true);
                    createRef.current?.openForm();
                  }}
                >
                  {CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.createPhaseAction}
                </button>
              ) : null
            }
          />
        )}
      </UmsetzungsplanungCollapsibleSection>

      {canManageSprints ? (
        <UmsetzungsplanungUnplannedPanel
          phaseOptions={phaseOptions}
          disabled={phaseOptions.length === 0}
          open={sectionOpen.unplanned}
          onOpenChange={(open) => touchSection("unplanned", open)}
          onAssigned={() => router.refresh()}
        />
      ) : null}

      <UmsetzungsplanungCollapsibleSection
        title={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.completedSection}
        count={counts.completed}
        open={sectionOpen.completed}
        onOpenChange={(open) => touchSection("completed", open)}
        testId="umsetzungsplanung-completed-section"
      >
        {counts.completed > 0 ? (
          <UmsetzungsplanungPhaseList
            items={buckets.completed}
            canManageSprints={canManageSprints}
            phaseOptions={phaseOptions}
            readOnlyTasks
          />
        ) : (
          <UmsetzungsplanungInlineEmpty
            message={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.noCompletedPhases}
            testId="umsetzungsplanung-completed-empty"
          />
        )}
      </UmsetzungsplanungCollapsibleSection>
    </SceClubDevelopmentSectionShell>
  );
}