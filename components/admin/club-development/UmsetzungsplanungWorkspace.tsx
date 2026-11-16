"use client";

import { useRouter } from "next/navigation";
import DevelopmentSprintCreateCard from "./DevelopmentSprintCreateCard";
import SceClubDevelopmentEmptyState from "./SceClubDevelopmentEmptyState";
import SceClubDevelopmentSectionShell from "./SceClubDevelopmentSectionShell";
import {
  CD_NAV_COPY,
  CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY,
} from "@/lib/club-development/product-copy";
import {
  openPhaseAssignmentOptions,
  partitionSprintsForUmsetzungsplanung,
} from "@/lib/club-development/sprints/umsetzungsplanung-workspace";
import type { UmsetzungsplanungPhaseCardItem } from "./UmsetzungsplanungPhaseCard";
import { UmsetzungsplanungPhaseList } from "./UmsetzungsplanungPhaseCard";
import UmsetzungsplanungUnplannedPanel from "./UmsetzungsplanungUnplannedPanel";

type Props = {
  sprints: UmsetzungsplanungPhaseCardItem[];
  canManageSprints: boolean;
};

function CollapsibleSection({
  title,
  defaultOpen,
  testId,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <details
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)]"
      open={defaultOpen}
      data-testid={testId}
    >
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[var(--foreground)] marker:content-none">
        {title}
      </summary>
      <div className="space-y-3 border-t border-[var(--border)] p-4">{children}</div>
    </details>
  );
}

export default function UmsetzungsplanungWorkspace({ sprints, canManageSprints }: Props) {
  const router = useRouter();
  const buckets = partitionSprintsForUmsetzungsplanung(sprints);
  const phaseOptions = openPhaseAssignmentOptions(buckets);

  return (
    <SceClubDevelopmentSectionShell title={CD_NAV_COPY.implementationPlanning} bodyClassName="p-5 space-y-4">
      <DevelopmentSprintCreateCard canCreate={canManageSprints} />

      <CollapsibleSection
        title={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.ongoingSection}
        defaultOpen
        testId="umsetzungsplanung-ongoing-section"
      >
        {buckets.active.length > 0 ? (
          <UmsetzungsplanungPhaseList items={buckets.active} />
        ) : (
          <SceClubDevelopmentEmptyState message={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.noActivePhase} />
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.futureSection}
        defaultOpen
        testId="umsetzungsplanung-future-section"
      >
        {buckets.planned.length > 0 ? (
          <UmsetzungsplanungPhaseList items={buckets.planned} />
        ) : (
          <SceClubDevelopmentEmptyState message={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.noFuturePhases} />
        )}
      </CollapsibleSection>

      {canManageSprints ? (
        <UmsetzungsplanungUnplannedPanel
          phaseOptions={phaseOptions}
          disabled={phaseOptions.length === 0}
          onAssigned={() => router.refresh()}
        />
      ) : null}

      <CollapsibleSection
        title={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.completedSection}
        defaultOpen={false}
        testId="umsetzungsplanung-completed-section"
      >
        {buckets.completed.length > 0 ? (
          <UmsetzungsplanungPhaseList items={buckets.completed} />
        ) : (
          <SceClubDevelopmentEmptyState message={CD_UMSETZUNGSPLANUNG_WORKSPACE_COPY.noCompletedPhases} />
        )}
      </CollapsibleSection>
    </SceClubDevelopmentSectionShell>
  );
}